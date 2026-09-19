// modules/tournament/utils/managerLineup.ts
//
// A manager's starting XI is a fixed row of formation slots, not a bag of
// ids: slot 3 is always "the second centre-back", whatever formation is on.
// Keeping the shape explicit is what lets a formation change reshuffle the
// picks by position instead of guessing which flat ids still make sense —
// and what lets engine/events/lineup.ts seat them directly, with no
// position-bucket truncation to silently drop one.
import type { Player, PlayerPosition } from "@/modules/players/types"
import type { Formation } from "@/modules/teams/types"
import type { ManagerLineupSlot } from "../types"
import { FORMATIONS } from "@/engine"

const POSITION_ORDER: PlayerPosition[] = ["GK", "DEF", "MID", "FWD"]

/** Every slot a formation needs, all empty — the shape `manager.lineup` is
 *  always built and reconciled against. */
export function emptyLineupSlots(formation: Formation): ManagerLineupSlot[] {
  const shape = FORMATIONS[formation]
  const slots: ManagerLineupSlot[] = []
  for (const position of POSITION_ORDER) {
    for (let i = 0; i < shape[position]; i++) slots.push({ position, playerId: null })
  }
  return slots
}

/**
 * Reshape an existing set of picks onto a (possibly new) formation.
 *
 * A pick survives only if its own position still has a slot for it, and only
 * as many as that position now holds — the rest fall out rather than
 * overflowing the new shape, which is exactly the silent mismatch this
 * exists to prevent. Nothing is renumbered across positions: a manager who
 * switches from 4-4-2 to 4-3-3 loses a midfielder, not a random pick.
 */
export function reconcileLineupSlots(
  slots: ManagerLineupSlot[],
  formation: Formation
): ManagerLineupSlot[] {
  const shape = FORMATIONS[formation]
  const byPosition = new Map<PlayerPosition, string[]>()
  for (const slot of slots) {
    if (!slot.playerId) continue
    const list = byPosition.get(slot.position) ?? []
    list.push(slot.playerId)
    byPosition.set(slot.position, list)
  }

  const next: ManagerLineupSlot[] = []
  for (const position of POSITION_ORDER) {
    const ids = byPosition.get(position) ?? []
    for (let i = 0; i < shape[position]; i++) next.push({ position, playerId: ids[i] ?? null })
  }
  return next
}

/** The starting XI a manager gets handed on day one, before he has touched
 *  anything himself: the strongest player available in each position, up to
 *  what the formation actually needs. A position the squad is short of
 *  stays short here too — buildLineup covers the gap from the bench. */
export function bestStartingXI(squad: Player[], formation: Formation): ManagerLineupSlot[] {
  const shape = FORMATIONS[formation]
  const slots: ManagerLineupSlot[] = []
  for (const position of POSITION_ORDER) {
    const pool = squad.filter((p) => p.position === position).sort((a, b) => b.power - a.power)
    for (let i = 0; i < shape[position]; i++) slots.push({ position, playerId: pool[i]?.id ?? null })
  }
  return slots
}

/** Replace one slot's occupant, by its index in the array. */
export function assignLineupSlot(
  slots: ManagerLineupSlot[],
  index: number,
  playerId: string | null
): ManagerLineupSlot[] {
  return slots.map((slot, i) => (i === index ? { ...slot, playerId } : slot))
}

/** Empty out whichever slot (if any) currently holds this player — used when
 *  he becomes unavailable (injured, suspended, sold) after being picked. */
export function clearLineupPlayer(
  slots: ManagerLineupSlot[],
  playerId: string
): ManagerLineupSlot[] {
  return slots.map((slot) => (slot.playerId === playerId ? { ...slot, playerId: null } : slot))
}

/** Every id currently seated somewhere in the lineup. */
export function lineupPlayerIds(slots: ManagerLineupSlot[]): Set<string> {
  const ids = new Set<string>()
  for (const slot of slots) if (slot.playerId) ids.add(slot.playerId)
  return ids
}
