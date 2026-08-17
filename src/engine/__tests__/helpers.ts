// engine/__tests__/helpers.ts
// Shared factories used across the engine test suites.
import { expect } from "vitest"
import type { Team } from "../../modules/teams/types"
import type { Group, GroupStanding, League, Tournament } from "../../modules/tournament/types"
import { buildGroupFixture, recalcStandings } from "../groups"
import { recalcLeagueStandings } from "../league"

/** N teams with strictly decreasing power (t1 strongest … tN weakest). */
export function makeTeams(count: number): Team[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `t${i + 1}`,
    name: `Team ${i + 1}`,
    color: "#333333",
    power: 100 - i * 5,
  }))
}

export function makeStandingRows(teamIds: string[]): GroupStanding[] {
  return teamIds.map((teamId) => ({
    teamId,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    gf: 0,
    ga: 0,
    gd: 0,
    pts: 0,
  }))
}

export function makeGroup(teamIds: string[], legs = 1, name = "Group A"): Group {
  return {
    name,
    teamIds,
    matches: buildGroupFixture(teamIds, legs),
    standings: makeStandingRows(teamIds),
  }
}

/**
 * Play every match of a group with a deterministic scoring rule and recompute
 * the table. `scores(home, away)` returns the [home, away] goals.
 */
export function playGroupByRule(
  group: Group,
  teams: Team[],
  scores: (home: Team, away: Team) => [number, number]
) {
  const byId = new Map(teams.map((t) => [t.id, t]))
  for (const m of group.matches) {
    const home = byId.get(m.homeId)
    const away = byId.get(m.awayId)
    if (!home || !away) continue
    const [h, a] = scores(home, away)
    m.result = { home: h, away: a }
  }
  recalcStandings(group, "goal-diff")
}

/** Stronger team always beats the weaker one 2-0 (power decides everything). */
export function powerWins(home: Team, away: Team): [number, number] {
  return home.power > away.power ? [2, 0] : [0, 2]
}

/**
 * Play every match of the given league (or every league of a tournament,
 * single-tier and multi-tier alike) with the stronger team winning 1-0.
 */
export function playLeagueByPower(target: Tournament | League, teams: Team[]) {
  const leagues: League[] =
    "matchdays" in target
      ? [target]
      : [...(target.league ? [target.league] : []), ...(target.tiers ?? []).map((t) => t.league)]
  const byId = new Map(teams.map((t) => [t.id, t]))
  for (const league of leagues) {
    for (const md of league.matchdays) {
      for (const m of md.matches) {
        const home = byId.get(m.homeId)
        const away = byId.get(m.awayId)
        if (!home || !away) continue
        m.result = home.power > away.power ? { home: 1, away: 0 } : { home: 0, away: 1 }
      }
    }
    recalcLeagueStandings(league, "goal-diff")
  }
}

/** Aggregate sanity checks on a standings table after a full round-robin. */
export function expectStandingsConsistent(standings: GroupStanding[]) {
  for (const s of standings) {
    expect(s.played).toBe(s.won + s.drawn + s.lost)
    expect(s.gd).toBe(s.gf - s.ga)
    expect(s.pts).toBe(3 * s.won + s.drawn)
  }
  // Wins and losses balance across the table.
  const wins = standings.reduce((n, s) => n + s.won, 0)
  const losses = standings.reduce((n, s) => n + s.lost, 0)
  const draws = standings.reduce((n, s) => n + s.drawn, 0)
  expect(wins).toBe(losses)
  expect((wins + losses + draws) % 2).toBe(0)
}

export { recalcStandings }
export type { League }
