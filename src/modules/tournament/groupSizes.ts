/**
 * How the groups actually fill up.
 *
 * `buildGroupTournament` deals teams round robin (`i % groupCount`), so when
 * the squad does not divide evenly the first `teamCount % groupCount` groups
 * end up exactly one team larger than the rest. That means an uneven draw
 * always produces precisely two group sizes — never three — which is why this
 * returns a pair rather than a list.
 */
export interface GroupSizeSplit {
  /** The `base + 1` groups. `count` is 0 when the draw divides evenly. */
  larger: { count: number; size: number }
  /** The `base` groups. On an even draw this is every group. */
  smaller: { count: number; size: number }
  isEven: boolean
}

export function groupSizeSplit(teamCount: number, groupCount: number): GroupSizeSplit | null {
  if (groupCount <= 0 || teamCount <= 0) return null
  const base = Math.floor(teamCount / groupCount)
  const extra = teamCount % groupCount
  return {
    larger: { count: extra, size: base + 1 },
    smaller: { count: groupCount - extra, size: base },
    isEven: extra === 0,
  }
}
