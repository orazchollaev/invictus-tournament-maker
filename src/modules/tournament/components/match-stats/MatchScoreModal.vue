<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue"

import { useI18n } from "vue-i18n"
import { ChartColumn, ClipboardList, PlayCircle, Shuffle, Trash2 } from "@lucide/vue"
import { AppNumberInput, AppSheet } from "@/components/ui"
import { TeamBadge } from "@/modules/teams/components"
import MatchStatsModal from "./MatchStatsModal.vue"
import LiveMatchModal from "./LiveMatchModal.vue"
// Imported directly rather than through the manager barrel: ManagerBanner
// opens this very modal, so pulling the barrel in here would close a cycle.
import ManagerMatchDrawer from "../manager/ManagerMatchDrawer.vue"
import type { Team } from "@/modules/teams/types"
import type { MatchResult, MatchStats } from "@/modules/tournament/types"
import { MAX_GOALS } from "@/constants"
import {
  allMatches,
  buildLineup,
  decideKnockoutResult,
  generateMatchStats,
  dropWatchedMatch,
  pendingKey,
  resolvePower,
  simulateMatch,
  stashWatchedMatch,
  teamFormation,
  unavailablePlayersByMatch,
  DEFAULT_FORMATION,
  DEFAULT_STYLE,
  type KnockoutDecision,
  type LiveTactics,
  type Side,
  type WatchedMatch,
} from "@/engine"
import { usePlayersStore } from "@/modules/players/store"
import { useTournamentStore } from "@/modules/tournament/store"
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
     * Identifies the fixture, so a tie played out in the live window can hand
     * its events to the sweep that runs after the result is saved. Without it
     * the Live button is not offered: there would be nowhere to leave the
     * narrative, and the report would contradict what was watched.
     */
    matchId?: string
    leg?: 1 | 2
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
const playersStore = usePlayersStore()
const tournamentStore = useTournamentStore()

/**
 * The tournament this fixture belongs to, found by searching for the match
 * id rather than threaded down as a prop — this modal is opened from four
 * different card components, each several layers under whichever page
 * already resolved the tournament, and match ids are effectively unique
 * (see engine/utils.ts:uid), so a search is far cheaper than plumbing an
 * id through every one of those layers for this alone.
 */
const tournament = computed(() => {
  if (!props.matchId) return undefined
  return tournamentStore.tournaments.find((t) =>
    allMatches(t).some((entry) => entry.match.id === props.matchId)
  )
})

/**
 * Players this fixture's two sides cannot field — hurt in an earlier match
 * and not yet due back (see engine/injuries.ts). Rolling or watching a
 * match here goes through the same filter the post-save sweep in ensure.ts
 * applies, so an injured player is exactly as unavailable whether the
 * score was typed in, tapped to simulate, or watched live.
 */
const unavailable = computed(() => {
  const empty = { home: new Set<string>(), away: new Set<string>() }
  if (!tournament.value || !props.matchId) return empty
  const entry = unavailablePlayersByMatch(tournament.value).get(
    `${props.matchId}:${props.leg ?? 1}`
  )
  if (!entry) return empty
  return {
    home: new Set(entry.unavailableHomeIds),
    away: new Set(entry.unavailableAwayIds),
  }
})

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

const sheet = ref<InstanceType<typeof AppSheet> | null>(null)

function close() {
  sheet.value?.close()
}

/**
 * Runs once the sheet has finished its exit, whichever way it was dismissed.
 * Save commits synchronously before this, so by now the stash has either
 * been claimed or belongs to a roll the user walked away from.
 */
