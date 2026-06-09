// engine/groups.ts
import type { Team } from "../modules/teams/types"
import type {
  Group,
  GroupMatch,
  GroupStanding,
  Tiebreaker,
  Tournament,
} from "../modules/tournament/types"
import { uid } from "./utils"
import { simulateMatch, isFormFactorEnabled, computeFormAdjustments } from "./simulation"
import { getTiebreaker } from "./tableConfig"

function h2hStats(
  ids: Set<string>,
  matches: GroupMatch[],
  winPts = 3,
  drawPts = 1
): Map<string, { pts: number; gd: number; gf: number }> {
  const stats = new Map<string, { pts: number; gd: number; gf: number }>()
  for (const id of ids) stats.set(id, { pts: 0, gd: 0, gf: 0 })
  for (const m of matches) {
    if (!m.result || !ids.has(m.homeId) || !ids.has(m.awayId)) continue
    const { home, away } = m.result
    const h = stats.get(m.homeId)!
    const a = stats.get(m.awayId)!
    h.gf += home
    h.gd += home - away
    a.gf += away
    a.gd += away - home
    if (home > away) h.pts += winPts
    else if (away > home) a.pts += winPts
    else {
      h.pts += drawPts
      a.pts += drawPts
    }
  }
  return stats
}

function sortStandings(
  standings: GroupStanding[],
  matches: GroupMatch[],
  tiebreaker?: Tiebreaker,
  winPts = 3,
  drawPts = 1
) {
  standings.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)

  if ((tiebreaker ?? getTiebreaker()) !== "head-to-head") return

  // Re-sort within tied-points groups using H2H
  let i = 0
  while (i < standings.length) {
    let j = i + 1
    while (j < standings.length && standings[j].pts === standings[i].pts) j++
    if (j - i > 1) {
      const group = standings.slice(i, j)
      const ids = new Set(group.map((s) => s.teamId))
      const h2h = h2hStats(ids, matches, winPts, drawPts)
      group.sort((a, b) => {
        const ha = h2h.get(a.teamId)!
        const hb = h2h.get(b.teamId)!
        return hb.pts - ha.pts || hb.gd - ha.gd || hb.gf - ha.gf || b.gd - a.gd || b.gf - a.gf
      })
      standings.splice(i, j - i, ...group)
    }
    i = j
  }
}

// ─── Round-robin fixture builder (circle method) ────────────────
// Groups matches by round so no team plays twice in the same round.
// Home/away alternates per pair to balance home games (±1 over the season).
// legs=N repeats the fixture N times, alternating direction each leg.
export function buildGroupFixture(teamIds: string[], legs = 1): GroupMatch[] {
  const n = teamIds.length
  if (n < 2) return []

  const teams = [...teamIds]
  if (teams.length % 2 !== 0) teams.push("") // phantom bye for odd counts
  const size = teams.length
  const fixed = teams[0]
  const rotating = teams.slice(1)
  const posMap = new Map(teamIds.map((id, i) => [id, i]))

  // Build one set of round-robin pairs with home/away assigned
  const basePairs: Array<[string, string]> = []
  for (let r = 0; r < size - 1; r++) {
    const circle = [fixed, ...rotating]
    for (let i = 0; i < size / 2; i++) {
      const a = circle[i]
      const b = circle[size - 1 - i]
      if (!a || !b) continue
      const posA = posMap.get(a) ?? 0
      const posB = posMap.get(b) ?? 0
      const sum = posA + posB
      // Even sum → lower index is home; odd sum → higher index is home
      const aIsHome = sum % 2 === 0 ? posA < posB : posA > posB
      basePairs.push([aIsHome ? a : b, aIsHome ? b : a])
    }
    rotating.unshift(rotating.pop()!)
  }

  const matches: GroupMatch[] = []
  for (let leg = 0; leg < legs; leg++) {
    for (const [home, away] of basePairs) {
      // Even legs: original direction; odd legs: reversed
      const [h, a] = leg % 2 === 0 ? [home, away] : [away, home]
      matches.push({ id: uid(), homeId: h, awayId: a, result: null })
    }
  }
  return matches
}

export function recalcStandings(
  group: Group,
  tiebreaker?: Tiebreaker,
  winPts = 3,
  drawPts = 1,
  lossPts = 0
) {
  group.standings.forEach((s) => {
    s.played = 0
    s.won = 0
    s.drawn = 0
    s.lost = 0
    s.gf = 0
    s.ga = 0
    s.gd = 0
    s.pts = 0
  })

  const byId = new Map(group.standings.map((s) => [s.teamId, s]))

  for (const match of group.matches) {
    if (!match.result) continue
    const { home, away } = match.result
    const hRow = byId.get(match.homeId)
    const aRow = byId.get(match.awayId)
    if (!hRow || !aRow) continue

    hRow.played++
    aRow.played++
    hRow.gf += home
    hRow.ga += away
    aRow.gf += away
    aRow.ga += home
    hRow.gd = hRow.gf - hRow.ga
    aRow.gd = aRow.gf - aRow.ga

    if (home > away) {
      hRow.won++
      hRow.pts += winPts
      aRow.lost++
      aRow.pts += lossPts
    } else if (away > home) {
      aRow.won++
      aRow.pts += winPts
      hRow.lost++
      hRow.pts += lossPts
    } else {
      hRow.drawn++
      hRow.pts += drawPts
      aRow.drawn++
      aRow.pts += drawPts
    }
  }

  sortStandings(group.standings, group.matches, tiebreaker, winPts, drawPts)
}

