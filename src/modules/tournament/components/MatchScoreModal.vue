<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue"
import { DialogRoot, DialogPortal, DialogOverlay, DialogContent, DialogTitle } from "reka-ui"
import { useI18n } from "vue-i18n"
import { Shuffle, Trash2, X } from "@lucide/vue"
import { AppNumberInput } from "@/components/ui"
import TeamBadge from "@/modules/teams/components/TeamBadge.vue"
import type { Team } from "@/modules/teams/types"
import type { MatchResult } from "../types"
import { MAX_GOALS } from "@/constants"
import { simulateMatch, simulatePenaltyShootout } from "@/engine"
import { useHaptic } from "@/composables/useHaptic"

const props = withDefaults(
  defineProps<{
    homeTeam: Team | null | undefined
    awayTeam: Team | null | undefined
    result: MatchResult | null | undefined
    requiresWinner?: boolean
    subtitle?: string
    canSimulate?: boolean
    /**
     * Leg 2 of a two-legged tie: the other leg's score, in this modal's
     * home/away frame (which is reversed vs. leg 1). When set, "level"
     * means level on aggregate, not level on this leg alone — e.g. a 1-0
     * leg 1 win followed by a 0-0 leg 2 sends the first team through
     * without a shootout.
     */
    aggregateOffset?: { home: number; away: number } | null
  }>(),
  { requiresWinner: false, canSimulate: true, aggregateOffset: null }
)

const emit = defineEmits<{
  close: []
  save: [home: number, away: number, penHome?: number, penAway?: number]
  clear: []
}>()

const { t } = useI18n()
const { success: hapticSuccess } = useHaptic()

const home = ref(props.result?.home ?? 0)
const away = ref(props.result?.away ?? 0)
const penHome = ref(props.result?.penHome ?? 0)
const penAway = ref(props.result?.penAway ?? 0)

/** Level check — on aggregate when aggregateOffset is set, else on this leg alone. */
function isLevel(h: number, a: number): boolean {
  if (props.aggregateOffset) {
    return h + props.aggregateOffset.home === a + props.aggregateOffset.away
  }
  return h === a
}

const pensRevealed = ref(
  !!(props.requiresWinner && props.result && isLevel(props.result.home, props.result.away))
)

watch(
  () => props.result,
  (r) => {
    home.value = r?.home ?? 0
    away.value = r?.away ?? 0
    penHome.value = r?.penHome ?? 0
    penAway.value = r?.penAway ?? 0
    pensRevealed.value = !!(props.requiresWinner && r && isLevel(r.home, r.away))
  }
)

watch([home, away], () => {
  pensRevealed.value = false
})

const isDraw = computed(() => isLevel(home.value, away.value))
const showPens = computed(() => props.requiresWinner && isDraw.value && pensRevealed.value)
const saveDisabled = computed(() => showPens.value && penHome.value === penAway.value)

const closing = ref(false)
function close() {
  if (closing.value) return
  closing.value = true
  setTimeout(() => emit("close"), 180)
}

function save() {
  // Tied + winner required, shootout not shown yet: first press just
  // records the score and reveals the shootout instead of closing.
  if (props.requiresWinner && isDraw.value && !pensRevealed.value) {
    pensRevealed.value = true
    return
  }
  if (saveDisabled.value) return
  hapticSuccess()
  if (showPens.value) emit("save", home.value, away.value, penHome.value, penAway.value)
  else emit("save", home.value, away.value)
  close()
}

/* Simulate used to emit straight up to the store, which committed a result
 * the instant the button was tapped — Save never got a say. It now only
 * rolls the fields locally; nothing is written until Save is pressed. */
