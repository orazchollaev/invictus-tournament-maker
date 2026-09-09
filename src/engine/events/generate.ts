// engine/events/generate.ts
//
// Turns a final score into the match that produced it: who scored, who
// set it up, who was booked, what the keeper did. The score is the input,
// never the output — the generated goal events always add back up to the
// result already recorded, so nothing here can ever contradict a table.
//
// Own-goal convention (the one the scoreboards use): `side` is the side
// the goal *counts for*, so an own goal appears on the scoring team's row
// with the conceding team's player named on it. `PlayerMatchLine.side`, by
// contrast, is always the player's own team — and an own goal is never
// added to that player's `goals`.
import type {
  MatchEvent,
  MatchStats,
  PlayerMatchLine,
  RedCard,
  ShootoutKick,
  TeamMatchStats,
} from "@/modules/tournament/types"
import type { PlayerPosition } from "@/modules/players/types"
import type { Lineup, LineupSlot } from "./lineup"
import { computeRating, rollPerformance, type MatchOutcome } from "./rating"
import { generateTeamStats } from "./teamStats"
import { reconstructShootout, type ShootoutKickOutcome, type ShootoutOutcome } from "../shootout"
import { RED_CHANCE } from "../discipline"
import {
  MAX_STOPPAGE,
  PERIOD_END,
  PERIOD_START,
  EXTRA_TIME_MINUTES,
  REGULATION_MINUTES,
  type MatchPeriod,
} from "../periods"

/** How likely a slot is to be the one that scores, before power weighting. */
const SCORE_WEIGHT: Record<PlayerPosition, number> = { GK: 0.02, DEF: 0.2, MID: 0.55, FWD: 1.0 }
const ASSIST_WEIGHT: Record<PlayerPosition, number> = { GK: 0.05, DEF: 0.35, MID: 1.0, FWD: 0.7 }
const CARD_WEIGHT: Record<PlayerPosition, number> = { GK: 0.15, DEF: 1.0, MID: 0.9, FWD: 0.6 }
/** Own goals come off a defender's boot far more often than anyone else's. */
const OWN_GOAL_WEIGHT: Record<PlayerPosition, number> = { GK: 0.3, DEF: 1.0, MID: 0.25, FWD: 0.05 }

const OWN_GOAL_CHANCE = 0.02
const PENALTY_CHANCE = 0.08
const ASSIST_CHANCE = 0.7
const PENALTY_MISS_CHANCE = 0.05

const YELLOW_LAMBDA = 2.2

const STOPPAGE_CHANCE = 0.08

/** Extra time is a third of a match, so it earns a third of the bookings. */
const EXTRA_TIME_SHARE = EXTRA_TIME_MINUTES / REGULATION_MINUTES

type Side = "home" | "away"

/**
 * A slot that has left the field, and when.
 *
 * Kept as the slot itself rather than a player id: a short squad fields
 * several anonymous "Unknown Player" slots, all with a null id, and sending
 * one off must not take the other ten off with it.
 */
interface Dismissal {
  slot: LineupSlot
  minute: number
}

/** One side's eleven, plus whoever has already been sent off. */
interface SideState {
  lineup: Lineup
  dismissals: Dismissal[]
}

/**
 * Who is still on the pitch in a given minute.
 *
 * A dismissal in the same minute counts as already gone — "sent off 63',
 * scored 63'" is exactly the contradiction this exists to prevent, and the
 * one minute it costs a legitimate goal is not worth the confusion.
 */
function onPitch(state: SideState, minute: number): Lineup {
  if (!state.dismissals.length) return state.lineup
  const off = new Set(state.dismissals.filter((d) => d.minute <= minute).map((d) => d.slot))
  return off.size ? state.lineup.filter((slot) => !off.has(slot)) : state.lineup
}

/** Weighted pick over lineup slots. Returns null only for an empty pool. */
function pickSlot(
  pool: Lineup,
  weights: Record<PlayerPosition, number>,
  rng: () => number,
  exclude?: LineupSlot
): LineupSlot | null {
  const candidates = pool.filter((slot) => slot !== exclude)
  if (!candidates.length) return null

  const scores = candidates.map((slot) => weights[slot.position] * (slot.power / 50))
  const total = scores.reduce((sum, s) => sum + s, 0)
  if (total <= 0) return candidates[Math.floor(rng() * candidates.length)]

  let roll = rng() * total
  for (let i = 0; i < candidates.length; i++) {
    roll -= scores[i]
    if (roll <= 0) return candidates[i]
  }
  return candidates[candidates.length - 1]
}

/** The designated taker: the strongest attacking slot still on the pitch. */
function penaltyTaker(pool: Lineup): LineupSlot | null {
  const takers = pool.filter((s) => s.position === "FWD" || s.position === "MID")
  const candidates = takers.length ? takers : pool
  if (!candidates.length) return null
  return candidates.reduce((best, slot) => (slot.power > best.power ? slot : best))
}

