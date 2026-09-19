<script setup lang="ts">
/**
 * The Phases editor: the blueprint canvas, the palette that adds to it, and the
 * list of everything still wrong with it.
 *
 * An AppModal rather than an AppSheet because this is a panel the user works
 * inside for a while, and it deliberately does not dismiss on an outside click
 * — a stray tap on the backdrop would throw away a graph that took a minute to
 * draw. Save applies the draft; closing any other way discards it.
 */
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import { ArrowRight, LayoutGrid, List, Settings2, Shuffle, Trophy, X } from "@lucide/vue"
import { AppModal, AppButton } from "@/components/ui"
import { useSettingsStore } from "@/modules/settings/store"
import type { PhaseConfig, PhaseKind } from "@/modules/tournament/types"
import { edgeIntake, phaseOutputCount } from "@/engine"
import { useCustomPhaseGraph, type PhaseGraphDraft } from "@/modules/tournament/composables/useCustomPhaseGraph"
import PhaseGraphCanvas from "./PhaseGraphCanvas.vue"
import PhaseGuide from "./PhaseGuide.vue"
import PhaseConfigSheet from "./PhaseConfigSheet.vue"
import PhaseRangeSheet from "./PhaseRangeSheet.vue"

const props = defineProps<{ draft: PhaseGraphDraft; teamCount: number }>()
const emit = defineEmits<{ save: [PhaseGraphDraft]; close: [] }>()

const { t } = useI18n()
const modalRef = ref<InstanceType<typeof AppModal>>()

const teamCount = computed(() => props.teamCount)
const graph = useCustomPhaseGraph(teamCount)
graph.load(props.draft)

// Shown until the user says they have read it, then reachable from the help line.
const settings = useSettingsStore()
const showGuide = ref(!settings.phasesGuideSeen)

function dismissGuide() {
  showGuide.value = false
  settings.phasesGuideSeen = true
}

const configuringId = ref<string | null>(null)
const editingEdgeId = ref<string | null>(null)

const configuringPhase = computed(() =>
  graph.phases.value.find((p) => p.id === configuringId.value)
)
const editingEdge = computed(() => graph.edges.value.find((e) => e.id === editingEdgeId.value))
const editingEdgeSource = computed(() =>
  graph.phases.value.find((p) => p.id === editingEdge.value?.fromPhaseId)
)
const editingEdgeTarget = computed(() =>
  graph.phases.value.find((p) => p.id === editingEdge.value?.toPhaseId)
)

/** The highest place an edge out of the selected source can name. */
const editingEdgeAvailable = computed(() => {
  const source = editingEdgeSource.value
  return source ? phaseOutputCount(source, graph.intakeOf(source.id)) : 0
})

/** How many teams the selected connection actually carries. */
const editingEdgeCarried = computed(() => {
  const edge = editingEdge.value
  const source = editingEdgeSource.value
  if (!edge) return 0
  return edgeIntake(edge, source, source ? graph.intakeOf(source.id) : 0)
})

const PALETTE: { kind: PhaseKind; icon: typeof Trophy }[] = [
  { kind: "group", icon: LayoutGrid },
  { kind: "league", icon: List },
  { kind: "swiss", icon: Shuffle },
  { kind: "knockout", icon: Trophy },
]

/** Every connection with the names and count the list needs to describe it. */
const connectionRows = computed(() =>
  graph.edges.value.map((edge) => {
    const from = graph.phases.value.find((p) => p.id === edge.fromPhaseId)
    const to = graph.phases.value.find((p) => p.id === edge.toPhaseId)
    const derived = from?.kind === "group"
    const carried = edgeIntake(edge, from, from ? graph.intakeOf(from.id) : 0)
    return {
      edge,
      fromName: from?.name ?? "?",
      toName: to?.name ?? "?",
      derived,
      // A group's count comes from its own settings, so there is no range to
      // name — just how many travel.
      carriedLabel: derived
        ? t("tournament.phases.edge.teams", { count: carried })
        : edge.fromRank === edge.toRank
          ? t("tournament.phases.edge.single", { rank: edge.fromRank })
          : t("tournament.phases.edge.range", { from: edge.fromRank, to: edge.toRank }),
    }
  })
)

/** Errors with no phase or edge of their own — the graph-level ones. */
const generalErrors = computed(() => graph.errors.value.filter((e) => !e.phaseId && !e.edgeId))

function addPhase(kind: PhaseKind) {
  const count = graph.phases.value.filter((p) => p.kind === kind).length
  const base = t(`tournament.phases.kinds.${kind}`)
  graph.addPhase(kind, count ? `${base} ${count + 1}` : base)
}

