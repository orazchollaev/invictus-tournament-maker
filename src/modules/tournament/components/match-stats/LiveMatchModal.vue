<script setup lang="ts">
/**
 * The match as it happens, rather than as a scoreline that was already
 * there. The narrative is generated before the first whistle and simply
 * played back, so nothing here can influence the result — closing the
 * window mid-match leaves the fixture exactly as unplayed as it was.
 */
import { computed, nextTick, onMounted, ref, watch } from "vue"
import { DialogRoot, DialogPortal, DialogOverlay, DialogContent, DialogTitle } from "reka-ui"
import { useI18n } from "vue-i18n"
import { Pause, Play, SkipForward, X } from "@lucide/vue"
import { BtnGroup } from "@/components/ui"
import TeamBadge from "@/modules/teams/components/TeamBadge.vue"
import MatchTimeline from "./MatchTimeline.vue"
import MatchShootout from "./MatchShootout.vue"
import { formatMinute } from "./matchTime"
import { useLiveMatch, type LiveSpeed } from "@/modules/tournament/composables/useLiveMatch"
import { useSettingsStore } from "@/modules/settings/store"
import { useHaptic } from "@/composables/useHaptic"
import { REGULATION_MINUTES } from "@/engine"
import type { Team } from "@/modules/teams/types"
import type { MatchEvent, ShootoutKick } from "@/modules/tournament/types"

const props = defineProps<{
  homeTeam: Team | null | undefined
  awayTeam: Team | null | undefined
  events: MatchEvent[]
  shootout?: ShootoutKick[]
  hasExtraTime: boolean
  subtitle?: string
  /** A replay of a match already on record has nothing to hand back. */
  replay?: boolean
}>()

const emit = defineEmits<{
  /** Done watching — the score should be carried into the modal below. */
  finish: []
  /** Abandoned. Nothing was decided here, so nothing is handed back. */
  cancel: []
}>()

const { t } = useI18n()
const settings = useSettingsStore()
const { success: hapticSuccess } = useHaptic()

const speed = computed({
  get: () => settings.liveMatchSpeed,
  set: (value: LiveSpeed) => (settings.liveMatchSpeed = value),
})

const live = useLiveMatch(
  { events: props.events, shootout: props.shootout, hasExtraTime: props.hasExtraTime },
  speed
)

const speedOptions = computed(() =>
  ([1, 2, 4, 10] as const).map((value) => ({
    value: String(value),
    label: t("liveMatch.speedOption", { value }),
  }))
)

function breakLabel(minute: number): string {
  return minute === REGULATION_MINUTES ? t("liveMatch.extraTime") : t("liveMatch.halfTime")
}

const clockLabel = computed(() => {
  if (live.stage.value === "kickoff") return t("liveMatch.kickOff")
  if (live.stage.value === "shootout") return t("liveMatch.penalties")
  if (live.stage.value === "break" && live.breakAt.value !== null) {
    return breakLabel(live.breakAt.value)
  }
  if (live.finished.value) return t("liveMatch.fullTime")
  return `${formatMinute(Math.floor(live.clock.value), props.hasExtraTime)}'`
})

const showShootout = computed(
  () => live.visibleKicks.value.length > 0 || live.stage.value === "shootout"
)

/* The rail grows downwards, so the newest incident would otherwise fall
   out of view the moment it is added. */
const rail = ref<HTMLElement | null>(null)
watch(
  () => [live.visibleEvents.value.length, live.visibleKicks.value.length],
  async () => {
    await nextTick()
    rail.value?.scrollTo({ top: rail.value.scrollHeight, behavior: "smooth" })
  }
)

/* A goal you can feel. Bookings deliberately stay silent — a buzz for every
   yellow card would make the whole match vibrate. */
watch(
  () => live.score.value.home + live.score.value.away,
  (goals, previous) => {
    if (goals > previous) hapticSuccess()
  }
)

const closing = ref(false)
function close(handBack: boolean) {
  if (closing.value) return
  closing.value = true
  live.stop()
  setTimeout(() => (handBack ? emit("finish") : emit("cancel")), 180)
}

