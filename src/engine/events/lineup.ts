// engine/events/lineup.ts
//
// Picks the eleven that take the field. A team's registered squad is
// usually shorter than eleven — often it is empty — so the lineup is
// built from a fixed positional skeleton and whatever players exist
// are slotted into it. Slots with nobody to fill them stay `null`:
// an anonymous "Unknown Player" that absorbs its share of the match's
// events without ever being aggregated into a ranking.
//
// Without this, a squad holding a single striker would be credited
// with every goal the team ever scored.
import type { Player, PlayerPosition } from "@/modules/players/types"

/** 1-4-3-3. Eleven slots, always. */
export const FORMATION: Record<PlayerPosition, number> = { GK: 1, DEF: 4, MID: 3, FWD: 3 }

export const LINEUP_SIZE = 11

/** Assumed strength of an unfilled slot — the midpoint of the 1-99 range. */
export const UNKNOWN_POWER = 50

export interface LineupSlot {
  /** null = unfilled slot, rendered as "Unknown Player". */
  playerId: string | null
  position: PlayerPosition
  power: number
}

export type Lineup = LineupSlot[]

/**
 * Draw `count` players from `pool` without replacement, weighted by
 * power². Squaring keeps the best players in the side most weeks while
 * still letting a squad player rotate in — a plain power weighting
 * rotates far too much, and a straight sort never rotates at all.
 */
function sampleByPower(pool: Player[], count: number, rng: () => number): Player[] {
  const remaining = [...pool]
  const picked: Player[] = []

  while (picked.length < count && remaining.length > 0) {
    const weights = remaining.map((p) => p.power * p.power)
    const total = weights.reduce((sum, w) => sum + w, 0)
    let roll = rng() * total
    let idx = remaining.length - 1
    for (let i = 0; i < weights.length; i++) {
      roll -= weights[i]
      if (roll <= 0) {
        idx = i
        break
      }
    }
    picked.push(remaining[idx])
    remaining.splice(idx, 1)
  }

  return picked
}

/**
 * Build one side's eleven. Players are placed in their own position's
 * slots only — a squad of six strikers fields three of them and leaves
 * the other eight slots unknown, rather than inventing a defence.
 */
export function buildLineup(squad: Player[], rng: () => number = Math.random): Lineup {
  const lineup: Lineup = []

  for (const position of Object.keys(FORMATION) as PlayerPosition[]) {
    const slots = FORMATION[position]
    const candidates = squad.filter((p) => p.position === position)
    const chosen = sampleByPower(candidates, slots, rng)

    for (let i = 0; i < slots; i++) {
      const player = chosen[i]
      lineup.push({
        playerId: player?.id ?? null,
        position,
        power: player?.power ?? UNKNOWN_POWER,
      })
    }
  }

  return lineup
}
