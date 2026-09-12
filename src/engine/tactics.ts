// engine/tactics.ts
//
// What a coach is worth, in numbers the simulation can use.
//
// Three things come off a coach, and they are deliberately kept apart:
//
//   powerBonus — his own rating, worth at most ±6 to the side's effective
//                strength. The same order as the default home advantage, so a
//                great manager is worth roughly playing at home.
//   attack     — how much more (or less) his side scores.
//   defense    — how much less (or more) his side concedes.
//
// Attack and defense are multipliers on the goal rate, not on the rating. A
// side that is simply better still wins most weeks; the tactics move the
// margin by about a fifth either way, which is what "the coach matters, the
// squad matters more" looks like in a Poisson model.
//
// A team with no coach gets a neutral profile, so every save made before
// coaches existed keeps simulating exactly as it did.
import type { Formation, PlayStyle, Team } from "@/modules/teams/types"
import type { PlayerPosition } from "@/modules/players/types"

/** Eleven slots per shape, always — the lineup builder relies on it. */
export const FORMATIONS: Record<Formation, Record<PlayerPosition, number>> = {
  "4-4-2": { GK: 1, DEF: 4, MID: 4, FWD: 2 },
  "4-3-3": { GK: 1, DEF: 4, MID: 3, FWD: 3 },
  "4-2-3-1": { GK: 1, DEF: 4, MID: 5, FWD: 1 },
  "3-5-2": { GK: 1, DEF: 3, MID: 5, FWD: 2 },
  "3-4-3": { GK: 1, DEF: 3, MID: 4, FWD: 3 },
  "5-3-2": { GK: 1, DEF: 5, MID: 3, FWD: 2 },
  "5-4-1": { GK: 1, DEF: 5, MID: 4, FWD: 1 },
  "4-5-1": { GK: 1, DEF: 4, MID: 5, FWD: 1 },
}

export const FORMATION_LIST = Object.keys(FORMATIONS) as Formation[]
export const PLAY_STYLES: PlayStyle[] = ["attacking", "balanced", "defensive"]

export const DEFAULT_FORMATION: Formation = "4-3-3"
export const DEFAULT_STYLE: PlayStyle = "balanced"

/**
 * What each shape is worth, relative to a flat 4-4-2.
 *
 * Written out rather than derived from the slot counts: 4-2-3-1 and 4-5-1
 * field the same eleven positions, and only one of them is trying to score.
 * The counts cannot tell them apart; a table can.
 */
const SHAPE: Record<Formation, { attack: number; defense: number }> = {
  "4-4-2": { attack: 0.0, defense: 0.0 },
  "4-3-3": { attack: 0.05, defense: -0.03 },
  "3-4-3": { attack: 0.08, defense: -0.06 },
  "3-5-2": { attack: 0.04, defense: -0.03 },
  "4-2-3-1": { attack: 0.01, defense: 0.03 },
  "4-5-1": { attack: -0.03, defense: 0.04 },
  "5-3-2": { attack: -0.04, defense: 0.06 },
  "5-4-1": { attack: -0.07, defense: 0.07 },
}

/**
 * What the instruction is worth, on top of the shape.
 *
 * Attack is deliberately worth a shade more than defense. Perfectly mirrored
 * numbers make the extreme matchup — everyone forward against a parked bus —
 * cancel out exactly, which reads on screen as the tactics having done
 * nothing at all. Tilting them slightly keeps going for it worth going for.
 */
const STYLE: Record<PlayStyle, { attack: number; defense: number }> = {
  attacking: { attack: 0.13, defense: -0.1 },
  balanced: { attack: 0, defense: 0 },
  defensive: { attack: -0.09, defense: 0.11 },
}

/** Power a coach at 99 adds, and a coach at 1 takes away. */
export const COACH_POWER_SWING = 6

/** How far a multiplier may travel from 1 once both sides are accounted for. */
export const MIN_LAMBDA_MULTIPLIER = 0.74
export const MAX_LAMBDA_MULTIPLIER = 1.28

export interface TacticProfile {
  attack: number
  defense: number
  powerBonus: number
}

const NEUTRAL: TacticProfile = { attack: 0, defense: 0, powerBonus: 0 }

/** The rating swing a coach's own ability is worth, −6..+6. */
export function coachPowerBonus(power: number | null | undefined): number {
  if (power == null) return 0
  return ((clamp(power, 1, 99) - 50) / 49) * COACH_POWER_SWING
}

/** Shape + instruction + ability, as one profile. Neutral without a coach. */
export function tacticsProfile(
  tactics: { formation: Formation; style: PlayStyle } | null | undefined,
  power?: number
): TacticProfile {
  if (!tactics) return { ...NEUTRAL }
  const shape = SHAPE[tactics.formation] ?? SHAPE["4-4-2"]
  const style = STYLE[tactics.style] ?? STYLE.balanced
  return {
    attack: shape.attack + style.attack,
    defense: shape.defense + style.defense,
    powerBonus: coachPowerBonus(power),
  }
}

/** The profile a team plays to, from whoever is on its touchline. */
export function teamProfile(team: Team | null | undefined): TacticProfile {
  const coach = team?.coach
  if (!coach) return { ...NEUTRAL }
  return tacticsProfile({ formation: coach.formation, style: coach.style }, coach.power)
}

/** The formation a team lines up in, falling back to the engine default. */
export function teamFormation(team: Team | null | undefined): Formation {
  return team?.coach?.formation ?? DEFAULT_FORMATION
}

/**
 * How much each side's goal rate is scaled by the tactical matchup: my attack
 * against your defense, clamped so no pair of coaches can make the scoreline
 * their own. Both sides are computed together because a defensive opponent is
 * exactly as relevant as my own instruction.
 */
export function lambdaMultipliers(
  home: TacticProfile,
  away: TacticProfile
): { home: number; away: number } {
  return {
    home: clampMultiplier(1 + home.attack - away.defense),
    away: clampMultiplier(1 + away.attack - home.defense),
  }
}

/**
 * What the bench does when the match is getting away from it.
 *
 * Only ever more attacking, and only late — a side chasing a game throws
 * players forward; one protecting a lead does not suddenly park the bus in
 * this model, because a coach who set up defensively is already there.
 */
export function aiStyleFor(base: PlayStyle, goalDiff: number, minute: number): PlayStyle {
  if (minute < 60 || goalDiff >= 0) return base
  if (goalDiff <= -2 || minute >= 75) return "attacking"
  return base === "defensive" ? "balanced" : base
}

function clampMultiplier(value: number): number {
  return clamp(value, MIN_LAMBDA_MULTIPLIER, MAX_LAMBDA_MULTIPLIER)
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