function poisson(lambda: number, rng: () => number): number {
  const limit = Math.exp(-lambda)
  let k = 0
  let p = 1
  do {
    k++
    p *= rng()
  } while (p > limit)
  return k - 1
}

/**
 * A minute inside a period. Stoppage runs past the period's scheduled end,
 * which is why "90+3" and "120+1" both come out of the same rule.
 *
 * `allowStoppage` exists because a minute is a plain number, with no period
 * stored alongside it: 93 has to mean either "90+3" or "the third minute of
 * extra time", and it cannot mean both. So a match that goes to extra time
 * gives up its ninetieth-minute stoppage rather than its readability, and
 * every minute above 90 in such a match is unambiguously extra time.
 */
function randomMinute(
  rng: () => number,
  period: MatchPeriod = "regulation",
  allowStoppage = true
): number {
  const end = PERIOD_END[period]
  if (allowStoppage && rng() < STOPPAGE_CHANCE) {
    return end + 1 + Math.floor(rng() * MAX_STOPPAGE[period])
  }
  const start = PERIOD_START[period]
  return start + Math.floor(rng() * (end - start + 1))
}

interface GoalsInput {
  side: Side
  goals: number
  scoring: SideState
  conceding: SideState
  period: MatchPeriod
  allowStoppage: boolean
}

/**
 * Goal events for one side, summing to exactly `goals`.
 *
 * The minute is settled before the player is, because who is available to
 * score depends on it: a man sent off in the 30th cannot be the one who
 * scores in the 70th, and neither can he put one through his own net.
 */
function buildGoals(input: GoalsInput, rng: () => number): MatchEvent[] {
  const { side, goals, scoring, conceding, period, allowStoppage } = input
  const events: MatchEvent[] = []

  for (let i = 0; i < goals; i++) {
    const roll = rng()
    const minute = randomMinute(rng, period, allowStoppage)

    if (roll < OWN_GOAL_CHANCE) {
      const slot = pickSlot(onPitch(conceding, minute), OWN_GOAL_WEIGHT, rng)
      events.push({ minute, type: "ownGoal", side, playerId: slot?.playerId ?? null })
      continue
    }

    const attackers = onPitch(scoring, minute)

    if (roll < OWN_GOAL_CHANCE + PENALTY_CHANCE) {
      const slot = penaltyTaker(attackers)
      events.push({ minute, type: "penGoal", side, playerId: slot?.playerId ?? null })
      continue
    }

    const scorer = pickSlot(attackers, SCORE_WEIGHT, rng)
    const assister =
      rng() < ASSIST_CHANCE ? pickSlot(attackers, ASSIST_WEIGHT, rng, scorer ?? undefined) : null

    events.push({
      minute,
      type: "goal",
      side,
      playerId: scorer?.playerId ?? null,
      ...(assister ? { assistId: assister.playerId } : {}),
    })
  }

  return events
}

/**
 * Bookings for one side, and the state the rest of the match is written
 * against — every dismissal the timeline contains, with the slot it fell on.
 *
 * `forcedReds` are the dismissals the simulator already rolled and priced
 * into the scoreline (see engine/discipline.ts). When they are given, the
 * regulation red is not rolled again — replaying them here is what keeps the
 * timeline and the score describing the same match. Extra-time reds are
 * always rolled: nothing has been simulated for them to contradict.
 *
 * The reds are placed before the yellows even though they are announced
 * later in the match, because a man already sent off cannot be booked again.
 */
function buildCards(
  side: Side,
  lineup: Lineup,
  rng: () => number,
  hasExtraTime: boolean,
  forcedReds?: RedCard[]
): { events: MatchEvent[]; state: SideState } {
  const events: MatchEvent[] = []
  const state: SideState = { lineup, dismissals: [] }
  const mine = forcedReds?.filter((r) => r.side === side)

  const sendOff = (minute: number) => {
    const slot = pickSlot(onPitch(state, minute), CARD_WEIGHT, rng)
    events.push({ minute, type: "red", side, playerId: slot?.playerId ?? null })
    if (slot) state.dismissals.push({ slot, minute })
  }

  const book = (period: MatchPeriod, lambda: number, redChance: number | null) => {
    const allowStoppage = period === "extra" || !hasExtraTime

    if (redChance !== null && rng() < redChance) sendOff(randomMinute(rng, period, allowStoppage))

    const yellows = poisson(lambda, rng)
    for (let i = 0; i < yellows; i++) {
      const minute = randomMinute(rng, period, allowStoppage)
      const slot = pickSlot(onPitch(state, minute), CARD_WEIGHT, rng)
      events.push({ minute, type: "yellow", side, playerId: slot?.playerId ?? null })
    }
  }

  // The forced reds go on first, so the bookings around them see the gap.
  for (const red of mine ?? []) sendOff(red.minute)
  book("regulation", YELLOW_LAMBDA, mine ? null : RED_CHANCE)

  // Tired legs in extra time, but a third of the time to get booked in.
  if (hasExtraTime) {
    book("extra", YELLOW_LAMBDA * EXTRA_TIME_SHARE, RED_CHANCE * EXTRA_TIME_SHARE)
  }

  return { events, state }
}

