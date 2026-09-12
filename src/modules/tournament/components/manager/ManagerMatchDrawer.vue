<script setup lang="ts">
/**
 * The match the user is managing, as it happens.
 *
 * Unlike the live window next door, nothing here has been decided in
 * advance: the engine plays the next minute each time the clock reaches it,
 * reading whatever shape and eleven are current. Pausing to switch to
 * attacking or bring somebody on genuinely changes the rest of the match —
 * and closing the window mid-game therefore abandons it, exactly as it does
 * for a fixture nobody has touched.
 */
import { computed, onMounted, ref, watch, nextTick } from "vue"
import { useI18n } from "vue-i18n"
import { ClipboardList, Pause, Play, RefreshCw, SkipForward } from "@lucide/vue"
import { AppButtonGroup, AppModal } from "@/components/ui"
import { TeamBadge } from "@/modules/teams/components"
import MatchTimeline from "../match-stats/MatchTimeline.vue"
import MatchShootout from "../match-stats/MatchShootout.vue"
import { formatMinute } from "../match-stats/matchTime"
import ManagerTacticsSheet from "./ManagerTacticsSheet.vue"
import ManagerSubSheet from "./ManagerSubSheet.vue"
import {
  REGULATION_MINUTES,
  createLiveMatch,
  type LiveMatchState,
  type LiveTactics,
  type Side,
  type WatchedMatch,
} from "@/engine"
import { useManagerMatch, type LiveSpeed } from "@/modules/tournament/composables/useManagerMatch"
import { useSettingsStore } from "@/modules/settings/store"
import { useHaptic } from "@/composables/useHaptic"
import type { Team } from "@/modules/teams/types"
import type { Player } from "@/modules/players/types"

const props = defineProps<{
  homeTeam: Team
  awayTeam: Team
  homeSquad: Player[]
  awaySquad: Player[]
  /** Which side the user is in charge of. */
  managedSide: Side
  /** His standing instructions, from the tournament's manager state. */
  tactics: LiveTactics
  requiresWinner?: boolean
  aggregateOffset?: { home: number; away: number } | null
  subtitle?: string
}>()

const emit = defineEmits<{
  /** Played to the whistle — the result is handed back for the modal to save. */
  finish: [watched: WatchedMatch]
  /** Abandoned. The fixture stays exactly as unplayed as it was. */
  cancel: []
}>()

const { t } = useI18n()
const settings = useSettingsStore()
const { success: hapticSuccess } = useHaptic()

const speed = computed({
  get: () => settings.liveMatchSpeed,
  set: (value: LiveSpeed) => (settings.liveMatchSpeed = value),
})

const state: LiveMatchState = createLiveMatch({
  homeTeam: props.homeTeam,
  awayTeam: props.awayTeam,
  homeSquad: props.homeSquad,
  awaySquad: props.awaySquad,
  managedSide: props.managedSide,
  managedTactics: props.tactics,
  requiresWinner: props.requiresWinner ?? false,
  aggregateOffset: props.aggregateOffset ?? null,
})

const match = useManagerMatch(state, props.managedSide, speed)

const speedOptions = computed(() =>
  ([1, 2, 4, 10] as const).map((value) => ({
    value: String(value),
    label: t("liveMatch.speedOption", { value }),
  }))
)

const managedTeam = computed(() => (props.managedSide === "home" ? props.homeTeam : props.awayTeam))

const hasExtraTime = computed(() => match.extraTime.value)

function breakLabel(minute: number): string {
  if (minute === REGULATION_MINUTES) return t("liveMatch.extraTime")
  return t("liveMatch.halfTime")
}

const clockLabel = computed(() => {
  if (match.stage.value === "kickoff") return t("liveMatch.kickOff")
  if (match.stage.value === "shootout") return t("liveMatch.penalties")
  if (match.stage.value === "break" && match.breakAt.value !== null) {
    return breakLabel(match.breakAt.value)
  }
  if (match.finished.value) return t("liveMatch.fullTime")
  return `${formatMinute(Math.floor(match.clock.value), hasExtraTime.value)}'`
})

const showShootout = computed(
  () => match.shootoutKicks.value.length > 0 || match.stage.value === "shootout"
)

const tacticsOpen = ref(false)
const subOpen = ref(false)

