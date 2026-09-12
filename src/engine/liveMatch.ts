// engine/liveMatch.ts
//
// A match played forward, a minute at a time.
//
// This exists because the match the user *manages* cannot be decided in
// advance. engine/events/generate.ts works the other way round — it is given
// a final score and reconstructs a plausible match that produced it — which
// is exactly right for a result that has already been simulated, and exactly
// wrong for one whose outcome is still open. `useLiveMatch` replays such a
// reconstruction; nothing the viewer does can change it, and nothing should.
//
// So the manager gets this instead. Every minute it re-reads the current
// eleven and the current instructions, so a substitution or a switch to
// attacking takes effect on the very next minute and never rewrites a minute
// already on screen.
//
// It stays honest with the bulk simulator by sharing the model rather than
// copying it: the goal rates come from `matchLambdas` in simulation.ts, the
// scorer/assist/card weightings and the report assembler come from
// events/generate.ts. Only the *pacing* is new.
import type { Player } from "@/modules/players/types"
import type { Formation, PlayStyle, Team } from "@/modules/teams/types"
import type { MatchEvent, MatchResult, MatchStats, RedCard } from "@/modules/tournament/types"
import {
  LINEUP_SIZE,
  UNKNOWN_POWER,
  buildLineup,
  slotPower,
  type LineupSlot,
} from "./events/lineup"
import {
  ASSIST_CHANCE,
  ASSIST_WEIGHT,
  CARD_WEIGHT,
  OWN_GOAL_CHANCE,
  OWN_GOAL_WEIGHT,
  PENALTY_CHANCE,
  PENALTY_MISS_CHANCE,
  SCORE_WEIGHT,
  YELLOW_LAMBDA,
  assembleMatchStats,
  onPitch,
  penaltyTaker,
  pickSlot,
  type SideState,
} from "./events/generate"
import { RED_CHANCE, RED_IN_MATCH_POWER_COST } from "./discipline"
import { INJURY_CHANCE, rollInjuryDuration } from "./injuries"
import { isInjuriesEnabled, isRedCardImpactEnabled, matchLambdas, penaltyRate } from "./simulation"
import { resolvePower } from "./power"
import { rollShootout, type ShootoutOutcome } from "./shootout"
import { DEFAULT_STYLE, aiStyleFor, tacticsProfile, teamFormation } from "./tactics"
import { FULL_TIME_MINUTES, REGULATION_MINUTES } from "./periods"

export type Side = "home" | "away"

export interface LiveTactics {
  formation: Formation
  style: PlayStyle
}

/** Five, the modern allowance. Applies to both benches. */
export const MAX_SUBSTITUTIONS = 5

/** How much of a swing the eleven on the pitch is worth, against the eleven that started. */
const LINEUP_DELTA_WEIGHT = 0.5
const MAX_LINEUP_DELTA = 15

/** Earliest minute a dismissal is rolled for, matching engine/discipline.ts. */
const RED_MIN_MINUTE = 15

/** The AI bench makes its changes in this window, and only this many of them. */
const AI_SUB_MIN_MINUTE = 55
const AI_SUB_MAX_MINUTE = 85
const AI_MAX_SUBS = 3

export interface LiveSide {
  teamId: string
  /** The squad rating plus the coach's own, fixed at kick-off. */
  basePower: number
  /** Lineup, substitutions and dismissals — the shape the report assembler wants. */
  state: SideState
  squad: Player[]
  tactics: LiveTactics
  /** His own rating, so a tactics switch keeps the manager's ability. */
  coachPower?: number
  /** The instruction the coach set out with, which the AI deviates from. */
  baseStyle: PlayStyle
  subsUsed: number
  /** Mean power of the eleven that started — the yardstick changes are measured against. */
  kickoffPower: number
  /** True for the side the user is managing: the AI leaves it alone. */
  managed: boolean
  /** Minutes the AI bench has earmarked for a change. */
  aiSubMinutes: number[]
}

