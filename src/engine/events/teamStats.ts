// engine/events/teamStats.ts
//
// The comparison bars on the match screen: possession, shots, shots on
// target, corners, fouls. These are team-level colour derived from three
// things, in this order of weight:
//
//   1. the power gap — a 90-rated side should pin a 60-rated side back,
//      not edge it 55/45
//   2. the surprise factor — the same setting that decides how much power
//      matters to the score decides how much it matters to the shape of
//      the match. At maximum surprise a mismatch looks like a coin toss.
//   3. the scoreline — a side that won 3-0 did something right, even if
//      it was the weaker team, so the result pulls the bars its way.
//
// Two invariants hold by construction, because a screen showing more goals
// than shots on target is worse than no screen at all:
//   goals <= onTarget <= shots
import type { TeamMatchStats } from "@/modules/tournament/types"
import { getSimConfig } from "../simulation"

const MIN_POSSESSION = 18
const MAX_POSSESSION = 82

/** How far possession can swing from even, before damping. */
const POSSESSION_SWING = 29
/** The scoreline's own pull, independent of power. */
const SCORE_SWING = 7

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/**
 * -1 … +1. Saturating, so 40 points of power gap is decisively one-sided
 * without a 70-point gap producing an impossible 100% of the ball.
 */
function dominanceOf(homePower: number, awayPower: number): number {
  return Math.tanh((homePower - awayPower) / 22)
}

/**
 * 1 at surprise 0, 0.35 at surprise 100. Never reaches zero: even a chaotic
 * simulation should let a far stronger side see more of the ball.
 */
function surpriseDamping(surpriseFactor: number): number {
  return 1 - (surpriseFactor / 100) * 0.65
}

/**
 * Shots and shots on target, kept consistent with the goals actually scored.
 *
 * A flat "1 + ... + rng()*3" floor made every match look the same — roughly
 * ten shots a side, regardless of the story the scoreline told. `quiet`
 * lets a side barely threaten at all every so often (real games where a
 * single shot decides it), and `volatility` can swing negative instead of
 * only ever adding on top of the base.
 */
function attempts(
  possessionShare: number,
  goals: number,
  dominance: number,
  rng: () => number
): { shots: number; onTarget: number } {
  let shots: number
  if (rng() < 0.12) {
    // A quiet afternoon: barely any chances created, whatever the territory.
    // A side that still scored got it from next to nothing it created.
    shots = goals + (rng() < 0.3 ? 1 : 0)
  } else {
    const base = 1 + (possessionShare / 100) * 22 + goals * 1.1
    const volatility = (rng() - 0.35) * 7
    shots = Math.max(goals, Math.round(base + volatility))
  }
  // The better side is also more accurate, not just busier.
  const accuracy = 0.3 + Math.max(0, dominance) * 0.14 + rng() * 0.08
  const onTarget = Math.round(shots * accuracy)

  const safeOnTarget = clamp(onTarget, goals, Math.max(goals, shots))
  const safeShots = Math.max(shots, safeOnTarget)

  return { shots: safeShots, onTarget: safeOnTarget }
}

/**
 * Expected goals: driven by shot volume/quality, not by the actual goals
 * scored, so a 1-shot winner still shows a low xG and the goal reads as
 * overperformance rather than the model just echoing the scoreline back.
 */
function xgFor(shots: number, onTarget: number, dominance: number, rng: () => number): number {
  const perShot = 0.09 + Math.max(0, dominance) * 0.05
  const raw = onTarget * (perShot + rng() * 0.06) + (shots - onTarget) * 0.02
  return Math.round(raw * 10) / 10
}

/** Clear-cut chances: a fraction of shots on target, weighted by dominance. */
function bigChancesFor(onTarget: number, dominance: number, rng: () => number): number {
  return Math.max(0, Math.round(onTarget * (0.25 + Math.max(0, dominance) * 0.15) + (rng() - 0.5)))
}

/** Offsides: cheap noise off how often a side is pushing a high line/final ball. */
function offsidesFor(dominance: number, rng: () => number): number {
  return Math.max(0, Math.round(1 + Math.max(0, dominance) * 2 + rng() * 2))
}

export function generateTeamStats(
  homePower: number,
  awayPower: number,
  homeGoals: number,
  awayGoals: number,
  rng: () => number = Math.random
): TeamMatchStats {
  const damping = surpriseDamping(getSimConfig().surpriseFactor)
  const dominance = dominanceOf(homePower, awayPower) * damping
  const scoreEdge = Math.tanh((homeGoals - awayGoals) / 2.5)

  const possession = Math.round(
    clamp(
      50 + dominance * POSSESSION_SWING + scoreEdge * SCORE_SWING + (rng() - 0.5) * 6,
      MIN_POSSESSION,
      MAX_POSSESSION
    )
  )

  const home = attempts(possession, homeGoals, dominance, rng)
  const away = attempts(100 - possession, awayGoals, -dominance, rng)

  // Chasing the game means chasing the ball: less possession, more fouls.
  const homeFouls = Math.round(6 + ((100 - possession) / 100) * 12 + rng() * 4)
  const awayFouls = Math.round(6 + (possession / 100) * 12 + rng() * 4)

  return {
    possession,
    shots: [home.shots, away.shots],
    onTarget: [home.onTarget, away.onTarget],
    corners: [
      Math.round((possession / 100) * 12 + rng() * 2),
      Math.round(((100 - possession) / 100) * 12 + rng() * 2),
    ],
    fouls: [homeFouls, awayFouls],
    xg: [
      xgFor(home.shots, home.onTarget, dominance, rng),
      xgFor(away.shots, away.onTarget, -dominance, rng),
    ],
    bigChances: [
      bigChancesFor(home.onTarget, dominance, rng),
      bigChancesFor(away.onTarget, -dominance, rng),
    ],
    offsides: [offsidesFor(dominance, rng), offsidesFor(-dominance, rng)],
  }
}