/** Skipping skips time, not the match — the result was decided before kick-off. */
function skip() {
  live.skip()
}

function done() {
  close(!props.replay)
}

onMounted(live.start)
</script>

<template>
  <DialogRoot :open="true" @update:open="(v) => !v && close(false)">
    <DialogPortal>
      <DialogOverlay class="lm-backdrop" :class="{ closing }" />
      <DialogContent
        class="lm-panel"
        :class="{ closing }"
        :aria-describedby="undefined"
        @escape-key-down="close(false)"
        @pointer-down-outside="(e: Event) => e.preventDefault()"
      >
        <div class="lm-header">
          <DialogTitle as-child>
            <span class="lm-title">
              {{ replay ? t("liveMatch.replayTitle") : t("liveMatch.title") }}
              <span v-if="subtitle" class="lm-subtitle">{{ subtitle }}</span>
            </span>
          </DialogTitle>
          <button class="lm-close" :aria-label="t('common.cancel')" @click="close(false)">
            <X :size="14" />
          </button>
        </div>

        <div class="lm-scoreboard">
          <TeamBadge :team="homeTeam" :size="26" class="lm-team lm-team--home" />
          <div class="lm-score">
            <span class="lm-goals">{{ live.score.value.home }}</span>
            <span class="lm-dash">–</span>
            <span class="lm-goals">{{ live.score.value.away }}</span>
          </div>
          <TeamBadge :team="awayTeam" :size="26" class="lm-team" />
        </div>

        <div class="lm-clock-row">
          <span class="lm-clock" :class="{ 'lm-clock--live': !live.finished.value }">
            {{ clockLabel }}
          </span>
          <span v-if="live.inExtraTime.value && !live.finished.value" class="lm-tag">
            {{ t("liveMatch.extraTimeShort") }}
          </span>
          <span v-if="showShootout" class="lm-tag lm-tag--pens">
            {{ live.penScore.value.home }}–{{ live.penScore.value.away }}
          </span>
        </div>

        <div ref="rail" class="lm-rail">
          <MatchTimeline :events="live.visibleEvents.value" :has-extra-time="hasExtraTime" />

          <div v-if="showShootout" class="lm-pens">
            <span class="lm-pens-title">{{ t("liveMatch.penalties") }}</span>
            <MatchShootout
              :kicks="live.visibleKicks.value"
              :home-color="homeTeam?.color ?? 'var(--text-muted)'"
              :away-color="awayTeam?.color ?? 'var(--text-muted)'"
            />
          </div>
        </div>

        <div class="lm-footer">
          <button
            v-if="!live.finished.value"
            class="lm-ghost"
            :aria-label="live.paused.value ? t('liveMatch.resume') : t('liveMatch.pause')"
            @click="live.toggle"
          >
            <component :is="live.paused.value ? Play : Pause" :size="14" />
          </button>
          <BtnGroup
            v-if="!live.finished.value"
            :model-value="String(speed)"
            :options="speedOptions"
            size="xs"
            @update:model-value="(v) => (speed = Number(v) as LiveSpeed)"
          />
          <div class="lm-spacer" />
          <button v-if="!live.finished.value" class="lm-ghost" @click="skip">
            <SkipForward :size="14" />
            <span>{{ t("liveMatch.skip") }}</span>
          </button>
          <button v-else class="primary" @click="done">
            {{ replay ? t("common.close") : t("liveMatch.useResult") }}
          </button>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
@keyframes lm-fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
@keyframes lm-fade-out {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}
@keyframes lm-in {
  from {
    opacity: 0;
    transform: translate(-50%, -46%);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%);
  }
}
@keyframes lm-out {
  from {
    opacity: 1;
    transform: translate(-50%, -50%);
  }
  to {
    opacity: 0;
    transform: translate(-50%, -46%);
  }
}
@keyframes lm-sheet-in {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}
@keyframes lm-sheet-out {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(100%);
  }
}
@keyframes lm-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.45;
  }
}

