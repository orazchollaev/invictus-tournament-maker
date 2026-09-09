// engine/form.ts
//
// The Form Factor setting used to reach only the group/league simulators,
// because those were the only call sites that had a match history handy —
// knockout ties, the third-place match and Monte Carlo all silently ran
// without it. `matchIterator` already knows how to walk every container a
// tournament has, so the whole-tournament history lives here once and every
// simulator reads its adjustments through this one helper.
//
// Discipline (see discipline.ts) needs exactly the same thing — a team's
// recent matches — so it rides the same channel rather than opening a second
// one: every simulator takes one power-adjustment map, whatever produced it.
import type { MatchResult, Tournament } from "../modules/tournament/types"
import { computeFormAdjustments, isFormFactorEnabled, isRedCardImpactEnabled } from "./simulation"
import { computeDisciplineAdjustments } from "./discipline"
import { playedMatches } from "./matchIterator"

interface HistoryMatch {
  homeId: string | null
  awayId: string | null
  result: MatchResult | null | undefined
}

/** Sum two optional maps into one. Returns `undefined` when both are absent. */
function merge(
  a: Map<string, number> | undefined,
  b: Map<string, number> | undefined
): Map<string, number> | undefined {
  if (!a) return b
  if (!b) return a
  const merged = new Map(a)
  for (const [id, value] of b) merged.set(id, (merged.get(id) ?? 0) + value)
  return merged
}

/**
 * Power adjustments from a single container's own fixture list — one group,
 * one league table, one tier. Used where the simulator has the fixture in
 * hand but not the tournament around it.
 */
export function fixtureAdjustments(
  teamIds: string[],
  matches: HistoryMatch[]
): Map<string, number> | undefined {
  const form = isFormFactorEnabled()
    ? computeFormAdjustments(
        teamIds,
        matches.map((m) => ({
          homeId: m.homeId as string,
          awayId: m.awayId as string,
          result: m.result ?? null,
        }))
      )
    : undefined
  const discipline = isRedCardImpactEnabled()
    ? computeDisciplineAdjustments(teamIds, matches)
    : undefined
  return merge(form, discipline)
}

/**
 * Adjustments derived from every played match in the tournament — group,
 * league, tier, knockout leg and third-place alike. Returns `undefined` when
 * neither form nor discipline is switched on, which is exactly what
 * `simulateMatch` expects.
 */
export function tournamentAdjustments(t: Tournament): Map<string, number> | undefined {
  if (!isFormFactorEnabled() && !isRedCardImpactEnabled()) return undefined
  const history = playedMatches(t).map((e) => ({
    homeId: e.homeId as string,
    awayId: e.awayId as string,
    result: e.result,
  }))
  return fixtureAdjustments(t.teamIds, history)
}