/**
 * Name the takers for a shootout.
 *
 * The sequence itself comes from the engine — either the one that was
 * actually rolled (passed straight through, so the kicks on screen are the
 * kicks that decided the tie) or one rebuilt from the totals for a result
 * that predates the kick-level model or was typed in by hand.
 *
 * Only when even a rebuild is impossible — a total no legal shootout could
 * produce, which pre-v2.4.0 data can contain — does it fall back to dealing
 * five kicks a side at random. That is the old behaviour, kept for the old
 * data it belongs to.
 *
 * Kicks are taken by whoever finished the match. A player sent off during it
 * takes no part in the shootout, which is also why a side can arrive at the
 * spot with fewer than eleven takers.
 */
function buildShootout(
  homeScored: number,
  awayScored: number,
  home: SideState,
  away: SideState,
  rng: () => number,
  rolled?: ShootoutOutcome
): ShootoutKick[] {
  const sequence: ShootoutKickOutcome[] =
    rolled?.kicks ??
    reconstructShootout(homeScored, awayScored, rng) ??
    legacySequence(homeScored, awayScored, rng)

  // Best takers first, then down the order, wrapping if it went long.
  function takers(state: SideState): (string | null)[] {
    // Every dismissal in the match counts, stoppage-time ones included.
    const ranked = [...onPitch(state, Infinity)].sort((a, b) => b.power - a.power)
    return ranked.map((slot) => slot.playerId)
  }

  const order = { home: takers(home), away: takers(away) }
  const taken = { home: 0, away: 0 }

  return sequence.map((kick, index) => {
    const pool = order[kick.side]
    const playerId = pool.length ? pool[taken[kick.side]++ % pool.length] : null
    return { order: index + 1, side: kick.side, playerId, scored: kick.scored }
  })
}

/** Five kicks a side, makes dealt at random — only for totals nothing else explains. */
function legacySequence(
  homeScored: number,
  awayScored: number,
  rng: () => number
): ShootoutKickOutcome[] {
  const rounds = Math.max(5, homeScored, awayScored)

  function outcomes(scored: number): boolean[] {
    const set = Array.from({ length: rounds }, (_, i) => i < scored)
    for (let i = set.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1))
      ;[set[i], set[j]] = [set[j], set[i]]
    }
    return set
  }

  const home = outcomes(homeScored)
  const away = outcomes(awayScored)

  const kicks: ShootoutKickOutcome[] = []
  for (let round = 0; round < rounds; round++) {
    kicks.push({ side: "home", scored: home[round] })
    kicks.push({ side: "away", scored: away[round] })
  }
  return kicks
}

function outcomeFor(goalsFor: number, goalsAgainst: number): MatchOutcome {
  if (goalsFor === goalsAgainst) return "draw"
  return goalsFor > goalsAgainst ? "win" : "loss"
}

/** Aggregate a side's events into one line per slot, then rate each one. */
function buildLines(
  side: Side,
  lineup: Lineup,
  events: MatchEvent[],
  goalsFor: number,
  goalsAgainst: number,
  opponentOnTarget: number,
  rng: () => number
): PlayerMatchLine[] {
  const outcome = outcomeFor(goalsFor, goalsAgainst)
  const cleanSheet = goalsAgainst === 0
  // Shots the keeper stopped: everything on target that did not go in.
  const saves = Math.max(0, opponentOnTarget - goalsAgainst)
  // Measured against his own eleven, so a weak player in a weak side is
  // rated on his afternoon rather than on the league table.
  const squadPower = lineup.reduce((sum, slot) => sum + slot.power, 0) / lineup.length

  return lineup.map((slot) => {
    const mine = (e: MatchEvent) => slot.playerId !== null && e.playerId === slot.playerId

    // Own goals credit the opposing side, so they are matched by player
    // rather than by side — and never counted as one of his goals.
    const goals = events.filter(
      (e) => e.side === side && (e.type === "goal" || e.type === "penGoal") && mine(e)
    ).length
    const assists = events.filter(
      (e) => e.side === side && slot.playerId !== null && e.assistId === slot.playerId
    ).length
    const yellow = events.filter((e) => e.type === "yellow" && e.side === side && mine(e)).length
    const red = events.filter((e) => e.type === "red" && e.side === side && mine(e)).length

    const isKeeper = slot.position === "GK"

    return {
      playerId: slot.playerId,
      side,
      position: slot.position,
      goals,
      assists,
      yellow,
      red,
      ...(isKeeper ? { saves, conceded: goalsAgainst } : {}),
      ...(slot.position === "GK" || slot.position === "DEF" ? { cleanSheet } : {}),
      rating: computeRating({
        position: slot.position,
        outcome,
        goals,
        assists,
        cleanSheet,
        performance: rollPerformance(rng),
        power: slot.power,
        squadPower,
        ...(isKeeper ? { saves, conceded: goalsAgainst } : {}),
      }),
    }
  })
}