export interface LiveMatchState {
  minute: number
  home: LiveSide
  away: LiveSide
  score: { home: number; away: number }
  /** The score at 90', set only once the tie goes past it. */
  ft?: { home: number; away: number }
  events: MatchEvent[]
  reds: RedCard[]
  shootout?: ShootoutOutcome
  requiresWinner: boolean
  aggregateOffset: { home: number; away: number } | null
  /** True once the match is known to be going to 120. */
  extraTime: boolean
  finished: boolean
  /**
   * The kind of afternoon it is, drawn once at kick-off.
   *
   * `matchLambdas` rolls a tempo factor per call. Calling it every minute
   * would average that factor away and leave every match the same texture,
   * so the roll is made once and fed back in.
   */
  tempoRoll: number
}

export interface CreateLiveMatchInput {
  homeTeam: Team
  awayTeam: Team
  homeSquad: Player[]
  awaySquad: Player[]
  /** The side the user manages. The other one is run by `decideAiTactics`. */
  managedSide?: Side | null
  /** The user's own instructions, overriding the club's coach for this match. */
  managedTactics?: LiveTactics | null
  requiresWinner?: boolean
  /** Leg 2 of a tie: the first leg's score, in this match's home/away frame. */
  aggregateOffset?: { home: number; away: number } | null
}

export function createLiveMatch(
  input: CreateLiveMatchInput,
  rng: () => number = Math.random
): LiveMatchState {
  const managedSide = input.managedSide ?? null

  const buildSide = (team: Team, squad: Player[], which: Side): LiveSide => {
    const managed = managedSide === which
    const tactics: LiveTactics =
      managed && input.managedTactics
        ? { ...input.managedTactics }
        : { formation: teamFormation(team), style: team.coach?.style ?? DEFAULT_STYLE }
    const lineup = buildLineup(squad, rng, tactics.formation)
    return {
      teamId: team.id,
      basePower: resolvePower(team) + tacticsProfile(tactics, team.coach?.power).powerBonus,
      state: { lineup, dismissals: [], subs: [] },
      squad,
      tactics,
      ...(team.coach ? { coachPower: team.coach.power } : {}),
      baseStyle: tactics.style,
      subsUsed: 0,
      kickoffPower: meanPower(lineup),
      managed,
      aiSubMinutes: managed ? [] : planAiSubs(rng),
    }
  }

  return {
    minute: 0,
    home: buildSide(input.homeTeam, input.homeSquad, "home"),
    away: buildSide(input.awayTeam, input.awaySquad, "away"),
    score: { home: 0, away: 0 },
    events: [],
    reds: [],
    requiresWinner: input.requiresWinner ?? false,
    aggregateOffset: input.aggregateOffset ?? null,
    extraTime: false,
    finished: false,
    tempoRoll: rng(),
  }
}

/** The last minute this match can run to, as things currently stand. */
export function endMinute(state: LiveMatchState): number {
  return state.extraTime ? FULL_TIME_MINUTES : REGULATION_MINUTES
}

/**
 * Play the next minute.
 *
 * Returns only the events that happened in it, so the caller can hold the
 * clock on a goal without re-scanning the whole timeline. They are appended
 * to `state.events` either way.
 */
export function advanceMinute(
  state: LiveMatchState,
  rng: () => number = Math.random
): MatchEvent[] {
  if (state.finished) return []

  state.minute++
  const fresh: MatchEvent[] = []

  for (const which of ["home", "away"] as const) {
    if (!state[which].managed) decideAiTactics(state, which)
    fresh.push(...aiSubstitutionIfDue(state, which))
    fresh.push(...rollDiscipline(state, which, rng))
    fresh.push(...rollInjury(state, which, rng))
  }

  const rates = currentLambdas(state)
  for (const which of ["home", "away"] as const) {
    if (rng() < goalChance(rates[which])) fresh.push(...rollGoal(state, which, rng))
  }

  state.events.push(...fresh)
  advanceStage(state, rng)
  return fresh
}

/** Play the rest out without stopping — the "skip" button, and how tests run a match. */
export function playToEnd(state: LiveMatchState, rng: () => number = Math.random): void {
  let guard = 0
  while (!state.finished && guard++ <= FULL_TIME_MINUTES + 1) advanceMinute(state, rng)
}

/**
 * The user (or the AI) changing how a side is set up. Takes effect from the
 * next minute — the one being played has already happened.
 */
