import type { MatchRow } from "../composables/useTeamMatchHistory"

export interface HeadToHeadSummary {
  played: number
  /** Wins for the team the rows were taken from. */
  winsA: number
  draws: number
  winsB: number
  goalsA: number
  goalsB: number
}

/**
 * Collapse team A's rows against one opponent (B) into a single tally.
 * Rows are already from A's side, so B's numbers are A's mirrored.
 */
export function summarizeHeadToHead(rows: MatchRow[]): HeadToHeadSummary {
  const summary: HeadToHeadSummary = {
    played: rows.length,
    winsA: 0,
    draws: 0,
    winsB: 0,
    goalsA: 0,
    goalsB: 0,
  }
  for (const row of rows) {
    if (row.outcome === "W") summary.winsA++
    else if (row.outcome === "L") summary.winsB++
    else summary.draws++
    summary.goalsA += row.goalsFor
    summary.goalsB += row.goalsAgainst
  }
  return summary
}