export interface GenerateMatchStatsInput {
  homeLineup: Lineup
  awayLineup: Lineup
  homePower: number
  awayPower: number
  /** Final score, extra-time goals included. */
  homeGoals: number
  awayGoals: number
  /**
   * Goals scored in 91-120, already counted in `homeGoals`/`awayGoals`.
   * Present means the tie went to extra time — even at 0-0, which still
   * stretches the timeline to 120 and is worth showing.
   */
  extraTime?: { home: number; away: number }
  /** Shootout tally, when the tie needed one. */
  penHome?: number
  penAway?: number
  /** The shootout as it was actually rolled, when the caller has it. */
  shootoutOutcome?: ShootoutOutcome
  /**
   * Dismissals the simulator already priced into the score. Present means
   * "these are the reds, do not roll any of your own" — even when empty.
   */
  reds?: RedCard[]
}

export function generateMatchStats(
  input: GenerateMatchStatsInput,
  rng: () => number = Math.random
): MatchStats {
  const {
    homeLineup,
    awayLineup,
    homePower,
    awayPower,
    homeGoals,
    awayGoals,
    extraTime,
    penHome,
    penAway,
    shootoutOutcome,
    reds,
  } = input

  const team: TeamMatchStats = generateTeamStats(homePower, awayPower, homeGoals, awayGoals, rng)

  const hasExtraTime = extraTime !== undefined
  const regulation = {
    home: homeGoals - (extraTime?.home ?? 0),
    away: awayGoals - (extraTime?.away ?? 0),
  }

  // The cards come first: everything after them has to know who is still on
  // the pitch, so that nobody scores, assists or takes a kick after being
  // sent off. The timeline is sorted by minute at the end, so generating out
  // of chronological order costs nothing.
  const home = buildCards("home", homeLineup, rng, hasExtraTime, reds)
  const away = buildCards("away", awayLineup, rng, hasExtraTime, reds)

  const events: MatchEvent[] = [
    ...home.events,
    ...away.events,
    ...buildGoals(
      {
        side: "home",
        goals: regulation.home,
        scoring: home.state,
        conceding: away.state,
        period: "regulation",
        allowStoppage: !hasExtraTime,
      },
      rng
    ),
    ...buildGoals(
      {
        side: "away",
        goals: regulation.away,
        scoring: away.state,
        conceding: home.state,
        period: "regulation",
        allowStoppage: !hasExtraTime,
      },
      rng
    ),
  ]

  if (extraTime) {
    events.push(
      ...buildGoals(
        {
          side: "home",
          goals: extraTime.home,
          scoring: home.state,
          conceding: away.state,
          period: "extra",
          allowStoppage: true,
        },
        rng
      ),
      ...buildGoals(
        {
          side: "away",
          goals: extraTime.away,
          scoring: away.state,
          conceding: home.state,
          period: "extra",
          allowStoppage: true,
        },
        rng
      )
    )
  }

  // A missed penalty changes nothing on the scoreboard, which is exactly
  // why it is worth showing — the timeline reads as a match, not a list.
  if (rng() < PENALTY_MISS_CHANCE) {
    const side: Side = rng() < 0.5 ? "home" : "away"
    const minute =
      hasExtraTime && rng() < EXTRA_TIME_SHARE
        ? randomMinute(rng, "extra")
        : randomMinute(rng, "regulation", !hasExtraTime)
    const slot = penaltyTaker(onPitch(side === "home" ? home.state : away.state, minute))
    events.push({ minute, type: "penMiss", side, playerId: slot?.playerId ?? null })
  }

  events.sort((a, b) => a.minute - b.minute)

  const shootout =
    penHome !== undefined && penAway !== undefined
      ? buildShootout(penHome, penAway, home.state, away.state, rng, shootoutOutcome)
      : undefined

  return {
    events,
    lines: [
      ...buildLines("home", homeLineup, events, homeGoals, awayGoals, team.onTarget[1], rng),
      ...buildLines("away", awayLineup, events, awayGoals, homeGoals, team.onTarget[0], rng),
    ],
    team,
    ...(shootout ? { shootout } : {}),
  }
}