function onClosed() {
  if (props.matchId) dropWatchedMatch(pendingKey(props.matchId, props.leg ?? 1))
  emit("close")
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

/**
 * Roll the tie without writing anything.
 *
 * A knockout tie now goes through the whole rule — ninety minutes, extra
 * time, then kicks — which is more than the four numbers this modal can emit
 * on Save. The score at ninety rides along in the stash instead, where the
 * sweep after the commit picks it up; see engine/events/pending.ts.
 */
function rollTie(): KnockoutDecision {
  const fakeMatch = {
    id: props.matchId ?? "",
    homeId: props.homeTeam!.id,
    awayId: props.awayTeam!.id,
  }
  const bothTeams = [props.homeTeam!, props.awayTeam!]
  if (!props.requiresWinner) return { result: simulateMatch(fakeMatch as never, bothTeams) }
  return decideKnockoutResult(fakeMatch as never, bothTeams, {
    aggregateOffset: props.aggregateOffset,
  })
}

/** Put a rolled result into the fields, and stash what Save cannot carry. */
function applyRoll(watched: WatchedMatch) {
  home.value = watched.home
  away.value = watched.away
  if (watched.penHome !== undefined && watched.penAway !== undefined) {
    penHome.value = watched.penHome
    penAway.value = watched.penAway
  }
  if (props.matchId && (watched.ft || watched.stats || watched.reds)) {
    stashWatchedMatch(pendingKey(props.matchId, props.leg ?? 1), watched)
  }
  // The [home, away] watcher below clears pensRevealed on every score change
  // (including this one) to force a Save press before showing the shootout —
  // override it after that flush, since this roll already decided the
  // shootout and there is nothing left to reveal on Save.
  const decided = watched.penHome !== undefined
  nextTick(() => {
    pensRevealed.value = decided
  })
}

/* Simulate used to emit straight up to the store, which committed a result
 * the instant the button was tapped — Save never got a say. It now only
 * rolls the fields locally; nothing is written until Save is pressed. */
function simulate() {
  if (!props.homeTeam || !props.awayTeam) return
  const { result } = rollTie()
  applyRoll({
    home: result.home,
    away: result.away,
    ...(result.penHome !== undefined && result.penAway !== undefined
      ? { penHome: result.penHome, penAway: result.penAway }
      : {}),
    ...(result.ft ? { ft: result.ft } : {}),
    ...(result.reds ? { reds: result.reds } : {}),
  })
}

// ─── Watching it happen ──────────────────────────────────────────
const liveStats = ref<MatchStats | null>(null)
const liveHasExtraTime = ref(false)
const liveIsReplay = ref(false)
/** What the live window will hand back on finish. Null for a replay. */
const liveWatched = ref<WatchedMatch | null>(null)

const canWatch = computed(
  () =>
    props.canSimulate && !props.result && !!props.matchId && !!props.homeTeam && !!props.awayTeam
)
const canReplay = computed(() => !!props.result?.stats)

function statsFor(decision: KnockoutDecision): MatchStats {
  const { result } = decision
  const homeSquad = playersStore
    .byTeam(props.homeTeam!.id)
    .filter((p) => !unavailable.value.home.has(p.id))
  const awaySquad = playersStore
    .byTeam(props.awayTeam!.id)
    .filter((p) => !unavailable.value.away.has(p.id))
  return generateMatchStats({
    homeLineup: buildLineup(homeSquad, Math.random, teamFormation(props.homeTeam!)),
    awayLineup: buildLineup(awaySquad, Math.random, teamFormation(props.awayTeam!)),
    homePower: resolvePower(props.homeTeam!),
    awayPower: resolvePower(props.awayTeam!),
    homeGoals: result.home,
    awayGoals: result.away,
    ...(decision.extraTimeGoals ? { extraTime: decision.extraTimeGoals } : {}),
    ...(result.penHome !== undefined && result.penAway !== undefined
      ? { penHome: result.penHome, penAway: result.penAway }
      : {}),
    ...(decision.shootout ? { shootoutOutcome: decision.shootout } : {}),
    ...(result.reds ? { reds: result.reds } : {}),
    homeSquad,
    awaySquad,
  })
}

function watchLive() {
  if (!props.homeTeam || !props.awayTeam) return
  const decision = rollTie()
  const stats = statsFor(decision)
  const { result } = decision

  liveWatched.value = {
    home: result.home,
    away: result.away,
    ...(result.penHome !== undefined && result.penAway !== undefined
      ? { penHome: result.penHome, penAway: result.penAway }
      : {}),
    ...(result.ft ? { ft: result.ft } : {}),
    ...(result.reds ? { reds: result.reds } : {}),
    stats,
  }
  liveHasExtraTime.value = !!result.ft
  liveIsReplay.value = false
  liveStats.value = stats
}

/** A match already on record plays back from its own events — nothing is rolled. */
function replay() {
  const stats = props.result?.stats
  if (!stats) return
  liveWatched.value = null
  liveHasExtraTime.value = !!props.result?.ft
  liveIsReplay.value = true
  liveStats.value = stats
}

function closeLive() {
  liveStats.value = null
  liveWatched.value = null
}

// ─── Managing it yourself ────────────────────────────────────────
/**
 * When the user is in charge of one of these two sides, the match is his to
 * play rather than to roll. Simulating and watching stay on offer — a manager
 * is allowed not to be bothered with a dead rubber — but this is the one that
 * is actually about the outcome, so it is the one styled as the main action.
 */
const managedSide = computed<Side | null>(() => {
  const teamId = tournament.value?.manager?.teamId
  if (!teamId || props.result) return null
  if (props.homeTeam?.id === teamId) return "home"
  if (props.awayTeam?.id === teamId) return "away"
  return null
})

const canManage = computed(
  () => props.canSimulate && !!props.matchId && !!managedSide.value && !!tournament.value?.manager
)

const managing = ref(false)

/** Both squads as they will actually be available, injuries already removed. */
const managedSquads = computed(() => ({
  home: playersStore.byTeam(props.homeTeam!.id).filter((p) => !unavailable.value.home.has(p.id)),
  away: playersStore.byTeam(props.awayTeam!.id).filter((p) => !unavailable.value.away.has(p.id)),
}))

const managedTactics = computed<LiveTactics>(() => {
  const manager = tournament.value?.manager
  return {
    formation: manager?.formation ?? DEFAULT_FORMATION,
    style: manager?.style ?? DEFAULT_STYLE,
  }
})

function manage() {
  if (!canManage.value) return
  managing.value = true
}

function onManagedFinish(watched: WatchedMatch) {
  managing.value = false
  applyRoll(watched)
}

function onLiveFinish() {
  const watched = liveWatched.value
  closeLive()
  if (watched) applyRoll(watched)
}

function clear() {
  emit("clear")
  close()
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === "Enter") save()
}

