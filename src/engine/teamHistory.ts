// engine/teamHistory.ts
//
// Form, morale, fatigue and discipline each want "this team's played matches,
// oldest first". Each used to filter the whole list once per team, which is
// teams x matches per call; a 60-team double round robin made that ~200 000
// steps per adjustment, per matchday simulated. One pass buckets them all.

interface HistoryEntry {
  homeId: string | null
  awayId: string | null
  result?: unknown
}

/** Every listed team's played matches, in the order given. Teams with none map to []. */
export function playedByTeam<M extends HistoryEntry>(
  teamIds: Iterable<string>,
  matches: readonly M[]
): Map<string, M[]> {
  const byTeam = new Map<string, M[]>()
  for (const id of teamIds) byTeam.set(id, [])
  for (const m of matches) {
    if (m.result == null) continue
    if (m.homeId) byTeam.get(m.homeId)?.push(m)
    // A team drawn against itself would otherwise count the match twice.
    if (m.awayId && m.awayId !== m.homeId) byTeam.get(m.awayId)?.push(m)
  }
  return byTeam
}
