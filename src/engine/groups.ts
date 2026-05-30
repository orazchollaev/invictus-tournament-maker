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
import { simulateMatch } from "./simulation"
import { getTiebreaker } from "./tableConfig"

function h2hStats(
  ids: Set<string>,
  matches: GroupMatch[]
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
    if (home > away) h.pts += 3
    else if (away > home) a.pts += 3
    else {
      h.pts += 1
      a.pts += 1
    }
  }
  return stats
}

function sortStandings(standings: GroupStanding[], matches: GroupMatch[], tiebreaker?: Tiebreaker) {
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
      const h2h = h2hStats(ids, matches)
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
// doubleLeg=true adds the reverse fixture so each pair plays home AND away.
export function buildGroupFixture(teamIds: string[], doubleLeg = false): GroupMatch[] {
  const n = teamIds.length
  if (n < 2) return []

  const teams = [...teamIds]
  if (teams.length % 2 !== 0) teams.push("") // phantom bye for odd counts
  const size = teams.length
  const fixed = teams[0]
  const rotating = teams.slice(1)
  const posMap = new Map(teamIds.map((id, i) => [id, i]))
  const matches: GroupMatch[] = []

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
      matches.push({
        id: uid(),
        homeId: aIsHome ? a : b,
        awayId: aIsHome ? b : a,
        result: null,
      })
    }
    rotating.unshift(rotating.pop()!)
  }

  if (doubleLeg) {
    const reversed: GroupMatch[] = matches.map((m) => ({
      id: uid(),
      homeId: m.awayId,
      awayId: m.homeId,
      result: null,
    }))
    matches.push(...reversed)
  }

  return matches
}

export function recalcStandings(group: Group, tiebreaker?: Tiebreaker) {
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
      hRow.pts += 3
      aRow.lost++
    } else if (away > home) {
      aRow.won++
      aRow.pts += 3
      hRow.lost++
    } else {
      hRow.drawn++
      hRow.pts++
      aRow.drawn++
      aRow.pts++
    }
  }

  sortStandings(group.standings, group.matches, tiebreaker)
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
  recalcStandings(group, tournament.tiebreaker)
}

export function simulateGroupMatch(
  tournament: Tournament,
  groupIdx: number,
  matchIdx: number,
  teams: Team[]
) {
  const group = tournament.groups![groupIdx]
  group.matches[matchIdx].result = simulateMatch(group.matches[matchIdx] as any, teams)
  recalcStandings(group, tournament.tiebreaker)
}

export function simulateGroup(tournament: Tournament, groupIdx: number, teams: Team[]) {
  const group = tournament.groups![groupIdx]
  for (let i = 0; i < group.matches.length; i++) {
    if (!group.matches[i].result) {
      group.matches[i].result = simulateMatch(group.matches[i] as any, teams)
    }
  }
  recalcStandings(group, tournament.tiebreaker)
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
  for (let i = start; i < end; i++) {
    if (!group.matches[i].result)
      group.matches[i].result = simulateMatch(group.matches[i] as any, teams)
  }
  recalcStandings(group, tournament.tiebreaker)
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
    for (let i = start; i < Math.min(end, group.matches.length); i++) {
      if (!group.matches[i].result)
        group.matches[i].result = simulateMatch(group.matches[i] as any, teams)
    }
    recalcStandings(group, tournament.tiebreaker)
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
