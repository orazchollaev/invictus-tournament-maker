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

const REGULATION_MINUTES = 90
const STOPPAGE_CHANCE = 0.08
const MAX_STOPPAGE = 5

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

function randomMinute(rng: () => number): number {
  if (rng() < STOPPAGE_CHANCE) {
    return REGULATION_MINUTES + 1 + Math.floor(rng() * MAX_STOPPAGE)
  }
  return 1 + Math.floor(rng() * REGULATION_MINUTES)
}

/** Goal events for one side, summing to exactly `goals`. */
function buildGoals(
  side: Side,
  goals: number,
  scoringLineup: Lineup,
  concedingLineup: Lineup,
  rng: () => number
): MatchEvent[] {
  const events: MatchEvent[] = []

  for (let i = 0; i < goals; i++) {
    const roll = rng()

    if (roll < OWN_GOAL_CHANCE) {
      const slot = pickSlot(concedingLineup, OWN_GOAL_WEIGHT, rng)
      events.push({
        minute: randomMinute(rng),
        type: "ownGoal",
        side,
        playerId: slot?.playerId ?? null,
      })
      continue
    }

    if (roll < OWN_GOAL_CHANCE + PENALTY_CHANCE) {
      const slot = penaltyTaker(scoringLineup)
      events.push({
        minute: randomMinute(rng),
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
      minute: randomMinute(rng),
      type: "goal",
      side,
      playerId: scorer?.playerId ?? null,
      ...(assister ? { assistId: assister.playerId } : {}),
    })
  }

  return events
}

function buildCards(side: Side, lineup: Lineup, rng: () => number): MatchEvent[] {
  const events: MatchEvent[] = []

  const yellows = poisson(YELLOW_LAMBDA, rng)
  for (let i = 0; i < yellows; i++) {
    const slot = pickSlot(lineup, CARD_WEIGHT, rng)
    events.push({
      minute: randomMinute(rng),
      type: "yellow",
      side,
      playerId: slot?.playerId ?? null,
    })
  }

  if (rng() < RED_CHANCE) {
    const slot = pickSlot(lineup, CARD_WEIGHT, rng)
    events.push({ minute: randomMinute(rng), type: "red", side, playerId: slot?.playerId ?? null })
  }

  return events
}

/**
 * Rebuild a shootout, kick by kick, from the totals already recorded.
 *
 * The engine stores only the final tally, so the sequence is reconstructed
 * rather than replayed: five kicks a side (the regulation set), extended to
 * however many rounds sudden death needed. Scored kicks are dealt out at
 * random within each side's set, which is enough to read as a shootout —
 * and the totals always match the score the tie was decided on.
 */
function buildShootout(
  homeScored: number,
  awayScored: number,
  homeLineup: Lineup,
  awayLineup: Lineup,
  rng: () => number
): ShootoutKick[] {
  const rounds = Math.max(5, homeScored, awayScored)

  // Best takers first, then down the order, wrapping if it went long.
  function takers(lineup: Lineup): (string | null)[] {
    const ranked = [...lineup].sort((a, b) => b.power - a.power)
    return Array.from({ length: rounds }, (_, i) => ranked[i % ranked.length]?.playerId ?? null)
  }

  function outcomes(scored: number): boolean[] {
    const set = Array.from({ length: rounds }, (_, i) => i < scored)
    for (let i = set.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1))
      ;[set[i], set[j]] = [set[j], set[i]]
    }
    return set
  }

  const homeTakers = takers(homeLineup)
  const awayTakers = takers(awayLineup)
  const homeOutcomes = outcomes(homeScored)
  const awayOutcomes = outcomes(awayScored)

  const kicks: ShootoutKick[] = []
  for (let round = 0; round < rounds; round++) {
    kicks.push({
      order: kicks.length + 1,
      side: "home",
      playerId: homeTakers[round],
      scored: homeOutcomes[round],
    })
    kicks.push({
      order: kicks.length + 1,
      side: "away",
      playerId: awayTakers[round],
      scored: awayOutcomes[round],
    })
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
  homeGoals: number
  awayGoals: number
  /** Shootout tally, when the tie needed one. */
  penHome?: number
  penAway?: number
}

export function generateMatchStats(
  input: GenerateMatchStatsInput,
  rng: () => number = Math.random
): MatchStats {
  const { homeLineup, awayLineup, homePower, awayPower, homeGoals, awayGoals, penHome, penAway } =
    input

  const team: TeamMatchStats = generateTeamStats(homePower, awayPower, homeGoals, awayGoals, rng)

  const events: MatchEvent[] = [
    ...buildGoals("home", homeGoals, homeLineup, awayLineup, rng),
    ...buildGoals("away", awayGoals, awayLineup, homeLineup, rng),
    ...buildCards("home", homeLineup, rng),
    ...buildCards("away", awayLineup, rng),
  ]

  // A missed penalty changes nothing on the scoreboard, which is exactly
  // why it is worth showing — the timeline reads as a match, not a list.
  if (rng() < PENALTY_MISS_CHANCE) {
    const side: Side = rng() < 0.5 ? "home" : "away"
    const slot = penaltyTaker(side === "home" ? homeLineup : awayLineup)
    events.push({
      minute: randomMinute(rng),
      type: "penMiss",
      side,
      playerId: slot?.playerId ?? null,
    })
  }

  events.sort((a, b) => a.minute - b.minute)

  const shootout =
    penHome !== undefined && penAway !== undefined
      ? buildShootout(penHome, penAway, homeLineup, awayLineup, rng)
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
