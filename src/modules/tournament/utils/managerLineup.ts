// modules/tournament/utils/managerLineup.ts
//
// The starting XI a manager gets handed on day one, before he has touched
// anything himself: the strongest player available in each position, up to
// what the formation actually needs.
//
// A position the squad is short of stays short here too — that is not this
// function's problem to solve. engine/events/lineup.ts's own `buildLineup`
// already covers a gap from elsewhere on the bench, and once it truly runs
// out, seats an anonymous "Unknown Player" instead. Seeding fewer than
// eleven ids is exactly what leaves it free to do that.
import type { Player, PlayerPosition } from "@/modules/players/types"
import type { Formation } from "@/modules/teams/types"
import { FORMATIONS } from "@/engine"

const POSITION_ORDER: PlayerPosition[] = ["GK", "DEF", "MID", "FWD"]

export function bestStartingXI(squad: Player[], formation: Formation): string[] {
  const slots = FORMATIONS[formation]
  const lineup: string[] = []
  for (const position of POSITION_ORDER) {
    const pool = squad.filter((p) => p.position === position).sort((a, b) => b.power - a.power)
    for (const player of pool.slice(0, slots[position])) lineup.push(player.id)
  }
  return lineup
}