export function setTactics(
  state: LiveMatchState,
  which: Side,
  tactics: Partial<LiveTactics>
): void {
  const side = state[which]
  side.tactics = { ...side.tactics, ...tactics }
}

/** What the bench does on its own. Never applied to the side the user manages. */
export function decideAiTactics(state: LiveMatchState, which: Side): void {
  const side = state[which]
  if (side.managed) return
  setTactics(state, which, {
    style: aiStyleFor(side.baseStyle, goalDiff(state, which), state.minute),
  })
}

/** Who is on the bench, in the minute being played. */
export function benchFor(state: LiveMatchState, which: Side): Player[] {
  const side = state[which]
  const used = new Set<string>()
  for (const slot of side.state.lineup) if (slot.playerId) used.add(slot.playerId)
  for (const sub of side.state.subs) if (sub.inSlot.playerId) used.add(sub.inSlot.playerId)
  return side.squad.filter((p) => !used.has(p.id))
}

/** The eleven currently out there, for the manager's own list. */
export function onPitchFor(state: LiveMatchState, which: Side): LineupSlot[] {
  return onPitch(state[which].state, state.minute)
}

/**
 * Make a change. Returns false when it cannot be made — no changes left, the
 * man is already off, or the replacement is not actually on the bench.
 */
export function applySubstitution(
  state: LiveMatchState,
  which: Side,
  outSlot: LineupSlot,
  inPlayer: Player,
  reason: "tactical" | "injury" = "tactical",
  injuryMatches?: number
): MatchEvent | null {
  const side = state[which]
  if (side.subsUsed >= MAX_SUBSTITUTIONS) return null
  if (!onPitch(side.state, state.minute).includes(outSlot)) return null
  if (!benchFor(state, which).some((p) => p.id === inPlayer.id)) return null

  const minute = Math.max(1, state.minute)
  const inSlot: LineupSlot = {
    playerId: inPlayer.id,
    position: outSlot.position,
    power: slotPower(inPlayer, outSlot.position),
  }
  side.state.subs.push({
    outSlot,
    inSlot,
    minute,
    reason,
    ...(injuryMatches ? { injuryMatches } : {}),
  })
  side.subsUsed++

  const event: MatchEvent = {
    minute,
    type: "sub",
    side: which,
    playerId: inSlot.playerId,
    assistId: outSlot.playerId,
  }
  // A change the user makes between minutes is its own event; one made during
  // `advanceMinute` is returned to the caller and appended with the rest.
  if (!state.events.includes(event)) state.events.push(event)
  return event
}

/**
 * The finished article: the result to commit and the report to store.
 *
 * Nothing is rolled here that changes the outcome — the score, the timeline
 * and the shootout are all already settled. The assembler only works out what
 * they add up to, using exactly the same code a bulk-simulated match does.
 */
export function finishLiveMatch(
  state: LiveMatchState,
  rng: () => number = Math.random
): { result: MatchResult; stats: MatchStats } {
  const { score, ft, shootout, reds } = state

  const result: MatchResult = {
    home: score.home,
    away: score.away,
    ...(ft ? { ft: { ...ft } } : {}),
    ...(shootout ? { penHome: shootout.penHome, penAway: shootout.penAway } : {}),
    ...(reds.length ? { reds: reds.map((r) => ({ ...r })) } : {}),
  }

  const stats = assembleMatchStats(
    {
      home: state.home.state,
      away: state.away.state,
      homePower: state.home.basePower,
      awayPower: state.away.basePower,
      homeGoals: score.home,
      awayGoals: score.away,
      events: state.events,
      hasExtraTime: state.extraTime,
      ...(shootout
        ? { penHome: shootout.penHome, penAway: shootout.penAway, shootoutOutcome: shootout }
        : {}),
    },
    rng
  )

  return { result, stats }
}

// ─── Internals ───────────────────────────────────────────────────

/**
 * What each side is worth right now.
 *
 * Three parts: the rating it started with, what the eleven currently on the
 * pitch is worth against the eleven that started it, and the cost of being a
 * man short. A weak player sent off therefore hurts less than a good one —
 * the man-down cost is flat, but the mean it is applied to goes up.
 */
