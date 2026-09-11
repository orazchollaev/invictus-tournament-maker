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
//
// A slot only stays anonymous when the squad has genuinely run out of
// players, never merely because it has run out of *that position*. A
// twenty-man squad shaped nothing like 1-4-3-3 still fields eleven real
// names; whoever is left over covers the gap, the way a manager fields a
// midfielder at the back rather than playing with ten.
import type { Player, PlayerPosition } from "@/modules/players/types"

/** 1-4-3-3. Eleven slots, always. */
export const FORMATION: Record<PlayerPosition, number> = { GK: 1, DEF: 4, MID: 3, FWD: 3 }

export const LINEUP_SIZE = 11

/** Assumed strength of an unfilled slot — the midpoint of the 1-99 range. */
export const UNKNOWN_POWER = 50

/**
 * Who covers a slot once nobody of that position is left, nearest job
 * first. A keeper is everyone's last resort, and is only pulled outfield
 * when the alternative is fielding nobody at all.
 */
const COVER_ORDER: Record<PlayerPosition, PlayerPosition[]> = {
  GK: ["DEF", "MID", "FWD"],
  DEF: ["MID", "FWD", "GK"],
  MID: ["DEF", "FWD", "GK"],
  FWD: ["MID", "DEF", "GK"],
}

/** What playing out of position costs a player, in power. */
const OUT_OF_POSITION_PENALTY = 8

/** Going in goal is a different job, not a nearby one. */
const EMERGENCY_KEEPER_PENALTY = 20

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
 * The best available player for `position`: a specialist if `pool` still
 * holds one, otherwise the nearest job that can cover it. Returns undefined
 * only when `pool` has nobody left at all.
 *
 * Shared with the substitution logic in `generate.ts`, which faces the same
 * question at the bench: a side with real players left must never send an
 * anonymous one on merely because the shirt number does not match.
 */
export function pickForPosition(
  pool: Player[],
  used: Set<string>,
  position: PlayerPosition,
  rng: () => number = Math.random
): Player | undefined {
  for (const from of [position, ...COVER_ORDER[position]]) {
    const candidates = pool.filter((p) => p.position === from && !used.has(p.id))
    if (candidates.length) return sampleByPower(candidates, 1, rng)[0]
  }
  return undefined
}

/**
 * A player's rating in the shirt he is actually wearing. Out of position
 * costs him; in his own, nothing changes.
 */
export function slotPower(player: Player, playing: PlayerPosition): number {
  if (player.position === playing) return player.power
  const penalty = playing === "GK" ? EMERGENCY_KEEPER_PENALTY : OUT_OF_POSITION_PENALTY
  return Math.max(1, player.power - penalty)
}

/**
 * Build one side's eleven.
 *
 * Two passes. The first fills each slot from its own position, so the
 * specialists play where they belong and a lone striker still takes one
 * attacking slot rather than all three. The second hands the slots nobody
 * claimed to whoever is still on the bench, at a penalty — a real name out
 * of position beats an anonymous one, and a squad big enough to field
 * eleven should field eleven.
 */
export function buildLineup(squad: Player[], rng: () => number = Math.random): Lineup {
  const lineup: Lineup = []
  const used = new Set<string>()
  const gaps: LineupSlot[] = []

  for (const position of Object.keys(FORMATION) as PlayerPosition[]) {
    const slots = FORMATION[position]
    const candidates = squad.filter((p) => p.position === position)
    const chosen = sampleByPower(candidates, slots, rng)

    for (let i = 0; i < slots; i++) {
      const player = chosen[i]
      if (player) used.add(player.id)
      const slot: LineupSlot = {
        playerId: player?.id ?? null,
        position,
        power: player?.power ?? UNKNOWN_POWER,
      }
      lineup.push(slot)
      if (!player) gaps.push(slot)
    }
  }

  for (const slot of gaps) {
    const cover = pickForPosition(squad, used, slot.position, rng)
    if (!cover) continue
    used.add(cover.id)
    slot.playerId = cover.id
    slot.power = slotPower(cover, slot.position)
  }

  return lineup
}
