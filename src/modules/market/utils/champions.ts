import type { WeeklyTally } from "../types"

/**
 * The week's winner: most downloads, and on a tie the one already on record
 * stays (firestore.rules only lets a strictly higher count replace it), else
 * the lowest uid so every device picks the same one.
 */
export function topOfWeek(rows: WeeklyTally[], recorded?: WeeklyTally | null): WeeklyTally | null {
  let best: WeeklyTally | null = recorded ?? null
  for (const row of rows) {
    if (row.count <= 0) continue
    if (
      !best ||
      row.count > best.count ||
      (row.count === best.count && !recorded && row.authorUid < best.authorUid)
    ) {
      best = row
    }
  }
  return best
}

/** How many weeks each creator has won, by uid. */
export function tallyWins(winners: WeeklyTally[]): Map<string, number> {
  const wins = new Map<string, number>()
  for (const w of winners) wins.set(w.authorUid, (wins.get(w.authorUid) ?? 0) + 1)
  return wins
}

/**
 * The weeks whose winner still has to be settled: every finished week since
 * the last one on record, capped at `maxBack` so a long quiet spell does not
 * turn one screen visit into dozens of queries. The latest finished week is
 * always included, so a record written early by a stale client gets corrected.
 */
export function weeksToSettle(currentWeek: number, recordedWeeks: number[], maxBack = 8): number[] {
  const lastFinished = currentWeek - 1
  const latest = recordedWeeks.length ? Math.max(...recordedWeeks) : -Infinity
  const from = Math.max(latest + 1, lastFinished - maxBack + 1)
  const weeks: number[] = []
  for (let w = Math.min(from, lastFinished); w <= lastFinished; w++) weeks.push(w)
  return weeks
}
