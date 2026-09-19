<script setup lang="ts">
/**
 * The blueprint canvas: phases as nodes, qualification as the connections
 * between them. Vue Flow owns dragging, panning, zooming and the wiring
 * gestures; everything it reports is forwarded up as an intent, so the graph
 * itself is only ever changed through useCustomPhaseGraph.
 *
 * Edges carry their rank range as the label and open the range editor on
 * click, rather than each being a custom edge component — the label is the
 * whole of an edge's state, so a custom component would exist only to render
 * one line of text.
 */
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { VueFlow, type Connection, type Edge, type Node, type NodeDragEvent } from "@vue-flow/core"
import { Background } from "@vue-flow/background"
import { Controls } from "@vue-flow/controls"
import { groupOutputCount, type PhaseGraphError } from "@/engine"
import type { PhaseEdge, TournamentPhase } from "@/modules/tournament/types"
import PhaseNode from "./PhaseNode.vue"
import "@vue-flow/core/dist/style.css"
import "@vue-flow/controls/dist/style.css"

const props = withDefaults(
  defineProps<{
    phases: TournamentPhase[]
    edges: PhaseEdge[]
    errors: PhaseGraphError[]
    intakeOf: (phaseId: string) => number
    readonly?: boolean
  }>(),
  { readonly: false }
)

const emit = defineEmits<{
  connect: [from: string, to: string]
  move: [phaseId: string, pos: { x: number; y: number }]
  rename: [phaseId: string, name: string]
  configure: [phaseId: string]
  remove: [phaseId: string]
  markFinal: [phaseId: string]
  editEdge: [edgeId: string]
}>()

const { t } = useI18n()

const nodes = computed<Node[]>(() =>
  props.phases.map((phase) => ({
    id: phase.id,
    type: "phase",
    position: { ...phase.pos },
    draggable: !props.readonly,
    data: {
      phase,
      intake: props.intakeOf(phase.id),
      errors: props.errors.filter((e) => e.phaseId === phase.id),
      readonly: props.readonly,
    },
  }))
)

/**
 * What the connection says on the canvas. A group phase decides who advances in
 * its own settings, so its edge shows the count it carries rather than a range
 * of places the user cannot edit here.
 */
function edgeLabel(edge: PhaseEdge): string {
  const source = props.phases.find((p) => p.id === edge.fromPhaseId)
  if (source?.kind === "group") {
    return t("tournament.phases.edge.teams", {
      count: groupOutputCount(source, props.intakeOf(source.id)),
    })
  }
  if (edge.fromRank === edge.toRank) {
    return t("tournament.phases.edge.single", { rank: edge.fromRank })
  }
  return t("tournament.phases.edge.range", { from: edge.fromRank, to: edge.toRank })
}

const flowEdges = computed<Edge[]>(() =>
  props.edges.map((edge) => ({
    id: edge.id,
    source: edge.fromPhaseId,
    target: edge.toPhaseId,
    label: edgeLabel(edge),
    animated: true,
    // A wide invisible hit path over the 2px line, because tapping the line
    // itself is how you open a connection and a finger is nowhere near that
    // precise. The list under the canvas is the way that needs no aim at all.
    interactionWidth: 36,
    labelShowBg: true,
    labelBgPadding: [6, 4],
    labelBgBorderRadius: 4,
    class: props.errors.some((e) => e.edgeId === edge.id) ? "phase-edge--error" : undefined,
  }))
)

function onConnect(connection: Connection) {
  if (props.readonly) return
  if (!connection.source || !connection.target) return
  emit("connect", connection.source, connection.target)
}

function onNodeDragStop({ node }: NodeDragEvent) {
  emit("move", node.id, node.position)
}
</script>

<template>
  <div class="phase-canvas">
    <VueFlow
      :nodes="nodes"
      :edges="flowEdges"
      :nodes-connectable="!readonly"
      :nodes-draggable="!readonly"
      :edges-updatable="false"
      :zoom-on-double-click="false"
      :min-zoom="0.4"
      :max-zoom="1.6"
      :connect-on-click="!readonly"
      :connection-radius="44"
      fit-view-on-init
      @connect="onConnect"
      @node-drag-stop="onNodeDragStop"
      @edge-click="!readonly && emit('editEdge', $event.edge.id)"
    >
      <template #node-phase="nodeProps">
        <PhaseNode
          :data="nodeProps.data"
          @rename="emit('rename', nodeProps.id, $event)"
          @configure="emit('configure', nodeProps.id)"
          @remove="emit('remove', nodeProps.id)"
          @mark-final="emit('markFinal', nodeProps.id)"
        />
      </template>

      <Background :gap="18" :size="1" />
      <Controls :show-interactive="false" />
    </VueFlow>
  </div>
</template>

<style scoped src="./phases.css"></style>