function simulate() {
  if (!props.homeTeam || !props.awayTeam) return
  const fakeMatch = { homeId: props.homeTeam.id, awayId: props.awayTeam.id }
  const bothTeams = [props.homeTeam, props.awayTeam]
  const result = simulateMatch(fakeMatch as never, bothTeams)
  home.value = result.home
  away.value = result.away
  if (props.requiresWinner && isLevel(result.home, result.away)) {
    const pen = simulatePenaltyShootout(fakeMatch as never, bothTeams)
    penHome.value = pen.penHome
    penAway.value = pen.penAway
    // The [home, away] watcher below clears pensRevealed on every score
    // change (including this one) to force a Save press before showing the
    // shootout — override it after that flush since this roll already
    // decided the shootout and there's nothing left to reveal-on-Save.
    nextTick(() => {
      pensRevealed.value = true
    })
  }
}

function clear() {
  emit("clear")
  close()
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === "Enter") save()
}
</script>

<template>
  <DialogRoot :open="true" @update:open="(v) => !v && close()">
    <DialogPortal>
      <DialogOverlay class="ms-backdrop" :class="{ closing }" />
      <DialogContent
        class="ms-panel"
        :class="{ closing }"
        :aria-describedby="undefined"
        @escape-key-down="close"
        @pointer-down-outside="close"
        @keydown="onKeydown"
      >
        <div class="ms-header">
          <DialogTitle as-child>
            <span class="ms-title">
              {{ t("common.setResult") }}
              <span v-if="subtitle" class="ms-subtitle">{{ subtitle }}</span>
            </span>
          </DialogTitle>
          <button class="ms-close" :aria-label="t('common.cancel')" @click="close">
            <X :size="14" />
          </button>
        </div>

        <div class="ms-body">
          <div class="ms-side" :style="{ '--tc': homeTeam?.color ?? 'transparent' }">
            <TeamBadge :team="homeTeam" :size="20" class="ms-team" />
            <AppNumberInput
              v-model="home"
              editable
              :min="0"
              :max="MAX_GOALS"
              value-width="sm"
              class="ms-stepper"
            />
          </div>

          <div class="ms-side" :style="{ '--tc': awayTeam?.color ?? 'transparent' }">
            <TeamBadge :team="awayTeam" :size="20" class="ms-team" />
            <AppNumberInput
              v-model="away"
              editable
              :min="0"
              :max="MAX_GOALS"
              value-width="sm"
              class="ms-stepper"
            />
          </div>

          <!-- Shootout: only a level knockout tie needs one. -->
          <div v-if="showPens" class="ms-pens">
            <div class="ms-pens-head">
              <span class="ms-pens-title">{{ t("matchScore.penalties") }}</span>
              <span class="ms-pens-hint">{{ t("matchScore.penaltiesHint") }}</span>
            </div>
            <div class="ms-side">
              <TeamBadge :team="homeTeam" :size="16" class="ms-team" />
              <AppNumberInput
                v-model="penHome"
                editable
                :min="0"
                :max="MAX_GOALS"
                value-width="sm"
                class="ms-stepper"
              />
            </div>
            <div class="ms-side">
              <TeamBadge :team="awayTeam" :size="16" class="ms-team" />
              <AppNumberInput
                v-model="penAway"
                editable
                :min="0"
                :max="MAX_GOALS"
                value-width="sm"
                class="ms-stepper"
              />
            </div>
            <p v-if="saveDisabled" class="ms-pens-warn">{{ t("matchScore.penaltiesTied") }}</p>
          </div>
        </div>

        <div class="ms-footer">
          <button v-if="canSimulate" class="ms-ghost" @click="simulate">
            <Shuffle :size="14" />
            <span>{{ t("matchScore.simulate") }}</span>
          </button>
          <button v-if="result" class="ms-ghost ms-ghost--danger" @click="clear">
            <Trash2 :size="14" />
            <span>{{ t("matchScore.clear") }}</span>
          </button>
          <div class="ms-spacer" />
          <button @click="close">{{ t("common.cancel") }}</button>
          <button class="primary" :disabled="saveDisabled" @click="save">
            {{ t("common.save") }}
          </button>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
@keyframes ms-backdrop-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
@keyframes ms-backdrop-out {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}
@keyframes ms-sheet-in {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}
@keyframes ms-sheet-out {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(100%);
  }
}
@keyframes ms-dialog-in {
  from {
    opacity: 0;
    transform: translate(-50%, -46%);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%);
  }
}
@keyframes ms-dialog-out {
  from {
    opacity: 1;
    transform: translate(-50%, -50%);
  }
  to {
    opacity: 0;
    transform: translate(-50%, -46%);
  }
}

