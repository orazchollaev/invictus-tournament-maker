// engine/form.ts
//
// The Form Factor setting used to reach only the group/league simulators,
// because those were the only call sites that had a match history handy —
// knockout ties, the third-place match and Monte Carlo all silently ran
// without it. `matchIterator` already knows how to walk every container a
// tournament has, so the whole-tournament history lives here once and every
// simulator reads its adjustments through this one helper.
import type { Tournament } from "../modules/tournament/types"
import { computeFormAdjustments, isFormFactorEnabled } from "./simulation"
import { playedMatches } from "./matchIterator"

/**
 * Form adjustments derived from every played match in the tournament — group,
 * league, tier, knockout leg and third-place alike. Returns `undefined` when
 * the setting is off, which is exactly what `simulateMatch` expects.
 */
export function tournamentFormAdjustments(t: Tournament): Map<string, number> | undefined {
  if (!isFormFactorEnabled()) return undefined
  const history = playedMatches(t).map((e) => ({
    homeId: e.homeId as string,
    awayId: e.awayId as string,
    result: e.result,
  }))
  return computeFormAdjustments(t.teamIds, history)
}