function currentPower(state: LiveMatchState, which: Side): number {
  const side = state[which]
  const pitch = onPitch(side.state, state.minute)
  const delta = clamp(
    (meanPower(pitch) - side.kickoffPower) * LINEUP_DELTA_WEIGHT,
    -MAX_LINEUP_DELTA,
    MAX_LINEUP_DELTA
  )
  const missing = Math.max(0, LINEUP_SIZE - pitch.length)
  const manDown = isRedCardImpactEnabled() ? missing * RED_IN_MATCH_POWER_COST : 0
  return Math.max(1, side.basePower + delta - manDown)
}

/** One minute's worth of goal rate for each side, at the current settings. */
function currentLambdas(state: LiveMatchState): { home: number; away: number } {
  const { home, away } = matchLambdas(currentPower(state, "home"), currentPower(state, "away"), {
    tactics: {
      home: tacticsProfile(state.home.tactics, state.home.coachPower),
      away: tacticsProfile(state.away.tactics, state.away.coachPower),
    },
    minutes: 1,
    rng: () => state.tempoRoll,
  })
  return { home: Math.max(0, home), away: Math.max(0, away) }
}

/** A rate of `lambda` goals in this minute, as the chance of at least one. */
function goalChance(lambda: number): number {
  return 1 - Math.exp(-lambda)
}

function rollGoal(state: LiveMatchState, which: Side, rng: () => number): MatchEvent[] {
  const minute = state.minute
  const scoring = state[which].state
  const conceding = state[which === "home" ? "away" : "home"].state

  state.score[which]++

  if (rng() < OWN_GOAL_CHANCE) {
    const slot = pickSlot(onPitch(conceding, minute), OWN_GOAL_WEIGHT, rng)
    return [{ minute, type: "ownGoal", side: which, playerId: slot?.playerId ?? null }]
  }

  const pitch = onPitch(scoring, minute)
  if (rng() < PENALTY_CHANCE) {
    const slot = penaltyTaker(pitch)
    return [{ minute, type: "penGoal", side: which, playerId: slot?.playerId ?? null }]
  }

  const scorer = pickSlot(pitch, SCORE_WEIGHT, rng)
  const assist =
    rng() < ASSIST_CHANCE ? pickSlot(pitch, ASSIST_WEIGHT, rng, scorer ?? undefined) : null
  return [
    {
      minute,
      type: "goal",
      side: which,
      playerId: scorer?.playerId ?? null,
      ...(assist ? { assistId: assist.playerId } : {}),
    },
  ]
}

/** Bookings and sendings-off, at the per-match rates spread over ninety minutes. */
function rollDiscipline(state: LiveMatchState, which: Side, rng: () => number): MatchEvent[] {
  const minute = state.minute
  const events: MatchEvent[] = []
  const pitch = onPitch(state[which].state, minute)
  if (!pitch.length) return events

  if (rng() < YELLOW_LAMBDA / REGULATION_MINUTES) {
    const slot = pickSlot(pitch, CARD_WEIGHT, rng)
    events.push({ minute, type: "yellow", side: which, playerId: slot?.playerId ?? null })
  }

  // A red is rolled at the same rate the bulk simulator uses, and costs the
  // side the same power — the difference is only that here it is felt from
  // the next minute rather than priced in before kick-off.
  if (
    minute >= RED_MIN_MINUTE &&
    minute <= REGULATION_MINUTES &&
    rng() < RED_CHANCE / REGULATION_MINUTES
  ) {
    const slot = pickSlot(pitch, CARD_WEIGHT, rng)
    if (slot) {
      state[which].state.dismissals.push({ slot, minute })
      state.reds.push({ side: which, minute })
      events.push({ minute, type: "red", side: which, playerId: slot.playerId })
    }
  }

  // A penalty that goes begging: nothing on the scoreboard, but it is the
  // kind of minute a match is remembered for.
  if (rng() < PENALTY_MISS_CHANCE / REGULATION_MINUTES) {
    const slot = penaltyTaker(pitch)
    events.push({ minute, type: "penMiss", side: which, playerId: slot?.playerId ?? null })
  }

  return events
}