.ms-backdrop {
  position: fixed;
  inset: 0;
  z-index: calc(var(--z-modal) + 10);
  background: rgba(32, 33, 34, 0.5);
  animation: ms-backdrop-in 0.16s ease both;
}
.ms-backdrop.closing {
  animation: ms-backdrop-out 0.18s ease both;
}

.ms-panel {
  position: fixed;
  z-index: calc(var(--z-modal) + 11);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: min(400px, calc(100vw - 2 * var(--sp-4)));
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: ms-dialog-in 0.18s var(--ease) both;
}
.ms-panel.closing {
  animation: ms-dialog-out 0.18s var(--ease) both;
}

.ms-header {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-3);
  background: var(--bg);
  border-bottom: 1px solid var(--border-light);
}
.ms-title {
  font-family: var(--font-ui);
  font-size: var(--fs-xs);
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--accent);
  display: flex;
  align-items: baseline;
  gap: var(--sp-2);
}
.ms-subtitle {
  font-size: var(--fs-xs);
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--text-muted);
  text-transform: none;
}
.ms-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  margin-left: auto;
  border: none;
  background: transparent;
  color: var(--text-muted);
  border-radius: var(--radius);
  cursor: pointer;
}
.ms-close:hover {
  background: color-mix(in srgb, var(--border) 60%, transparent);
  color: var(--text);
}

.ms-body {
  padding: var(--sp-3);
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}

.ms-side {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-3);
  padding: var(--sp-2) var(--sp-2) var(--sp-2) var(--sp-3);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  background: var(--bg);
}
.ms-side::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  border-radius: var(--radius) 0 0 var(--radius);
  background: var(--tc, transparent);
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.18);
}
.ms-team {
  min-width: 0;
  overflow: hidden;
}
.ms-stepper {
  flex-shrink: 0;
}

.ms-pens {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  margin-top: var(--sp-1);
  padding-top: var(--sp-3);
  border-top: 1px dashed var(--border);
}
.ms-pens-head {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.ms-pens-title {
  font-family: var(--font-ui);
  font-size: var(--fs-xs);
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--accent-2);
}
.ms-pens-hint,
.ms-pens-warn {
  margin: 0;
  font-size: var(--fs-sm);
  color: var(--text-muted);
}
.ms-pens-warn {
  color: var(--danger);
}

.ms-footer {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-3) calc(var(--sp-2) + var(--safe-bottom));
  border-top: 1px solid var(--border-light);
  background: var(--bg);
}
.ms-spacer {
  flex: 1;
}
.ms-ghost {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-1);
  padding: var(--sp-2) var(--sp-2);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  background: transparent;
  color: var(--text-muted);
  font-size: var(--fs-sm);
  cursor: pointer;
}
.ms-ghost:hover {
  color: var(--text);
  border-color: var(--border);
}
.ms-ghost--danger:hover {
  color: var(--danger);
  border-color: color-mix(in srgb, var(--danger) 40%, var(--border-light));
}

@media (max-width: 640px) {
  .ms-panel {
    top: auto;
    bottom: 0;
    left: 0;
    transform: none;
    width: 100vw;
    max-width: 100vw;
    border: none;
    border-top: 1px solid var(--border);
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    animation: ms-sheet-in 0.22s cubic-bezier(0.22, 1, 0.36, 1) both;
  }
  .ms-panel.closing {
    animation: ms-sheet-out 0.18s cubic-bezier(0.4, 0, 1, 1) both;
  }
  .ms-side {
    padding: var(--sp-3) var(--sp-3) var(--sp-3) var(--sp-4);
  }
  .ms-ghost:nth-of-type(2) span {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .ms-panel,
  .ms-panel.closing,
  .ms-backdrop,
  .ms-backdrop.closing {
    animation: none;
  }
}
</style>