.lm-backdrop {
  position: fixed;
  inset: 0;
  z-index: calc(var(--z-modal) + 20);
  background: rgba(32, 33, 34, 0.6);
  animation: lm-fade-in 0.16s ease both;
}
.lm-backdrop.closing {
  animation: lm-fade-out 0.18s ease both;
}

.lm-panel {
  position: fixed;
  z-index: calc(var(--z-modal) + 21);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: min(420px, calc(100vw - 2 * var(--sp-4)));
  max-height: min(640px, calc(100dvh - 2 * var(--sp-4)));
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: lm-in 0.18s var(--ease) both;
}
.lm-panel.closing {
  animation: lm-out 0.18s var(--ease) both;
}

.lm-header {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-3);
  background: var(--bg);
  border-bottom: 1px solid var(--border-light);
}
.lm-title {
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
.lm-subtitle {
  font-size: var(--fs-xs);
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--text-muted);
  text-transform: none;
}
.lm-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  margin-inline-start: auto;
  border: none;
  background: transparent;
  color: var(--text-muted);
  border-radius: var(--radius);
  cursor: pointer;
}
.lm-close:hover {
  background: color-mix(in srgb, var(--border) 60%, transparent);
  color: var(--text);
}

.lm-scoreboard {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-3) var(--sp-3) var(--sp-1);
}
.lm-team {
  min-width: 0;
  overflow: hidden;
}
.lm-team--home {
  flex-direction: row-reverse;
  text-align: end;
  justify-content: flex-start;
}

.lm-score {
  display: flex;
  align-items: baseline;
  gap: var(--sp-2);
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
}
.lm-goals {
  font-size: 1.75rem;
  font-weight: 700;
  line-height: 1;
}
.lm-dash {
  color: var(--text-muted);
}

.lm-clock-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-2);
  padding-bottom: var(--sp-2);
  border-bottom: 1px solid var(--border-light);
}
.lm-clock {
  font-family: var(--font-mono);
  font-size: var(--fs-sm);
  font-variant-numeric: tabular-nums;
  color: var(--text-muted);
}
.lm-clock--live {
  color: var(--accent);
  animation: lm-pulse 1.6s ease-in-out infinite;
}
.lm-tag {
  padding: 1px var(--sp-2);
  border-radius: var(--radius-pill);
  border: 1px solid var(--border-light);
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  color: var(--text-muted);
}
.lm-tag--pens {
  color: var(--accent-2);
  border-color: color-mix(in srgb, var(--accent-2) 40%, var(--border-light));
}

.lm-rail {
  flex: 1;
  min-height: 180px;
  overflow-y: auto;
  padding: var(--sp-2) var(--sp-3);
}

.lm-pens {
  margin-top: var(--sp-3);
  padding-top: var(--sp-3);
  border-top: 1px dashed var(--border);
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}
.lm-pens-title {
  font-family: var(--font-ui);
  font-size: var(--fs-xs);
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--accent-2);
}

.lm-footer {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-3) calc(var(--sp-2) + var(--safe-bottom));
  border-top: 1px solid var(--border-light);
  background: var(--bg);
}
.lm-spacer {
  flex: 1;
}
.lm-ghost {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-1);
  padding: var(--sp-2);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  background: transparent;
  color: var(--text-muted);
  font-size: var(--fs-sm);
  cursor: pointer;
}
.lm-ghost:hover {
  color: var(--text);
  border-color: var(--border);
}

@media (max-width: 600px) {
  .lm-panel {
    top: auto;
    bottom: 0;
    inset-inline-start: 0;
    transform: none;
    width: 100vw;
    max-width: 100vw;
    max-height: 88dvh;
    border: none;
    border-top: 1px solid var(--border);
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    animation: lm-sheet-in 0.22s cubic-bezier(0.22, 1, 0.36, 1) both;
  }
  .lm-panel.closing {
    animation: lm-sheet-out 0.18s cubic-bezier(0.4, 0, 1, 1) both;
  }
}

@media (prefers-reduced-motion: reduce) {
  .lm-panel,
  .lm-panel.closing,
  .lm-backdrop,
  .lm-backdrop.closing,
  .lm-clock--live {
    animation: none;
  }
}
</style>
