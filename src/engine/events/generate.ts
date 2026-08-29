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
  ShootoutKick,
  TeamMatchStats,
} from "@/modules/tournament/types"
import type { PlayerPosition } from "@/modules/players/types"
import type { Lineup, LineupSlot } from "./lineup"
import { computeRating, rollPerformance, type MatchOutcome } from "./rating"
import { generateTeamStats } from "./teamStats"
import { reconstructShootout, type ShootoutKickOutcome, type ShootoutOutcome } from "../shootout"
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
const RED_CHANCE = 0.06

const STOPPAGE_CHANCE = 0.08

/** Extra time is a third of a match, so it earns a third of the bookings. */
const EXTRA_TIME_SHARE = EXTRA_TIME_MINUTES / REGULATION_MINUTES

type Side = "home" | "away"

/** Weighted pick over lineup slots. Returns null only for an empty lineup. */
function pickSlot(
  lineup: Lineup,
  weights: Record<PlayerPosition, number>,
  rng: () => number,
  exclude?: LineupSlot
): LineupSlot | null {
  const pool = lineup.filter((slot) => slot !== exclude)
  if (!pool.length) return null

  const scores = pool.map((slot) => weights[slot.position] * (slot.power / 50))
  const total = scores.reduce((sum, s) => sum + s, 0)
  if (total <= 0) return pool[Math.floor(rng() * pool.length)]

  let roll = rng() * total
  for (let i = 0; i < pool.length; i++) {
    roll -= scores[i]
    if (roll <= 0) return pool[i]
  }
  return pool[pool.length - 1]
}

/** The designated taker: the strongest attacking slot on the pitch. */
function penaltyTaker(lineup: Lineup): LineupSlot | null {
  const takers = lineup.filter((s) => s.position === "FWD" || s.position === "MID")
  const pool = takers.length ? takers : lineup
  if (!pool.length) return null
  return pool.reduce((best, slot) => (slot.power > best.power ? slot : best))
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

/** Goal events for one side, summing to exactly `goals`. */
function buildGoals(
  side: Side,
  goals: number,
  scoringLineup: Lineup,
  concedingLineup: Lineup,
  rng: () => number,
  period: MatchPeriod = "regulation",
  allowStoppage = true
): MatchEvent[] {
  const events: MatchEvent[] = []

  for (let i = 0; i < goals; i++) {
    const roll = rng()

    if (roll < OWN_GOAL_CHANCE) {
      const slot = pickSlot(concedingLineup, OWN_GOAL_WEIGHT, rng)
      events.push({
        minute: randomMinute(rng, period, allowStoppage),
        type: "ownGoal",
        side,
        playerId: slot?.playerId ?? null,
      })
      continue
    }

    if (roll < OWN_GOAL_CHANCE + PENALTY_CHANCE) {
      const slot = penaltyTaker(scoringLineup)
      events.push({
        minute: randomMinute(rng, period, allowStoppage),
        type: "penGoal",
        side,
        playerId: slot?.playerId ?? null,
      })
      continue
    }

    const scorer = pickSlot(scoringLineup, SCORE_WEIGHT, rng)
    const assister =
      rng() < ASSIST_CHANCE
        ? pickSlot(scoringLineup, ASSIST_WEIGHT, rng, scorer ?? undefined)
        : null

    events.push({
      minute: randomMinute(rng, period, allowStoppage),
      type: "goal",
      side,
      playerId: scorer?.playerId ?? null,
      ...(assister ? { assistId: assister.playerId } : {}),
    })
  }

  return events
}

function buildCards(
  side: Side,
  lineup: Lineup,
  rng: () => number,
  hasExtraTime: boolean
): MatchEvent[] {
  const events: MatchEvent[] = []

  const book = (period: MatchPeriod, lambda: number, redChance: number) => {
    const allowStoppage = period === "extra" || !hasExtraTime
    const yellows = poisson(lambda, rng)
    for (let i = 0; i < yellows; i++) {
      const slot = pickSlot(lineup, CARD_WEIGHT, rng)
      events.push({
        minute: randomMinute(rng, period, allowStoppage),
        type: "yellow",
        side,
        playerId: slot?.playerId ?? null,
      })
    }

    if (rng() < redChance) {
      const slot = pickSlot(lineup, CARD_WEIGHT, rng)
      events.push({
        minute: randomMinute(rng, period, allowStoppage),
        type: "red",
        side,
        playerId: slot?.playerId ?? null,
      })
    }
  }

  book("regulation", YELLOW_LAMBDA, RED_CHANCE)
  // Tired legs in extra time, but a third of the time to get booked in.
  if (hasExtraTime) {
    book("extra", YELLOW_LAMBDA * EXTRA_TIME_SHARE, RED_CHANCE * EXTRA_TIME_SHARE)
  }

  return events
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
 */
function buildShootout(
  homeScored: number,
  awayScored: number,
  homeLineup: Lineup,
  awayLineup: Lineup,
  rng: () => number,
  rolled?: ShootoutOutcome
): ShootoutKick[] {
  const sequence: ShootoutKickOutcome[] =
    rolled?.kicks ??
    reconstructShootout(homeScored, awayScored, rng) ??
    legacySequence(homeScored, awayScored, rng)

  // Best takers first, then down the order, wrapping if it went long.
  function takers(lineup: Lineup): (string | null)[] {
    const ranked = [...lineup].sort((a, b) => b.power - a.power)
    return ranked.map((slot) => slot.playerId)
  }

  const order = { home: takers(homeLineup), away: takers(awayLineup) }
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
  } = input

  const team: TeamMatchStats = generateTeamStats(homePower, awayPower, homeGoals, awayGoals, rng)

  const hasExtraTime = extraTime !== undefined
  const regulation = {
    home: homeGoals - (extraTime?.home ?? 0),
    away: awayGoals - (extraTime?.away ?? 0),
  }

  const events: MatchEvent[] = [
    ...buildGoals(
      "home",
      regulation.home,
      homeLineup,
      awayLineup,
      rng,
      "regulation",
      !hasExtraTime
    ),
    ...buildGoals(
      "away",
      regulation.away,
      awayLineup,
      homeLineup,
      rng,
      "regulation",
      !hasExtraTime
    ),
    ...buildCards("home", homeLineup, rng, hasExtraTime),
    ...buildCards("away", awayLineup, rng, hasExtraTime),
  ]

  if (extraTime) {
    events.push(
      ...buildGoals("home", extraTime.home, homeLineup, awayLineup, rng, "extra"),
      ...buildGoals("away", extraTime.away, awayLineup, homeLineup, rng, "extra")
    )
  }

  // A missed penalty changes nothing on the scoreboard, which is exactly
  // why it is worth showing — the timeline reads as a match, not a list.
  if (rng() < PENALTY_MISS_CHANCE) {
    const side: Side = rng() < 0.5 ? "home" : "away"
    const slot = penaltyTaker(side === "home" ? homeLineup : awayLineup)
    events.push({
      minute:
        hasExtraTime && rng() < EXTRA_TIME_SHARE
          ? randomMinute(rng, "extra")
          : randomMinute(rng, "regulation", !hasExtraTime),
      type: "penMiss",
      side,
      playerId: slot?.playerId ?? null,
    })
  }

  events.sort((a, b) => a.minute - b.minute)

  const shootout =
    penHome !== undefined && penAway !== undefined
      ? buildShootout(penHome, penAway, homeLineup, awayLineup, rng, shootoutOutcome)
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
