// engine/groups.ts
import type { Team } from "../modules/teams/types"
import type { Group, GroupMatch, Tournament } from "../modules/tournament/types"
import { uid } from "./utils"
import { simulateMatch } from "./simulation"

// ─── Round-robin fixture builder (circle method) ────────────────
// Groups matches by round so no team plays twice in the same round.
// Home/away alternates per pair to balance home games (±1 over the season).
export function buildGroupFixture(teamIds: string[]): GroupMatch[] {
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

  return matches
}

export function recalcStandings(group: Group) {
  // Reset
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

  for (const match of group.matches) {
    if (!match.result) continue
    const { home, away } = match.result
    const hRow = group.standings.find((s) => s.teamId === match.homeId)
    const aRow = group.standings.find((s) => s.teamId === match.awayId)
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

  // Sort: pts → gd → gf
  group.standings.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)
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
  recalcStandings(group)
}

export function simulateGroupMatch(
  tournament: Tournament,
  groupIdx: number,
  matchIdx: number,
  teams: Team[]
) {
  const match = tournament.groups![groupIdx].matches[matchIdx]
  match.result = simulateMatch(match as any, teams)
  recalcStandings(tournament.groups![groupIdx])
}

export function simulateGroup(tournament: Tournament, groupIdx: number, teams: Team[]) {
  const group = tournament.groups![groupIdx]
  for (let i = 0; i < group.matches.length; i++) {
    if (!group.matches[i].result) {
      simulateGroupMatch(tournament, groupIdx, i, teams)
    }
  }
}

export function simulateAllGroups(tournament: Tournament, teams: Team[]) {
  if (!tournament.groups) return
  for (let g = 0; g < tournament.groups.length; g++) {
    simulateGroup(tournament, g, teams)
  }
}

export function allGroupsDone(tournament: Tournament): boolean {
  if (!tournament.groups) return true
  return tournament.groups.every((g) => g.matches.every((m) => m.result !== null))
}