/* The report describes the result that was actually committed, so it is
 * offered only for a saved score — never for digits still being typed. */
const showStats = ref(false)
const canShowStats = computed(() => !!props.result?.stats)
</script>

<template>
  <AppSheet ref="sheet" @close="onClosed" @keydown="onKeydown">
    <template #title>
      <span class="ms-title">
        {{ t("common.setResult") }}
        <span v-if="subtitle" class="ms-subtitle">{{ subtitle }}</span>
      </span>
    </template>

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
      <button
        v-if="canShowStats"
        class="ms-ghost ms-ghost--stats"
        :title="t('matchStats.title')"
        @click="showStats = true"
      >
        <ChartColumn :size="14" />
        <span>{{ t("matchStats.buttonLabel") }}</span>
      </button>
      <button v-if="canManage" class="ms-ghost ms-ghost--manage" @click="manage">
        <ClipboardList :size="14" />
        <span>{{ t("manager.match.manage") }}</span>
      </button>
      <button
        v-if="canWatch || canReplay"
        class="ms-ghost ms-ghost--live"
        @click="canReplay ? replay() : watchLive()"
      >
        <PlayCircle :size="14" />
        <span>{{ canReplay ? t("liveMatch.replay") : t("liveMatch.watch") }}</span>
      </button>
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
  </AppSheet>

  <LiveMatchModal
    v-if="liveStats"
    :home-team="homeTeam"
    :away-team="awayTeam"
    :events="liveStats.events"
    :shootout="liveStats.shootout"
    :has-extra-time="liveHasExtraTime"
    :subtitle="subtitle"
    :replay="liveIsReplay"
    @finish="onLiveFinish"
    @cancel="closeLive"
  />

  <ManagerMatchDrawer
    v-if="managing && managedSide && homeTeam && awayTeam"
    :home-team="homeTeam"
    :away-team="awayTeam"
    :home-squad="managedSquads.home"
    :away-squad="managedSquads.away"
    :managed-side="managedSide"
    :tactics="managedTactics"
    :requires-winner="requiresWinner"
    :aggregate-offset="aggregateOffset"
    :subtitle="subtitle"
    @finish="onManagedFinish"
    @cancel="managing = false"
  />

  <MatchStatsModal
    v-if="showStats && result"
    :home-team="homeTeam"
    :away-team="awayTeam"
    :result="result"
    :subtitle="subtitle"
    @close="showStats = false"
  />
</template>

<style scoped>
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
  border-radius: 0 var(--radius) var(--radius) 0;
  background: var(--bg);
}
.ms-side::before {
  content: "";
  position: absolute;
  inset-inline-start: 0;
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

/* Watching the match happen is the headline action here, so it is the one
   footer button that carries colour before it is hovered. */
.ms-ghost--live {
  color: var(--accent);
  border-color: color-mix(in srgb, var(--accent) 35%, var(--border-light));
  background: var(--accent-subtle);
}
.ms-ghost--live:hover {
  color: var(--accent);
  border-color: var(--accent);
}

/* The match the user is actually in charge of — the one action here that
   decides something rather than rolling for it. */
.ms-ghost--manage {
  color: var(--accent);
  border-color: var(--accent);
  background: var(--accent-subtle);
  font-weight: 600;
}
.ms-ghost--manage:hover {
  background: color-mix(in srgb, var(--accent) 18%, transparent);
}

@media (max-width: 600px) {
  .ms-side {
    padding: var(--sp-3) var(--sp-3) var(--sp-3) var(--sp-4);
  }
  /* Up to four ghost buttons plus cancel/save no longer fit one row, so the
     footer wraps: ghost actions on top (icon-only, evenly spread), cancel
     and save pinned full-width below. */
  .ms-footer {
    flex-wrap: wrap;
    row-gap: var(--sp-2);
  }
  .ms-ghost {
    flex: 1;
    justify-content: center;
  }
  .ms-ghost span {
    display: none;
  }
  .ms-spacer {
    display: none;
  }
  .ms-footer > button:not(.ms-ghost) {
    flex: 1;
    order: 1;
  }
}
</style>
