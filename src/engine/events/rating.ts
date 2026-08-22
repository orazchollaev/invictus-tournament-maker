// engine/events/rating.ts
//
// A 1-10 match rating per player, built from what happened in the match —
// goals, assists, the team's result, clean sheets, goals conceded, saves —
// plus two terms that separate players the scoreline cannot tell apart.
//
// Those two exist because the event-only formula gave all four defenders in
// a clean sheet the identical number, every week. A match rating that never
// varies is not a rating. So:
//
//   performance  a per-player, per-match roll. Generated once and stored
//                with the match, so a rating never changes after the fact.
//   power tilt   how far this player stands above or below his own squad's
//                average. A star drifts higher over a season without ever
//                being handed a good game he did not have.
//
// Cards still do not count. A booking says nothing about how well someone
// played, and docking for it made honest defending look like failure.
import type { PlayerPosition } from "@/modules/players/types"

export type MatchOutcome = "win" | "draw" | "loss"

const BASE = 6.0

const OUTCOME_BONUS: Record<MatchOutcome, number> = { win: 0.6, draw: 0, loss: -0.4 }

/** A defender's goal is worth more than a striker's — it is rarer. */
const GOAL_BONUS: Record<PlayerPosition, number> = { GK: 2.0, DEF: 1.4, MID: 1.1, FWD: 0.9 }

const ASSIST_BONUS: Record<PlayerPosition, number> = { GK: 0.8, DEF: 0.8, MID: 0.6, FWD: 0.6 }

const CLEAN_SHEET_BONUS: Record<PlayerPosition, number> = { GK: 1.0, DEF: 0.7, MID: 0.2, FWD: 0 }

const CONCEDED_PENALTY = 0.25
const SAVE_BONUS = 0.1

/** How far a single performance can swing the rating, up or down. */
const PERFORMANCE_SWING = 1.1
/** Cap on the power tilt, so a star cannot coast to a good rating. */
const MAX_POWER_TILT = 0.6
/** Power points above squad average that earn a full point of tilt. */
const POWER_TILT_SCALE = 22

export const MIN_RATING = 1.0
export const MAX_RATING = 10.0

export interface RatingInput {
  position: PlayerPosition
  outcome: MatchOutcome
  goals: number
  assists: number
  cleanSheet: boolean
  /** Goalkeepers only. */
  conceded?: number
  /** Goalkeepers only. */
  saves?: number
  /** 0-1 roll for this player in this match; 0.5 is an ordinary day. */
  performance?: number
  /** This player's power. Paired with `squadPower` to compute the tilt. */
  power?: number
  /** Mean power of the eleven he played in. */
  squadPower?: number
}

/**
 * Three uniform rolls averaged — a cheap bell curve. Most matches land near
 * ordinary; standout and anonymous games are the tails, as they should be.
 */
export function rollPerformance(rng: () => number = Math.random): number {
  return (rng() + rng() + rng()) / 3
}

export function computeRating(input: RatingInput): number {
  let rating = BASE + OUTCOME_BONUS[input.outcome]

  if (input.performance !== undefined) {
    rating += (input.performance - 0.5) * 2 * PERFORMANCE_SWING
  }

  if (input.power !== undefined && input.squadPower !== undefined) {
    const tilt = (input.power - input.squadPower) / POWER_TILT_SCALE
    rating += Math.max(-MAX_POWER_TILT, Math.min(MAX_POWER_TILT, tilt))
  }

  rating += input.goals * GOAL_BONUS[input.position]
  rating += input.assists * ASSIST_BONUS[input.position]
  if (input.cleanSheet) rating += CLEAN_SHEET_BONUS[input.position]

  if (input.position === "GK") {
    // The first goal is rarely the keeper's fault; the rest count against him.
    const conceded = input.conceded ?? 0
    if (conceded > 1) rating -= (conceded - 1) * CONCEDED_PENALTY
    rating += (input.saves ?? 0) * SAVE_BONUS
  }

  const clamped = Math.max(MIN_RATING, Math.min(MAX_RATING, rating))
  return Math.round(clamped * 10) / 10
}