/** Changing anything holds the match where it is, so the decision is deliberate. */
function openTactics() {
  if (!match.paused.value && !match.finished.value) match.toggle()
  tacticsOpen.value = true
}
function openSub() {
  if (!match.paused.value && !match.finished.value) match.toggle()
  subOpen.value = true
}
function closeSheet() {
  tacticsOpen.value = false
  subOpen.value = false
  if (match.paused.value && !match.finished.value) match.toggle()
}

function applyTactics(next: LiveTactics) {
  match.changeTactics(next)
}

function substitute(outSlot: Parameters<typeof match.substitute>[0], inPlayer: Player) {
  match.substitute(outSlot, inPlayer)
}

/* The timeline lists newest-first, so a fresh event should keep the rail
   pinned to the top. The shootout below runs in the order kicks were taken. */
const rail = ref<HTMLElement | null>(null)
watch(
  () => match.events.value.length,
  async () => {
    await nextTick()
    rail.value?.scrollTo({ top: 0, behavior: "smooth" })
  }
)
watch(
  () => match.shootoutKicks.value.length,
  async () => {
    await nextTick()
    rail.value?.scrollTo({ top: rail.value.scrollHeight, behavior: "smooth" })
  }
)

/** A goal your own side scores is worth feeling. */
watch(
  () => match.score.value[props.managedSide],
  (goals, previous) => {
    if (goals > previous) hapticSuccess()
  }
)

const modal = ref<InstanceType<typeof AppModal> | null>(null)
const closing = ref(false)
const handBack = ref(false)

function close(hb: boolean) {
  if (closing.value) return
  closing.value = true
  handBack.value = hb
  match.stop()
  modal.value?.close()
}

function onClosed() {
  match.stop()
  if (!handBack.value) {
    emit("cancel")
    return
  }
  const { result, stats } = match.finish()
  emit("finish", {
    home: result.home,
    away: result.away,
    ...(result.penHome !== undefined && result.penAway !== undefined
      ? { penHome: result.penHome, penAway: result.penAway }
      : {}),
    ...(result.ft ? { ft: result.ft } : {}),
    ...(result.reds ? { reds: result.reds } : {}),
    stats,
  })
}

onMounted(match.start)
</script>

<template>
  <AppModal ref="modal" :dismiss-on-outside-click="false" :z-index="1020" flush @close="onClosed">
    <template #title>
      <span class="mm-title">
        {{ t("manager.match.title") }}
        <span class="mm-subtitle">{{ subtitle ?? managedTeam.name }}</span>
      </span>
    </template>

    <div class="mm-body">
      <div class="mm-scoreboard">
        <TeamBadge :team="homeTeam" :size="26" class="mm-team mm-team--home" />
        <div class="mm-score">
          <span class="mm-goals">{{ match.score.value.home }}</span>
          <span class="mm-dash">–</span>
          <span class="mm-goals">{{ match.score.value.away }}</span>
        </div>
        <TeamBadge :team="awayTeam" :size="26" class="mm-team" />
      </div>

      <div class="mm-clock-row">
        <span class="mm-clock" :class="{ 'mm-clock--live': !match.finished.value }">
          {{ clockLabel }}
        </span>
        <span v-if="match.inExtraTime.value && !match.finished.value" class="mm-tag">
          {{ t("liveMatch.extraTimeShort") }}
        </span>
        <span v-if="showShootout" class="mm-tag mm-tag--pens">
          {{ match.penScore.value.home }}–{{ match.penScore.value.away }}
        </span>
        <span class="mm-tag mm-tag--tactics">
          {{ match.tactics.value.formation }} ·
          {{ t(`coach.styles.${match.tactics.value.style}`) }}
        </span>
      </div>

      <div ref="rail" class="mm-rail">
        <MatchTimeline :events="match.events.value" :has-extra-time="hasExtraTime" />

        <div v-if="showShootout" class="mm-pens">
          <span class="mm-pens-title">{{ t("liveMatch.penalties") }}</span>
          <MatchShootout
            :kicks="match.shootoutKicks.value"
            :home-color="homeTeam.color"
            :away-color="awayTeam.color"
          />
        </div>
      </div>
    </div>

    <template #footer>
      <button
        v-if="!match.finished.value"
        class="mm-ghost"
        :aria-label="match.paused.value ? t('liveMatch.resume') : t('liveMatch.pause')"
        @click="match.toggle"
      >
        <component :is="match.paused.value ? Play : Pause" :size="14" />
      </button>
      <AppButtonGroup
        v-if="!match.finished.value"
        :model-value="String(speed)"
        :options="speedOptions"
        size="xs"
        @update:model-value="(v) => (speed = Number(v) as LiveSpeed)"
      />
      <div class="mm-spacer" />
      <template v-if="!match.finished.value">
        <button class="mm-ghost" :title="t('manager.tactics.title')" @click="openTactics">
          <ClipboardList :size="14" />
        </button>
        <button
          class="mm-ghost"
          :title="t('manager.sub.title')"
          :disabled="match.subsLeft.value <= 0"
          @click="openSub"
        >
          <RefreshCw :size="14" />
          <span class="mm-subs-left">{{ match.subsLeft.value }}</span>
        </button>
        <button class="mm-ghost" @click="match.skip">
          <SkipForward :size="14" />
        </button>
      </template>
      <button v-else class="primary" @click="close(true)">
        {{ t("liveMatch.useResult") }}
      </button>
    </template>
  </AppModal>

  <ManagerTacticsSheet
    v-if="tacticsOpen"
    :tactics="match.tactics.value"
    @apply="applyTactics"
    @close="closeSheet"
  />
  <ManagerSubSheet
    v-if="subOpen"
    :pitch="match.pitch.value"
    :bench="match.bench.value"
    :subs-left="match.subsLeft.value"
    @substitute="substitute"
    @close="closeSheet"
  />
