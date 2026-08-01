<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from "vue"
import { useI18n } from "vue-i18n"
import confetti from "canvas-confetti"
import { X } from "@lucide/vue"
import { AppIcon } from "@/components/ui"
import type { Team } from "@/modules/teams/types"
import type { CeremonyContext, Pot, DrawPlan } from "@/engine"
import { useSettingsStore } from "@/modules/settings/store"
import { useDrawCeremony } from "../../composables/useDrawCeremony"
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

const { t } = useI18n()
const settings = useSettingsStore()

const {
  locked,
  pots,
  phase,
  speed,
  paused,
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
      confetti({ particleCount: 90, spread: 75, origin: { y: 0.6 }, zIndex: 9999 })
    }
  } else if (p === "drawing") {
    hapticTap()
  }
})

function onKey(e: KeyboardEvent) {
  if (e.key === "Escape" && phase.value !== "drawing") emit("cancel")
}

onMounted(() => {
  document.body.style.overflow = "hidden"
  document.addEventListener("keydown", onKey)
})
onUnmounted(() => {
  document.body.style.overflow = ""
  document.removeEventListener("keydown", onKey)
})
</script>

<template>
  <div class="dc-backdrop">
    <div class="dc-panel" role="dialog" aria-modal="true">
      <header class="dc-header">
        <span class="dc-title">{{ title }}</span>
        <button class="dc-close" :aria-label="t('common.cancel')" @click="emit('cancel')">
          <AppIcon :icon="X" size="md" />
        </button>
      </header>

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
          />
        </template>
      </div>

      <DrawCeremonyFooter
        v-model:speed="speed"
        :phase="phase"
        :can-start="canStart"
        :paused="paused"
        :has-previous-draw="!!previousTeamIds"
        @start="start"
        @cancel="emit('cancel')"
        @use-old-draw="emit('useOldDraw')"
        @skip="skip"
        @toggle-pause="togglePause"
        @complete="emit('complete', [...orderedIds])"
      />
    </div>
  </div>
</template>

<style scoped>
@keyframes dc-backdrop-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
@keyframes dc-panel-in {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.dc-backdrop {
  position: fixed;
  inset: 0;
  z-index: var(--z-overlay);
  background: var(--scrim-strong);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--sp-4);
  animation: dc-backdrop-in var(--dur) var(--ease) both;
}

.dc-panel {
  width: min(720px, 100%);
  max-height: calc(100vh - 32px);
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--elev-3);
  overflow: hidden;
  padding-top: var(--safe-top);
  animation: dc-panel-in var(--dur-slow) cubic-bezier(0.22, 1, 0.36, 1) both;
}

.dc-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-2);
  padding: var(--sp-3) var(--sp-4);
  background: var(--bg);
  border-bottom: 1px solid var(--border-light);
  flex-shrink: 0;
}

.dc-title {
  font-family: var(--font);
  font-size: var(--fs-md);
  font-weight: 600;
}

.dc-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--text-muted);
  border-radius: var(--radius);
  cursor: pointer;
}
.dc-close:hover {
  background: color-mix(in srgb, var(--border) 60%, transparent);
  color: var(--text);
}

.dc-body {
  padding: var(--sp-4);
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

.dc-progress {
  height: 4px;
  background: var(--border-light);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: var(--sp-3);
}

.dc-progress-bar {
  height: 100%;
  background: var(--accent);
  transition: width var(--dur-slow) var(--ease);
}

@media (max-width: 640px) {
  .dc-backdrop {
    padding: 0;
  }
  .dc-panel {
    width: 100%;
    height: 100%;
    max-height: 100%;
    border-radius: 0;
    border: none;
  }
}
</style>
