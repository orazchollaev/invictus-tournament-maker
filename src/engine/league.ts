// engine/league.ts
import type { Team } from "../modules/teams/types"
import type { League, Tournament } from "../modules/tournament/types"
import { buildGroupFixture } from "./groups"
import { simulateMatch } from "./simulation"

export function buildLeagueMatchdays(teamIds: string[], doubleLeg = false): League["matchdays"] {
  const allMatches = buildGroupFixture(teamIds, doubleLeg)
  const mpr = Math.floor(teamIds.length / 2)
  if (mpr < 1) return []

  const matchdays: League["matchdays"] = []
  for (let i = 0; i < allMatches.length; i += mpr) {
    matchdays.push({
      name: `Matchday ${matchdays.length + 1}`,
      matches: allMatches.slice(i, i + mpr),
    })
  }
  return matchdays
}

export function recalcLeagueStandings(league: League) {
  league.standings.forEach((s) => {
    s.played = s.won = s.drawn = s.lost = s.gf = s.ga = s.gd = s.pts = 0
  })
  const byId = new Map(league.standings.map((s) => [s.teamId, s]))
  for (const matchday of league.matchdays) {
    for (const match of matchday.matches) {
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
  }
  league.standings.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)
}

export function setLeagueMatchResult(
  tournament: Tournament,
  matchdayIdx: number,
  matchIdx: number,
  home: number,
  away: number
) {
  if (!tournament.league) return
  tournament.league.matchdays[matchdayIdx].matches[matchIdx].result = { home, away }
  recalcLeagueStandings(tournament.league)
}

export function simulateLeagueMatch(
  tournament: Tournament,
  matchdayIdx: number,
  matchIdx: number,
  teams: Team[]
) {
  if (!tournament.league) return
  const match = tournament.league.matchdays[matchdayIdx].matches[matchIdx]
  match.result = simulateMatch(match as any, teams)
  recalcLeagueStandings(tournament.league)
}

export function simulateLeagueMatchday(tournament: Tournament, matchdayIdx: number, teams: Team[]) {
  if (!tournament.league) return
  for (const match of tournament.league.matchdays[matchdayIdx].matches) {
    if (!match.result) match.result = simulateMatch(match as any, teams)
  }
  recalcLeagueStandings(tournament.league)
}

export function simulateAllLeague(tournament: Tournament, teams: Team[]) {
  if (!tournament.league) return
  for (let i = 0; i < tournament.league.matchdays.length; i++) {
    simulateLeagueMatchday(tournament, i, teams)
  }
}

export function allLeagueDone(tournament: Tournament): boolean {
  if (!tournament.league) return false
  return tournament.league.matchdays.every((md) => md.matches.every((m) => m.result !== null))
}

export function getLeagueWinner(tournament: Tournament): string | null {
  if (!tournament.league || !allLeagueDone(tournament)) return null
  return tournament.league.standings[0]?.teamId ?? null
}