function applyConfig(config: PhaseConfig) {
  if (configuringId.value) graph.setConfig(configuringId.value, config)
  configuringId.value = null
}

function applyRange(fromRank: number, toRank: number) {
  if (editingEdgeId.value) graph.setRange(editingEdgeId.value, fromRank, toRank)
  editingEdgeId.value = null
}

function removeEdge() {
  if (editingEdgeId.value) graph.disconnect(editingEdgeId.value)
  editingEdgeId.value = null
}

function handleSave() {
  if (!graph.isValid.value) return
  emit("save", graph.toDraft())
  modalRef.value?.close()
}
</script>

<template>
  <AppModal
    ref="modalRef"
    :title="t('tournament.phases.title')"
    width="min(920px, 100vw)"
    :dismiss-on-outside-click="false"
    flush
    @close="emit('close')"
  >
    <div class="phase-editor">
      <div class="phase-palette">
        <AppButton
          v-for="item in PALETTE"
          :key="item.kind"
          size="xs"
          @click="addPhase(item.kind)"
        >
          <component :is="item.icon" :size="14" />
          {{ t(`tournament.phases.kinds.${item.kind}`) }}
        </AppButton>
      </div>

      <PhaseGuide v-if="showGuide" @dismiss="dismissGuide" />
      <p v-else class="phase-editor-help">
        {{ t("tournament.phases.help") }}
        <button type="button" class="phase-guide-reopen" @click="showGuide = true">
          {{ t("tournament.phases.guide.reopen") }}
        </button>
      </p>

      <PhaseGraphCanvas
        :phases="graph.phases.value"
        :edges="graph.edges.value"
        :errors="graph.errors.value"
        :intake-of="graph.intakeOf"
        @connect="graph.connect"
        @move="graph.movePhase"
        @rename="graph.renamePhase"
        @configure="configuringId = $event"
        @remove="graph.removePhase"
        @mark-final="graph.setFinal"
        @edit-edge="editingEdgeId = $event"
      />

      <!-- Every connection, as a list. Tapping the line on the canvas opens the
           same editor, but that asks the user to hit a thin line — this is the
           way that always works, and it is also the only place the connections
           are all visible at once. -->
      <div v-if="connectionRows.length" class="phase-links">
        <div class="phase-links-title">{{ t("tournament.phases.links.title") }}</div>
        <ul class="phase-links-list">
          <li v-for="row in connectionRows" :key="row.edge.id" class="phase-link">
            <span class="phase-link-route">
              <span class="phase-link-name">{{ row.fromName }}</span>
              <ArrowRight :size="13" class="phase-link-arrow" />
              <span class="phase-link-name">{{ row.toName }}</span>
            </span>
            <span class="phase-link-carried">{{ row.carriedLabel }}</span>
            <AppButton
              size="xs"
              :disabled="row.derived"
              :title="t('tournament.phases.links.edit')"
              @click="editingEdgeId = row.edge.id"
            >
              <Settings2 :size="13" />
            </AppButton>
            <AppButton
              size="xs"
              variant="danger"
              :title="t('tournament.phases.links.remove')"
              @click="graph.disconnect(row.edge.id)"
            >
              <X :size="13" />
            </AppButton>
          </li>
        </ul>
      </div>

      <ul v-if="generalErrors.length" class="phase-errors">
        <li v-for="(err, i) in generalErrors" :key="i">
          {{ t(`tournament.phases.errors.${err.code}`, err.params ?? {}) }}
        </li>
      </ul>
    </div>

    <template #footer>
      <AppButton variant="filled" block :disabled="!graph.isValid.value" @click="handleSave">
        {{ t("common.save") }}
      </AppButton>
    </template>
  </AppModal>

  <PhaseConfigSheet
    v-if="configuringPhase"
    :phase="configuringPhase"
    :intake="graph.intakeOf(configuringPhase.id)"
    @save="applyConfig"
    @close="configuringId = null"
  />

  <PhaseRangeSheet
    v-if="editingEdge"
    :edge="editingEdge"
    :source-name="editingEdgeSource?.name ?? ''"
    :target-name="editingEdgeTarget?.name ?? ''"
    :available="editingEdgeAvailable"
    :derived="editingEdgeSource?.kind === 'group'"
    :carried="editingEdgeCarried"
    @save="applyRange"
    @remove="removeEdge"
    @close="editingEdgeId = null"
  />
</template>

<style scoped src="./phases.css"></style>
