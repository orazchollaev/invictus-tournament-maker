<script setup lang="ts">
import { ref, computed, watch } from "vue"
import { AppModal } from "@/components/ui"
import type { Team } from "@/modules/teams/types"
import type { CeremonyContext, Pot, DrawPlan } from "@/engine"
import { useSettingsStore } from "@/modules/settings/store"
import { useDrawCeremony } from "@/modules/tournament/composables/useDrawCeremony"
import { useHaptic } from "@/composables/useHaptic"
import PotEditor from "./PotEditor.vue"
import DrawStage from "./DrawStage.vue"
import DrawTeamPanel from "./DrawTeamPanel.vue"
import DrawCeremonyFooter from "./DrawCeremonyFooter.vue"

const props = defineProps<{
  title: string
  context: CeremonyContext
  teams: Team[]
  initialPots?: Pot[]
  previousTeamIds?: string[]
  allAvailableTeams?: Team[]
  fixedPlan?: DrawPlan
}>()

const emit = defineEmits<{
  complete: [orderedIds: string[]]
  useOldDraw: []
  cancel: []
}>()

const settings = useSettingsStore()

const {
  locked,
  pots,
  phase,
  speed,
  paused,
  skipped,
  sequence,
  revealed,
  current,
  errors,
  canStart,
  progress,
  orderedIds,
  resetPots,
  rebuild,
  start,
  skip,
  pause,
  resume,
} = useDrawCeremony(props.context, props.initialPots, props.fixedPlan)

function togglePause() {
  if (paused.value) resume()
  else pause()
}

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
const { tap: hapticTap, success: hapticSuccess } = useHaptic()

// ── Team management ──────────────────────────────────────────
const localTeamIds = ref(props.context.teams.map((tm) => tm.id))

const localTeams = computed(() => {
  if (!props.allAvailableTeams) return props.teams
  return props.allAvailableTeams.filter((tm) => localTeamIds.value.includes(tm.id))
})

watch(localTeamIds, () => rebuild(localTeams.value))

/** Only editable before the draw starts, and only when a full roster was supplied. */
const canEditTeams = computed(() => phase.value === "pots" && !!props.allAvailableTeams && !locked)

watch(phase, (p) => {
  if (p === "done") {
    hapticSuccess()
    if (settings.confettiOnWin && !prefersReducedMotion) {
      void import("canvas-confetti").then(({ default: confetti }) =>
        confetti({ particleCount: 90, spread: 75, origin: { y: 0.6 }, zIndex: 9999 })
      )
    }
  } else if (p === "drawing") {
    hapticTap()
  }
})

// ── Leaving ──────────────────────────────────────────────────
// Every way out plays the drawer's exit animation first. The footer's actions
// hand theirs to close(); the close button, Escape and the backdrop end up in
// onClosed with nothing settled, which is a cancel.
const modal = ref<InstanceType<typeof AppModal> | null>(null)
let settled = false

function finish(action: () => void) {
  settled = true
  modal.value?.close(action)
}

function onClosed() {
  if (!settled) emit("cancel")
}
</script>

<template>
  <AppModal
    ref="modal"
    :title="title"
    width="720px"
    flush
    :dismiss-on-outside-click="false"
    @close="onClosed"
  >
    <div class="dc-body">
      <DrawTeamPanel
        v-if="canEditTeams"
        :available-teams="allAvailableTeams!"
        :selected="localTeamIds"
        @update:selected="(ids) => (localTeamIds = ids)"
      />

      <PotEditor
        v-if="phase === 'pots'"
        :pots="pots"
        :teams="localTeams"
        :errors="errors"
        :readonly="locked"
        @reset="resetPots"
      />
      <template v-else>
        <div class="dc-progress">
          <div class="dc-progress-bar" :style="{ width: `${Math.round(progress * 100)}%` }" />
        </div>
        <DrawStage
          :revealed="revealed"
          :current="current"
          :sequence="sequence"
          :teams="localTeams"
          :speed="speed"
          :kind="context.kind"
          :instant="skipped"
        />
      </template>
    </div>

    <template #footer>
      <DrawCeremonyFooter
        v-model:speed="speed"
        :phase="phase"
        :can-start="canStart"
        :paused="paused"
        :has-previous-draw="!!previousTeamIds"
        @start="start"
        @cancel="finish(() => emit('cancel'))"
        @use-old-draw="finish(() => emit('useOldDraw'))"
        @skip="skip"
        @toggle-pause="togglePause"
        @complete="finish(() => emit('complete', [...orderedIds]))"
      />
    </template>
  </AppModal>
</template>

<style scoped>
.dc-body {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  padding: var(--sp-4);
}

.dc-progress {
  height: 4px;
  margin-bottom: var(--sp-3);
  overflow: hidden;
  border-radius: 2px;
  background: var(--border-light);
}

.dc-progress-bar {
  height: 100%;
  background: var(--accent);
  transition: width var(--dur-slow) var(--ease);
}

@media (max-width: 600px) {
  .dc-body {
    padding: var(--sp-3);
  }
}
</style>
