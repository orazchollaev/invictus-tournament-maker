// modules/teams/utils/generateCoaches.ts
//
// The coach equivalent of players/utils/generatePlayers.ts, and deliberately
// the same shape: pure, rng injectable, returns specs rather than touching a
// store. The caller decides what to do with them.
import type { Coach, Formation, PlayStyle, Team } from "../types"
import { FORMATION_LIST, PLAY_STYLES } from "@/engine"

/** How far a generated coach's rating drifts from the club he is taking over. */
export const COACH_POWER_SPREAD = 12

/**
 * A weighting over styles, so generated leagues are not a third defensive.
 * Most managers set up to keep the game even; the extremes are the exception.
 */
const STYLE_WEIGHTS: Record<PlayStyle, number> = {
  attacking: 1,
  balanced: 2,
  defensive: 1,
}

export interface GeneratedCoachSpec extends Coach {
  teamId: string
}

/**
 * Which teams a generation run would touch. `overwrite` decides whether a
 * club that already has a manager gets a new one — the same "fill the gaps
 * vs. redo everything" choice the player generator offers.
 */
export function planCoachGeneration(teams: Team[], overwrite: boolean): Team[] {
  return overwrite ? [...teams] : teams.filter((team) => !team.coach)
}

/**
 * One coach for one club. His rating sits around the club's own, so a strong
 * side reads as being run by someone who earned the job — the same reason
 * generated players are drawn around their team's power.
 */
export function drawCoachSpec(
  team: Team,
  firstNames: string[],
  lastNames: string[],
  rng: () => number = Math.random,
  used: Set<string> = new Set()
): GeneratedCoachSpec {
  return {
    teamId: team.id,
    name: drawName(firstNames, lastNames, rng, used),
    formation: pickWeighted(FORMATION_LIST, () => 1, rng) ?? "4-4-2",
    style: pickWeighted(PLAY_STYLES, (style) => STYLE_WEIGHTS[style], rng) ?? "balanced",
    power: drawPower(team.power, rng),
  }
}

/** The whole run, in one call. */
export function drawCoachSpecs(
  teams: Team[],
  firstNames: string[],
  lastNames: string[],
  rng: () => number = Math.random
): GeneratedCoachSpec[] {
  const used = new Set<string>()
  return teams.map((team) => drawCoachSpec(team, firstNames, lastNames, rng, used))
}

function drawPower(teamPower: number, rng: () => number): number {
  const power = Math.round(teamPower + (rng() - 0.5) * 2 * COACH_POWER_SPREAD)
  return Math.max(1, Math.min(99, power))
}

function drawName(
  firstNames: string[],
  lastNames: string[],
  rng: () => number,
  used: Set<string>
): string {
  if (!firstNames.length || !lastNames.length) return "Coach"
  const maxCombos = firstNames.length * lastNames.length
  for (let attempt = 0; attempt < 20; attempt++) {
    const combo = `${pick(firstNames, rng)} ${pick(lastNames, rng)}`
    if (!used.has(combo) || used.size >= maxCombos) {
      used.add(combo)
      return combo
    }
  }
  return `${pick(firstNames, rng)} ${pick(lastNames, rng)}`
}

function pick<T>(pool: T[], rng: () => number): T {
  return pool[Math.floor(rng() * pool.length)]
}

function pickWeighted<T>(pool: T[], weight: (item: T) => number, rng: () => number): T | undefined {
  const total = pool.reduce((sum, item) => sum + weight(item), 0)
  if (total <= 0) return undefined
  let roll = rng() * total
  for (const item of pool) {
    roll -= weight(item)
    if (roll <= 0) return item
  }
  return pool[pool.length - 1]
}

/** A coach drawn from nothing but a target rating — the "randomize" button. */
export function randomCoachTactics(rng: () => number = Math.random): {
  formation: Formation
  style: PlayStyle
} {
  return {
    formation: pickWeighted(FORMATION_LIST, () => 1, rng) ?? "4-4-2",
    style: pickWeighted(PLAY_STYLES, (style) => STYLE_WEIGHTS[style], rng) ?? "balanced",
  }
}
