<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from "vue"
import { useI18n } from "vue-i18n"
import confetti from "canvas-confetti"
import { X, Play, FastForward, Check, History, ChevronDown } from "@lucide/vue"
import type { Team } from "@/modules/teams/types"
import type { CeremonyContext, Pot } from "@/engine"
import { useSettingsStore } from "@/modules/settings/store"
import { useDrawCeremony } from "../../composables/useDrawCeremony"
import { useHaptic } from "@/composables/useHaptic"
import PotEditor from "./PotEditor.vue"
import DrawStage from "./DrawStage.vue"
import TeamSelector from "../TeamSelector.vue"

const props = defineProps<{
  title: string
  context: CeremonyContext
  teams: Team[]
  initialPots?: Pot[]
  previousTeamIds?: string[]
  allAvailableTeams?: Team[]
}>()

const emit = defineEmits<{
  complete: [orderedIds: string[]]
  useOldDraw: []
  cancel: []
}>()

const { t } = useI18n()
const settings = useSettingsStore()

const {
  pots,
  phase,
  speed,
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
} = useDrawCeremony(props.context, props.initialPots)

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
const { tap: hapticTap, success: hapticSuccess } = useHaptic()

// ── Team management ──────────────────────────────────────────────
const localTeamIds = ref(props.context.teams.map((t) => t.id))
const showTeamEdit = ref(false)

const localTeams = computed(() => {
  if (!props.allAvailableTeams) return props.teams
  return props.allAvailableTeams.filter((t) => localTeamIds.value.includes(t.id))
})

watch(localTeamIds, () => {
  rebuild(localTeams.value)
})

function onTeamSelectionChange(ids: string[]) {
  localTeamIds.value = ids
}

// ────────────────────────────────────────────────────────────────

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

function complete() {
  emit("complete", [...orderedIds.value])
}
</script>

<template>
  <div class="dc-backdrop">
    <div class="dc-panel" role="dialog" aria-modal="true">
      <header class="dc-header">
        <span class="dc-title">{{ title }}</span>
        <button class="dc-close" :aria-label="t('common.cancel')" @click="emit('cancel')">
          <X :size="15" />
        </button>
      </header>

      <div class="dc-body">
        <!-- Team management accordion (pots phase only, when allAvailableTeams provided) -->
        <div v-if="phase === 'pots' && allAvailableTeams" class="dc-team-panel">
          <button class="dc-team-toggle" @click="showTeamEdit = !showTeamEdit">
            <span class="dc-team-toggle-label">{{ t("drawCeremony.manageTeams") }}</span>
            <span class="dc-team-toggle-count">{{ localTeamIds.length }}</span>
            <ChevronDown
              :size="13"
              class="dc-team-toggle-icon"
              :class="{ 'dc-team-toggle-icon--open': showTeamEdit }"
            />
          </button>

          <div v-if="showTeamEdit" class="dc-team-edit">
            <TeamSelector
              :teams="allAvailableTeams"
              :selected="localTeamIds"
              @update:selected="onTeamSelectionChange"
            />
          </div>
        </div>

        <PotEditor
          v-if="phase === 'pots'"
          :pots="pots"
          :teams="localTeams"
          :errors="errors"
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
          />
        </template>
      </div>

      <footer class="dc-footer">
        <template v-if="phase === 'pots'">
          <button class="primary" :disabled="!canStart" @click="start">
            <Play :size="14" />
            {{ t("drawCeremony.startDraw") }}
          </button>
          <button @click="emit('cancel')">{{ t("common.cancel") }}</button>
          <button v-if="previousTeamIds" class="dc-old-draw-btn" @click="emit('useOldDraw')">
            <History :size="13" />
            {{ t("drawCeremony.useOldDraw") }}
          </button>
        </template>

        <template v-else-if="phase === 'drawing'">
          <button @click="skip">
            <FastForward :size="14" />
            {{ t("drawCeremony.skipDraw") }}
          </button>
          <div class="dc-speed">
            <span class="dc-speed-label">{{ t("drawCeremony.speed") }}</span>
            <button
              class="dc-speed-btn"
              :class="{ active: speed === 'normal' }"
              @click="speed = 'normal'"
            >
              {{ t("drawCeremony.speedNormal") }}
            </button>
            <button
              class="dc-speed-btn"
              :class="{ active: speed === 'fast' }"
              @click="speed = 'fast'"
            >
              {{ t("drawCeremony.speedFast") }}
            </button>
          </div>
        </template>

        <template v-else>
          <button class="primary" @click="complete">
            <Check :size="14" />
            {{ t("drawCeremony.continue") }}
          </button>
        </template>
      </footer>
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
  z-index: 300;
  background: rgba(20, 22, 28, 0.62);
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
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  padding-top: env(safe-area-inset-top);
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
  gap: 12px;
}
.dc-progress {
  height: 4px;
  background: var(--border-light);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 12px;
}
.dc-progress-bar {
  height: 100%;
  background: var(--accent);
  transition: width 0.3s ease;
}

/* ── Team management ── */
.dc-team-panel {
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  overflow: hidden;
}

.dc-team-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 8px 12px;
  background: var(--bg);
  border: none;
  cursor: pointer;
  text-align: left;
  transition: background 0.12s;
}
.dc-team-toggle:hover {
  background: color-mix(in srgb, var(--border-light) 60%, var(--bg));
}
.dc-team-toggle-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  flex: 1;
}
.dc-team-toggle-count {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  background: color-mix(in srgb, var(--border) 60%, transparent);
  border-radius: 10px;
  padding: 1px 7px;
}
.dc-team-toggle-icon {
  color: var(--text-muted);
  transition: transform 0.2s;
  flex-shrink: 0;
}
.dc-team-toggle-icon--open {
  transform: rotate(180deg);
}

.dc-team-edit {
  border-top: 1px solid var(--border-light);
  padding: 10px 12px;
}

/* ── Footer ── */
.dc-footer {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-3) var(--sp-4);
  border-top: 1px solid var(--border-light);
  background: var(--bg);
  flex-shrink: 0;
}

.dc-old-draw-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-left: auto;
  font-size: 12px;
  color: var(--text-muted);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  padding: 5px 12px;
  background: transparent;
  cursor: pointer;
  transition:
    color 0.12s,
    border-color 0.12s,
    background 0.12s;
}
.dc-old-draw-btn:hover {
  color: var(--text);
  border-color: var(--border);
  background: color-mix(in srgb, var(--border-light) 40%, transparent);
}

.dc-speed {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
}
.dc-speed-label {
  font-size: 11px;
  color: var(--text-muted);
  margin-right: 2px;
}
.dc-speed-btn {
  font-size: 11px;
  padding: 3px 9px;
}
.dc-speed-btn.active {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent-hover);
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
  .dc-footer {
    flex-wrap: wrap;
    padding-bottom: calc(var(--sp-3) + env(safe-area-inset-bottom));
  }
  .dc-old-draw-btn {
    margin-left: 0;
    width: 100%;
    justify-content: center;
  }
}
</style>
