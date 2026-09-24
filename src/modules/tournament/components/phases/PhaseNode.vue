<script setup lang="ts">
/**
 * One phase on the blueprint.
 *
 * The output handle is missing on a knockout, and that is the whole reason
 * this is a custom node rather than a default one: a knockout's losers are
 * out, so it is where a branch of the graph ends. Not drawing the port is a
 * clearer way to say so than letting the user drag a connection that
 * validation will then reject.
 */
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { Handle, Position } from "@vue-flow/core"
import { LayoutGrid, List, Shuffle, Trophy, Settings2, Flag, X } from "@lucide/vue"
import type { PhaseGraphError } from "@/engine"
import type { PhaseKind, TournamentPhase } from "@/modules/tournament/types"

const props = defineProps<{
  data: {
    phase: TournamentPhase
    intake: number
    errors: PhaseGraphError[]
    readonly: boolean
  }
}>()

const emit = defineEmits<{
  rename: [string]
  configure: []
  remove: []
  markFinal: []
}>()

const { t } = useI18n()

const ICONS: Record<PhaseKind, typeof Trophy> = {
  group: LayoutGrid,
  league: List,
  swiss: Shuffle,
  knockout: Trophy,
}

const phase = computed(() => props.data.phase)
const icon = computed(() => ICONS[phase.value.kind])
const hasOutput = computed(() => phase.value.kind !== "knockout")
const hasError = computed(() => props.data.errors.length > 0)

function onNameInput(event: Event) {
  emit("rename", (event.target as HTMLInputElement).value)
}
</script>

<template>
  <div class="phase-node" :class="{ 'phase-node--error': hasError, 'phase-node--final': phase.isFinal }">
    <Handle type="target" :position="Position.Left" class="phase-handle" />

    <div class="phase-node-head">
      <span class="phase-node-icon">
        <component :is="icon" :size="15" />
      </span>

      <input
        v-if="!data.readonly"
        class="phase-node-name"
        :value="phase.name"
        :aria-label="t('tournament.phases.node.name')"
        maxlength="28"
        @input="onNameInput"
        @keydown.stop
      />
      <span v-else class="phase-node-name phase-node-name--static">{{ phase.name }}</span>

      <button
        v-if="!data.readonly"
        type="button"
        class="phase-node-action phase-node-action--remove"
        :aria-label="t('tournament.phases.node.remove')"
        @click.stop="emit('remove')"
      >
        <X :size="13" />
      </button>
    </div>

    <div class="phase-node-meta">
      <span class="phase-node-kind">{{ t(`tournament.phases.kinds.${phase.kind}`) }}</span>
      <span class="phase-node-intake">{{ t("tournament.phases.node.teams", { count: data.intake }) }}</span>
    </div>

    <div class="phase-node-foot">
      <button
        type="button"
        class="phase-node-action"
        @click.stop="emit('configure')"
      >
        <Settings2 :size="13" />
        <span>{{ t("tournament.phases.node.config") }}</span>
      </button>

      <button
        type="button"
        class="phase-node-action phase-node-action--final"
        :class="{ 'phase-node-action--on': phase.isFinal }"
        :disabled="data.readonly"
        @click.stop="emit('markFinal')"
      >
        <Flag :size="13" />
        <span>{{ t("tournament.phases.node.final") }}</span>
      </button>
    </div>

    <ul v-if="hasError" class="phase-node-errors">
      <li v-for="(err, i) in data.errors" :key="i">
        {{ t(`tournament.phases.errors.${err.code}`, err.params ?? {}) }}
      </li>
    </ul>

    <Handle v-if="hasOutput" type="source" :position="Position.Right" class="phase-handle" />
  </div>
</template>

<style scoped src="./phases.css"></style>
