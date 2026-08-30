import type { Match } from "@/modules/tournament/types"

/** A bracket match plus the coordinates the fixture list flattened it from. */
export interface FlatMatch extends Match {
  _origRound: number
  _origMatch: number
  _isThirdPlace?: boolean
}