/** A player hurt badly enough to come off, when injuries are switched on. */
function rollInjury(state: LiveMatchState, which: Side, rng: () => number): MatchEvent[] {
  if (!isInjuriesEnabled()) return []
  if (rng() >= INJURY_CHANCE / REGULATION_MINUTES) return []

  const pitch = onPitch(state[which].state, state.minute)
  const slot = pickSlot(pitch, CARD_WEIGHT, rng)
  const bench = benchFor(state, which)
  if (!slot || !bench.length) return []

  const replacement = bench[Math.floor(rng() * bench.length)]
  const event = applySubstitution(
    state,
    which,
    slot,
    replacement,
    "injury",
    rollInjuryDuration(rng)
  )
  return event ? popEvent(state, event) : []
}

/** The AI bench, working to a plan it drew up before kick-off. */
function aiSubstitutionIfDue(state: LiveMatchState, which: Side): MatchEvent[] {
  const side = state[which]
  if (side.managed || !side.aiSubMinutes.includes(state.minute)) return []

  const pitch = onPitch(side.state, state.minute)
  const bench = benchFor(state, which)
  if (!bench.length || !pitch.length) return []

  // Off comes the weakest man on the pitch, on comes the best replacement for
  // his position — the change a manager makes without thinking about it.
  const outSlot = pitch.reduce((worst, slot) => (slot.power < worst.power ? slot : worst))
  const inPlayer = bench.reduce((best, p) =>
    slotPower(p, outSlot.position) > slotPower(best, outSlot.position) ? p : best
  )
  if (slotPower(inPlayer, outSlot.position) <= outSlot.power) return []

  const event = applySubstitution(state, which, outSlot, inPlayer, "tactical")
  return event ? popEvent(state, event) : []
}

/**
 * Take an event back off `state.events` so the caller can return it with the
 * rest of the minute's. `applySubstitution` is public and has to record its
 * own event for a change made between minutes; inside `advanceMinute` the
 * events are collected and appended together.
 */
function popEvent(state: LiveMatchState, event: MatchEvent): MatchEvent[] {
  const index = state.events.lastIndexOf(event)
  if (index >= 0) state.events.splice(index, 1)
  return [event]
}

function planAiSubs(rng: () => number): number[] {
  const count = 1 + Math.floor(rng() * AI_MAX_SUBS)
  const minutes = new Set<number>()
  const span = AI_SUB_MAX_MINUTE - AI_SUB_MIN_MINUTE + 1
  for (let i = 0; i < count; i++) minutes.add(AI_SUB_MIN_MINUTE + Math.floor(rng() * span))
  return [...minutes].sort((a, b) => a - b)
}

/**
 * Whether the whistle goes, and what happens next if it does not.
 *
 * Extra time and the shootout follow the same rule `decideKnockoutResult`
 * applies to a simulated tie — level after ninety only matters where a winner
 * is required, and on aggregate when there is a first leg to count.
 */
function advanceStage(state: LiveMatchState, rng: () => number): void {
  if (state.extraTime) {
    if (state.minute < FULL_TIME_MINUTES) return
    if (isLevel(state)) {
      state.shootout = rollShootout(
        penaltyRate(currentPower(state, "home")),
        penaltyRate(currentPower(state, "away")),
        rng
      )
    }
    state.finished = true
    return
  }

  if (state.minute < REGULATION_MINUTES) return

  if (state.requiresWinner && isLevel(state)) {
    state.ft = { ...state.score }
    state.extraTime = true
    return
  }
  state.finished = true
}

function isLevel(state: LiveMatchState): boolean {
  const offset = state.aggregateOffset
  const home = state.score.home + (offset?.home ?? 0)
  const away = state.score.away + (offset?.away ?? 0)
  return home === away
}

function goalDiff(state: LiveMatchState, which: Side): number {
  return which === "home"
    ? state.score.home - state.score.away
    : state.score.away - state.score.home
}

function meanPower(slots: LineupSlot[]): number {
  if (!slots.length) return UNKNOWN_POWER
  return slots.reduce((sum, slot) => sum + slot.power, 0) / slots.length
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
