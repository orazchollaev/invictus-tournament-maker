import type { Tiebreaker } from "../modules/tournament/types"

let _tiebreaker: Tiebreaker = "goal-diff"

export function setTableConfig(config: { tiebreaker?: Tiebreaker }) {
  if (config.tiebreaker !== undefined) _tiebreaker = config.tiebreaker
}

export function getTiebreaker(): Tiebreaker {
  return _tiebreaker
}
