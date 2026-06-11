// engine/league.ts
import type { Team } from "../modules/teams/types"
import type {
  GroupStanding,
  League,
  LeagueTier,
  Tiebreaker,
  Tournament,
} from "../modules/tournament/types"
import { buildGroupFixture } from "./groups"
import { simulateMatch, isFormFactorEnabled, computeFormAdjustments } from "./simulation"
import { getTiebreaker } from "./tableConfig"

function h2hLeagueStats(
  ids: Set<string>,
  matchdays: League["matchdays"],
  winPts = 3,
  drawPts = 1
): Map<string, { pts: number; gd: number; gf: number }> {
  const stats = new Map<string, { pts: number; gd: number; gf: number }>()
  for (const id of ids) stats.set(id, { pts: 0, gd: 0, gf: 0 })
  for (const md of matchdays) {
    for (const m of md.matches) {
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
  }
  return stats
}

function sortLeagueStandings(
  standings: GroupStanding[],
  matchdays: League["matchdays"],
  tiebreaker?: Tiebreaker,
  winPts = 3,
  drawPts = 1
) {
  standings.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)

  if ((tiebreaker ?? getTiebreaker()) !== "head-to-head") return

  let i = 0
  while (i < standings.length) {
    let j = i + 1
    while (j < standings.length && standings[j].pts === standings[i].pts) j++
    if (j - i > 1) {
      const group = standings.slice(i, j)
      const ids = new Set(group.map((s) => s.teamId))
      const h2h = h2hLeagueStats(ids, matchdays, winPts, drawPts)
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

export function buildLeagueMatchdays(teamIds: string[], legs = 1): League["matchdays"] {
  const allMatches = buildGroupFixture(teamIds, legs)
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

export function recalcLeagueStandings(
  league: League,
  tiebreaker?: Tiebreaker,
  winPts = 3,
  drawPts = 1,
  lossPts = 0,
  pointAdjustments?: Record<string, number>
) {
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
  }
  if (pointAdjustments) {
    for (const s of league.standings) {
      const adj = pointAdjustments[s.teamId]
      if (adj) s.pts += adj
    }
  }
  sortLeagueStandings(league.standings, league.matchdays, tiebreaker, winPts, drawPts)
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
  recalcLeagueStandings(
    tournament.league,
    tournament.tiebreaker,
    tournament.winPoints ?? 3,
    tournament.drawPoints ?? 1,
    tournament.lossPoints ?? 0,
    tournament.teamPointAdjustments
  )
}

export function simulateLeagueMatch(
  tournament: Tournament,
  matchdayIdx: number,
  matchIdx: number,
  teams: Team[]
) {
  if (!tournament.league) return
  const match = tournament.league.matchdays[matchdayIdx].matches[matchIdx]
  const form = isFormFactorEnabled()
    ? computeFormAdjustments(
        tournament.teamIds,
        tournament.league.matchdays.flatMap((md) => md.matches)
      )
    : undefined
  match.result = simulateMatch(match as any, teams, form)
  recalcLeagueStandings(
    tournament.league,
    tournament.tiebreaker,
    tournament.winPoints ?? 3,
    tournament.drawPoints ?? 1,
    tournament.lossPoints ?? 0,
    tournament.teamPointAdjustments
  )
}

export function simulateLeagueMatchday(tournament: Tournament, matchdayIdx: number, teams: Team[]) {
  if (!tournament.league) return
  const form = isFormFactorEnabled()
    ? computeFormAdjustments(
        tournament.teamIds,
        tournament.league.matchdays.flatMap((md) => md.matches)
      )
    : undefined
  for (const match of tournament.league.matchdays[matchdayIdx].matches) {
    if (!match.result) match.result = simulateMatch(match as any, teams, form)
  }
  recalcLeagueStandings(
    tournament.league,
    tournament.tiebreaker,
    tournament.winPoints ?? 3,
    tournament.drawPoints ?? 1,
    tournament.lossPoints ?? 0,
    tournament.teamPointAdjustments
  )
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

// ─── Multi-tier helpers ──────────────────────────────────────────

function getTier(tournament: Tournament, tierIdx: number): LeagueTier | undefined {
  return tournament.tiers?.[tierIdx]
}

export function setTierMatchResult(
  tournament: Tournament,
  tierIdx: number,
  matchdayIdx: number,
  matchIdx: number,
  home: number,
  away: number
) {
  const tier = getTier(tournament, tierIdx)
  if (!tier) return
  tier.league.matchdays[matchdayIdx].matches[matchIdx].result = { home, away }
  recalcLeagueStandings(
    tier.league,
    tournament.tiebreaker,
    tournament.winPoints ?? 3,
    tournament.drawPoints ?? 1,
    tournament.lossPoints ?? 0,
    tournament.teamPointAdjustments
  )
}

export function simulateTierMatch(
  tournament: Tournament,
  tierIdx: number,
  matchdayIdx: number,
  matchIdx: number,
  teams: Team[]
) {
  const tier = getTier(tournament, tierIdx)
  if (!tier) return
  const match = tier.league.matchdays[matchdayIdx].matches[matchIdx]
  const form = isFormFactorEnabled()
    ? computeFormAdjustments(
        tier.teamIds,
        tier.league.matchdays.flatMap((md) => md.matches)
      )
    : undefined
  match.result = simulateMatch(match as any, teams, form)
  recalcLeagueStandings(
    tier.league,
    tournament.tiebreaker,
    tournament.winPoints ?? 3,
    tournament.drawPoints ?? 1,
    tournament.lossPoints ?? 0,
    tournament.teamPointAdjustments
  )
}

export function simulateTierMatchday(
  tournament: Tournament,
  tierIdx: number,
  matchdayIdx: number,
  teams: Team[]
) {
  const tier = getTier(tournament, tierIdx)
  if (!tier) return
  const form = isFormFactorEnabled()
    ? computeFormAdjustments(
        tier.teamIds,
        tier.league.matchdays.flatMap((md) => md.matches)
      )
    : undefined
  for (const match of tier.league.matchdays[matchdayIdx].matches) {
    if (!match.result) match.result = simulateMatch(match as any, teams, form)
  }
  recalcLeagueStandings(
    tier.league,
    tournament.tiebreaker,
    tournament.winPoints ?? 3,
    tournament.drawPoints ?? 1,
    tournament.lossPoints ?? 0,
    tournament.teamPointAdjustments
  )
}

export function simulateAllTier(tournament: Tournament, tierIdx: number, teams: Team[]) {
  const tier = getTier(tournament, tierIdx)
  if (!tier) return
  for (let i = 0; i < tier.league.matchdays.length; i++) {
    simulateTierMatchday(tournament, tierIdx, i, teams)
  }
}

export function simulateAllTiers(tournament: Tournament, teams: Team[]) {
  if (!tournament.tiers?.length) return
  for (let i = 0; i < tournament.tiers.length; i++) {
    simulateAllTier(tournament, i, teams)
  }
}

export function allTiersDone(tournament: Tournament): boolean {
  if (!tournament.tiers?.length) return false
  return tournament.tiers.every((tier) =>
    tier.league.matchdays.every((md) => md.matches.every((m) => m.result !== null))
  )
}

export function getTiersWinner(tournament: Tournament): string | null {
  if (!allTiersDone(tournament)) return null
  return tournament.tiers?.[0]?.league.standings[0]?.teamId ?? null
}