export function setGroupMatchResult(
  tournament: Tournament,
  groupIdx: number,
  matchIdx: number,
  home: number,
  away: number
) {
  const group = tournament.groups![groupIdx]
  group.matches[matchIdx].result = { home, away }
  recalcStandings(
    group,
    tournament.tiebreaker,
    tournament.winPoints ?? 3,
    tournament.drawPoints ?? 1,
    tournament.lossPoints ?? 0
  )
}

export function simulateGroupMatch(
  tournament: Tournament,
  groupIdx: number,
  matchIdx: number,
  teams: Team[]
) {
  const group = tournament.groups![groupIdx]
  const form = isFormFactorEnabled()
    ? computeFormAdjustments(group.teamIds, group.matches)
    : undefined
  group.matches[matchIdx].result = simulateMatch(group.matches[matchIdx] as any, teams, form)
  recalcStandings(
    group,
    tournament.tiebreaker,
    tournament.winPoints ?? 3,
    tournament.drawPoints ?? 1,
    tournament.lossPoints ?? 0
  )
}

export function simulateGroup(tournament: Tournament, groupIdx: number, teams: Team[]) {
  const group = tournament.groups![groupIdx]
  for (let i = 0; i < group.matches.length; i++) {
    if (!group.matches[i].result) {
      const form = isFormFactorEnabled()
        ? computeFormAdjustments(group.teamIds, group.matches)
        : undefined
      group.matches[i].result = simulateMatch(group.matches[i] as any, teams, form)
    }
  }
  recalcStandings(
    group,
    tournament.tiebreaker,
    tournament.winPoints ?? 3,
    tournament.drawPoints ?? 1,
    tournament.lossPoints ?? 0
  )
}

export function simulateAllGroups(tournament: Tournament, teams: Team[]) {
  if (!tournament.groups) return
  for (let g = 0; g < tournament.groups.length; g++) {
    simulateGroup(tournament, g, teams)
  }
}

export function simulateGroupWeek(tournament: Tournament, groupIdx: number, teams: Team[]): number {
  const group = tournament.groups![groupIdx]
  const n = group.teamIds.length
  const mpr = Math.floor(n / 2)
  if (mpr < 1) return -1
  const first = group.matches.findIndex((m) => !m.result)
  if (first === -1) return -1
  const roundIdx = Math.floor(first / mpr)
  const start = roundIdx * mpr
  const end = Math.min(start + mpr, group.matches.length)
  const form = isFormFactorEnabled()
    ? computeFormAdjustments(group.teamIds, group.matches)
    : undefined
  for (let i = start; i < end; i++) {
    if (!group.matches[i].result)
      group.matches[i].result = simulateMatch(group.matches[i] as any, teams, form)
  }
  recalcStandings(
    group,
    tournament.tiebreaker,
    tournament.winPoints ?? 3,
    tournament.drawPoints ?? 1,
    tournament.lossPoints ?? 0
  )
  return roundIdx
}

export function simulateWeek(tournament: Tournament, teams: Team[]): number {
  if (!tournament.groups) return -1
  let simulatedRound = -1
  for (const group of tournament.groups) {
    const n = group.teamIds.length
    const matchesPerRound = Math.floor(n / 2)
    if (matchesPerRound < 1) continue
    const firstUnplayed = group.matches.findIndex((m) => !m.result)
    if (firstUnplayed === -1) continue
    const roundIdx = Math.floor(firstUnplayed / matchesPerRound)
    const start = roundIdx * matchesPerRound
    const end = start + matchesPerRound
    const form = isFormFactorEnabled()
      ? computeFormAdjustments(group.teamIds, group.matches)
      : undefined
    for (let i = start; i < Math.min(end, group.matches.length); i++) {
      if (!group.matches[i].result)
        group.matches[i].result = simulateMatch(group.matches[i] as any, teams, form)
    }
    recalcStandings(
      group,
      tournament.tiebreaker,
      tournament.winPoints ?? 3,
      tournament.drawPoints ?? 1,
      tournament.lossPoints ?? 0
    )
    simulatedRound = roundIdx
  }
  return simulatedRound
}

export function allGroupsDone(tournament: Tournament): boolean {
  if (!tournament.groups) return true
  return tournament.groups.every((g) => g.matches.every((m) => m.result !== null))
}

// Returns the best `count` teams at rank `rankIdx` (0-based) across all groups,
// sorted by pts → gd → gf. Used for wildcard / best-runner-up advancement.
export function selectWildcards(
  groups: Group[],
  rankIdx: number,
  count: number,
  teams: Team[]
): { team: Team; fromGroupIdx: number }[] {
  const candidates: { team: Team; pts: number; gd: number; gf: number; fromGroupIdx: number }[] = []
  for (let g = 0; g < groups.length; g++) {
    const s = groups[g].standings[rankIdx]
    if (!s) continue
    const team = teams.find((t) => t.id === s.teamId)
    if (!team) continue
    candidates.push({ team, pts: s.pts, gd: s.gd, gf: s.gf, fromGroupIdx: g })
  }
  candidates.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)
  return candidates.slice(0, count).map((c) => ({ team: c.team, fromGroupIdx: c.fromGroupIdx }))
}
