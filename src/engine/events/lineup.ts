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
import type { Formation } from "@/modules/teams/types"
import type { ManagerLineupSlot } from "@/modules/tournament/types"
import { DEFAULT_FORMATION, FORMATIONS } from "../tactics"
import { fatigueSampleWeightMultiplier } from "../fatigue"

/** The shape a side lines up in when nobody has told it otherwise. */
export const FORMATION: Record<PlayerPosition, number> = FORMATIONS[DEFAULT_FORMATION]

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
 *
 * `fatigueByPlayer`, when given, further discounts a tired player's weight
 * (see engine/fatigue.ts) — the mechanism that gives an unmanaged AI side
 * something resembling squad rotation, with no persisted "usual XI" at all.
 */
function sampleByPower(
  pool: Player[],
  count: number,
  rng: () => number,
  fatigueByPlayer?: Map<string, number>
): Player[] {
  const remaining = [...pool]
  const picked: Player[] = []

  while (picked.length < count && remaining.length > 0) {
    const weights = remaining.map(
      (p) =>
        p.power *
        p.power *
        (fatigueByPlayer ? fatigueSampleWeightMultiplier(fatigueByPlayer.get(p.id) ?? 0) : 1)
    )
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
  rng: () => number = Math.random,
  fatigueByPlayer?: Map<string, number>
): Player | undefined {
  for (const from of [position, ...COVER_ORDER[position]]) {
    const candidates = pool.filter((p) => p.position === from && !used.has(p.id))
    if (candidates.length) return sampleByPower(candidates, 1, rng, fatigueByPlayer)[0]
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
 * An unmanaged side runs two passes: the first fills each slot from its own
 * position, power-weighted, so the specialists play where they belong and a
 * lone striker still takes one attacking slot rather than all three; the
 * second hands the slots nobody claimed to whoever is still on the bench, at
 * a penalty — a real name out of position beats an anonymous one.
 *
 * A managed side skips the draw for its own slots entirely: `preferredSlots`
 * already says exactly who stands where, one id per formation slot, so that
 * is just seated directly. Only a slot the manager left empty — or filled
 * with someone no longer in the squad — falls through to the same
 * bench-cover pass, drawing only from players who appear *somewhere* in his
 * own picks. Never from the rest of the squad: a bench player with more
 * power than the man who took his slot must not quietly win it back.
 *
 * `formation` is the coach's shape. Whichever it is, it is eleven slots.
 */
export function buildLineup(
  squad: Player[],
  rng: () => number = Math.random,
  formation: Formation = DEFAULT_FORMATION,
  /** The manager's own picks, one entry per formation slot, in shape order. */
  preferredSlots: ManagerLineupSlot[] = [],
  /**
   * True for a manager's own side — see the function doc for what that
   * changes. False plays the whole squad through the power-weighted draw,
   * exactly as if no picks existed.
   */
  managed = false,
  /**
   * How tired each squad member is (see engine/fatigue.ts). Only discounts
   * the unmanaged power-weighted draw and its bench cover — a manager's own
   * picks are never second-guessed by it.
   */
  fatigueByPlayer?: Map<string, number>
): Lineup {
  const lineup: Lineup = []
  const used = new Set<string>()
  const gaps: LineupSlot[] = []
  const shape = FORMATIONS[formation] ?? FORMATIONS[DEFAULT_FORMATION]
  const squadById = new Map(squad.map((p) => [p.id, p]))

  // Grouped by position and kept in slot order, so each formation slot can
  // seat the exact id the manager put in the matching spot.
  const picksByPosition = new Map<PlayerPosition, (string | null)[]>()
  if (managed) {
    for (const slot of preferredSlots) {
      const list = picksByPosition.get(slot.position) ?? []
      list.push(slot.playerId)
      picksByPosition.set(slot.position, list)
    }
  }

  // An empty pick list is "no lineup was ever set" (nothing to honor), not
  // "the manager fielded nobody" — that case still draws from the whole
  // squad, same as an unmanaged side. Otherwise the bench-cover pass below
  // may only draw from players the manager picked somewhere.
  const preferredIds = preferredSlots.map((s) => s.playerId).filter((id): id is string => !!id)
  const coverPool =
    managed && preferredIds.length > 0 ? squad.filter((p) => preferredIds.includes(p.id)) : squad

  for (const position of Object.keys(shape) as PlayerPosition[]) {
    const slots = shape[position]

    if (managed) {
      const picks = picksByPosition.get(position) ?? []
      for (let i = 0; i < slots; i++) {
        const playerId = picks[i] ?? null
        const player = playerId && !used.has(playerId) ? squadById.get(playerId) : undefined
        if (player) used.add(player.id)
        const slot: LineupSlot = {
          playerId: player?.id ?? null,
          position,
          power: player?.power ?? UNKNOWN_POWER,
        }
        lineup.push(slot)
        if (!player) gaps.push(slot)
      }
      continue
    }

    const candidates = squad.filter((p) => p.position === position && !used.has(p.id))
    const chosen = sampleByPower(candidates, slots, rng, fatigueByPlayer)

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
    const cover = pickForPosition(coverPool, used, slot.position, rng, fatigueByPlayer)
    if (!cover) continue
    used.add(cover.id)
    slot.playerId = cover.id
    slot.power = slotPower(cover, slot.position)
  }

  return lineup
}