</template>

<style scoped>
@keyframes mm-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.45;
  }
}

.mm-title {
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
.mm-subtitle {
  font-size: var(--fs-xs);
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--text-muted);
  text-transform: none;
}

.mm-body {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.mm-scoreboard {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-3) var(--sp-3) var(--sp-1);
}
.mm-team {
  min-width: 0;
  overflow: hidden;
}
.mm-team--home {
  flex-direction: row-reverse;
  text-align: end;
  justify-content: flex-start;
}

.mm-score {
  display: flex;
  align-items: baseline;
  gap: var(--sp-2);
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
}
.mm-goals {
  font-size: 1.75rem;
  font-weight: 700;
  line-height: 1;
}
.mm-dash {
  color: var(--text-muted);
}

.mm-clock-row {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: var(--sp-2);
  padding-bottom: var(--sp-2);
  border-bottom: 1px solid var(--border-light);
}
.mm-clock {
  font-family: var(--font-mono);
  font-size: var(--fs-sm);
  font-variant-numeric: tabular-nums;
  color: var(--text-muted);
}
.mm-clock--live {
  color: var(--accent);
  animation: mm-pulse 1.6s ease-in-out infinite;
}
.mm-tag {
  padding: 1px var(--sp-2);
  border-radius: var(--radius-pill);
  border: 1px solid var(--border-light);
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  color: var(--text-muted);
}
.mm-tag--pens {
  color: var(--accent-2);
  border-color: color-mix(in srgb, var(--accent-2) 40%, var(--border-light));
}
.mm-tag--tactics {
  font-family: var(--font-ui);
  color: var(--accent);
  border-color: color-mix(in srgb, var(--accent) 35%, var(--border-light));
}

.mm-rail {
  flex: 1;
  min-height: 180px;
  overflow-y: auto;
  padding: var(--sp-2) var(--sp-3);
}

.mm-pens {
  margin-top: var(--sp-3);
  padding-top: var(--sp-3);
  border-top: 1px dashed var(--border);
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}
.mm-pens-title {
  font-family: var(--font-ui);
  font-size: var(--fs-xs);
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--accent-2);
}

.mm-spacer {
  flex: 1;
}
.mm-ghost {
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
.mm-ghost:hover:not(:disabled) {
  color: var(--text);
  border-color: var(--border);
}
.mm-ghost:disabled {
  opacity: 0.5;
  cursor: default;
}
.mm-subs-left {
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
}

@media (max-width: 380px) {
  .mm-title {
    font-size: 10px;
    gap: var(--sp-1);
  }
  .mm-subtitle {
    font-size: 10px;
  }
  .mm-goals {
    font-size: 1.4rem;
  }
  .mm-clock {
    font-size: var(--fs-xs);
  }
  .mm-tag {
    font-size: 10px;
    padding: 1px var(--sp-1);
  }
  .mm-ghost {
    padding: var(--sp-1) var(--sp-2);
    font-size: var(--fs-xs);
  }
}

@media (prefers-reduced-motion: reduce) {
  .mm-clock--live {
    animation: none;
  }
}
</style>
