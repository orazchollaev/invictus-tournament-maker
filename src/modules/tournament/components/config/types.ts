// Payloads the format-config modals hand back. They live here rather than on a
// modal so the create page and the settings page depend on the same shape --
// the two used to declare an interface each, and the copies drifted.
import type { DrawType, LegMode, Tiebreaker } from "@/modules/tournament/types"

export interface SwissConfigPayload {
  opponentCount: number
  potCount: number
  legMode: LegMode
  balanceHomeAway: boolean
  drawType: DrawType
  tiebreaker: Tiebreaker
  winPoints: number
  drawPoints: number
  lossPoints: number
}

export interface GroupConfigPayload {
  drawType: DrawType
  groupCount: number
  qualifiersPerGroup: number
  wildcardCount: number
  groupLegMode: LegMode
  tiebreaker: Tiebreaker
  winPoints: number
  drawPoints: number
  lossPoints: number
}
