// engine/__tests__/league.test.ts
import { describe, expect, it } from "vitest"
import type { Tournament } from "@/modules/tournament/types"
import {
  allLeagueDone,
  allTiersDone,
  buildHalfLeagueMatchdays,
  buildLeagueMatchdays,
  clearLeagueMatchResult,
  getLeagueWinner,
  getTiersWinner,
  isTierDone,
  recalcLeagueStandings,
  setLeagueMatchResult,
  setTierMatchResult,
  simulateAllLeague,
  simulateAllTiers,
  simulateLeagueMatchday,
} from "../league"
import { createLeague, createMultiTierLeague } from "../tournament"
import { expectStandingsConsistent, makeTeams, playLeagueByPower } from "./helpers"

describe("buildLeagueMatchdays", () => {
  it("splits a round-robin into matchdays with no repeat teams", () => {
    const ids = ["a", "b", "c", "d"]
    const matchdays = buildLeagueMatchdays(ids)

    expect(matchdays).toHaveLength(3)
    for (const md of matchdays) {
      expect(md.matches).toHaveLength(2)
      const seen = new Set<string>()
      for (const m of md.matches) {
        expect(seen.has(m.homeId)).toBe(false)
        expect(seen.has(m.awayId)).toBe(false)
        seen.add(m.homeId)
        seen.add(m.awayId)
      }
    }

    const all = matchdays.flatMap((md) => md.matches)
    expect(all).toHaveLength(6) // 4*3/2
    const pairs = new Set(all.map((m) => [m.homeId, m.awayId].sort().join("|")))
    expect(pairs.size).toBe(6)
  })

  it("doubles the season for two-legged leagues", () => {
    const matchdays = buildLeagueMatchdays(["a", "b", "c", "d"], 2)
    expect(matchdays).toHaveLength(6) // 2 * (n-1)
    const all = matchdays.flatMap((md) => md.matches)
    const directions = new Map<string, string[]>()
    for (const m of all) {
      const key = [m.homeId, m.awayId].sort().join("|")
      const list = directions.get(key) ?? []
      list.push(`${m.homeId}>${m.awayId}`)
      directions.set(key, list)
    }
    for (const [key, legs] of directions) {
      expect(legs).toHaveLength(2)
      const [a, b] = key.split("|")
      expect(legs.sort()).toEqual([`${a}>${b}`, `${b}>${a}`].sort())
    }
  })

  it("handles odd team counts", () => {
    const matchdays = buildLeagueMatchdays(["a", "b", "c", "d", "e"])
    const all = matchdays.flatMap((md) => md.matches)
    expect(all).toHaveLength(10) // 5*4/2
    for (const id of ["a", "b", "c", "d", "e"]) {
      expect(all.filter((m) => m.homeId === id || m.awayId === id)).toHaveLength(4)
    }
  })
})

describe("buildHalfLeagueMatchdays", () => {
  it("produces roughly half the matches of a single round-robin", () => {
    const ids = ["a", "b", "c", "d", "e", "f"]
    const full = buildLeagueMatchdays(ids)
    const fullCount = full.flatMap((md) => md.matches).length // 6*5/2 = 15

    const half = buildHalfLeagueMatchdays(ids)
    const halfCount = half.flatMap((md) => md.matches).length
    expect(halfCount).toBe(Math.ceil(fullCount / 2))
  })

  it("never repeats a team within the same matchday", () => {
    const ids = ["a", "b", "c", "d", "e", "f", "g", "h"]
    const matchdays = buildHalfLeagueMatchdays(ids)
    for (const md of matchdays) {
      const seen = new Set<string>()
      for (const m of md.matches) {
        expect(seen.has(m.homeId)).toBe(false)
        expect(seen.has(m.awayId)).toBe(false)
        seen.add(m.homeId)
        seen.add(m.awayId)
      }
    }
  })

  it("never pairs the same two teams twice", () => {
    const ids = ["a", "b", "c", "d", "e", "f"]
    const matchdays = buildHalfLeagueMatchdays(ids)
    const all = matchdays.flatMap((md) => md.matches)
    const pairs = all.map((m) => [m.homeId, m.awayId].sort().join("|"))
    expect(new Set(pairs).size).toBe(pairs.length)
  })

  it("returns nothing for fewer than two teams", () => {
    expect(buildHalfLeagueMatchdays(["a"])).toEqual([])
  })
})

describe("recalcLeagueStandings", () => {
  it("computes a consistent table and ranks by points", () => {
    const t = createLeague("L", makeTeams(4), 1) as Tournament
    playLeagueByPower(t, makeTeams(4))

    const table = t.league!.standings
    expect(table[0].teamId).toBe("t1")
    expect(table[0].pts).toBe(9)
    expect(table[3].teamId).toBe("t4")
    expect(table[3].pts).toBe(0)
    expectStandingsConsistent(table)
  })

  it("honors head-to-head between equal-points teams", () => {
    const t = createLeague("L", makeTeams(4), 1) as Tournament

    // Direction-agnostic: winner per sorted pair. t1 and t2 tie on 6 pts,
    // t1 with the better gd, but t2 won the direct match.
    const winnerOf: Record<string, string> = {
      "t1|t2": "t2",
      "t1|t3": "t1",
      "t1|t4": "t1",
      "t2|t3": "t2",
      "t2|t4": "t4",
      "t3|t4": "",
    }
    for (const md of t.league!.matchdays) {
      for (const m of md.matches) {
        const [x, y] = [m.homeId, m.awayId].sort()
        const winner = winnerOf[`${x}|${y}`]
        if (!winner) {
          m.result = { home: 0, away: 0 }
        } else {
          const homeWins = m.homeId === winner
          m.result = homeWins ? { home: 1, away: 0 } : { home: 0, away: 1 }
        }
      }
    }

    recalcLeagueStandings(t.league!, "goal-diff")
    expect(t.league!.standings[0].teamId).toBe("t1") // better gd
    recalcLeagueStandings(t.league!, "head-to-head")
    expect(t.league!.standings[0].teamId).toBe("t2") // won the direct match
    expectStandingsConsistent(t.league!.standings)
  })
})

describe("setLeagueMatchResult / clear", () => {
  it("updates and resets the table", () => {
    const t = createLeague("L", makeTeams(4), 1) as Tournament
    const first = t.league!.matchdays[0].matches[0]
    const homeId = first.homeId

    setLeagueMatchResult(t, 0, 0, 5, 2)
    const row = t.league!.standings.find((s) => s.teamId === homeId)!
    expect(row.won).toBe(1)
    expect(row.pts).toBe(3)
    expect(row.gf).toBe(5)

    clearLeagueMatchResult(t, 0, 0)
    const cleared = t.league!.standings.find((s) => s.teamId === homeId)!
    expect(cleared.played).toBe(0)
    expect(cleared.pts).toBe(0)
  })
})

describe("league simulation", () => {
  it("simulates the whole season and crowns a winner", () => {
    const teams = makeTeams(6)
    const t = createLeague("L", teams, 1) as Tournament

    expect(allLeagueDone(t)).toBe(false)
    expect(getLeagueWinner(t)).toBeNull()

    simulateAllLeague(t, teams)

    expect(allLeagueDone(t)).toBe(true)
    for (const s of t.league!.standings) expect(s.played).toBe(5)
    expectStandingsConsistent(t.league!.standings)

    const winner = getLeagueWinner(t)
    expect(winner).toBe(t.league!.standings[0].teamId)
  })

  it("simulateLeagueMatchday only plays the requested day", () => {
    const teams = makeTeams(4)
    const t = createLeague("L", teams, 1) as Tournament

    simulateLeagueMatchday(t, 0, teams)
    expect(t.league!.matchdays[0].matches.every((m) => m.result)).toBe(true)
    expect(t.league!.matchdays[1].matches.every((m) => m.result === null)).toBe(true)
    expect(allLeagueDone(t)).toBe(false)
  })
})

describe("multi-tier leagues", () => {
  function tiered(): { t: Tournament; teams: ReturnType<typeof makeTeams> } {
    const teams = makeTeams(8)
    const t = createMultiTierLeague(
      "T",
      [
        { name: "Div 1", teams: teams.slice(0, 4) },
        { name: "Div 2", teams: teams.slice(4) },
      ],
      1,
      "single",
      2
    ) as Tournament
    return { t, teams }
  }

  it("builds independent leagues per tier", () => {
    const { t } = tiered()
    expect(t.tiers).toHaveLength(2)
    expect(t.tiers![0].league.matchdays).toHaveLength(3)
    expect(t.tiers![1].league.matchdays).toHaveLength(3)
    expect(t.promotionCount).toBe(2)
    expect(t.teamIds).toHaveLength(8)
  })

  it("simulates each tier and detects completion", () => {
    const { t, teams } = tiered()
    expect(allTiersDone(t)).toBe(false)
    expect(isTierDone(t, 0)).toBe(false)

    simulateAllTiers(t, teams)

    expect(allTiersDone(t)).toBe(true)
    expect(isTierDone(t, 0)).toBe(true)
    expect(isTierDone(t, 1)).toBe(true)
    for (const tier of t.tiers!) expectStandingsConsistent(tier.league.standings)

    // Power-based deterministic check on a fresh fixture.
    const fresh = tiered().t
    playLeagueByPower(fresh, teams)
    expect(fresh.tiers![0].league.standings[0].teamId).toBe("t1")
    expect(fresh.tiers![1].league.standings[0].teamId).toBe("t5")
    expect(getTiersWinner(fresh)).toBe("t1")
  })

  it("setTierMatchResult only affects the targeted tier", () => {
    const { t } = tiered()
    const tier0 = t.tiers![0]
    const m = tier0.league.matchdays[0].matches[0]
    const homeId = m.homeId

    setTierMatchResult(t, 0, 0, 0, 3, 0)
    const row = tier0.league.standings.find((s) => s.teamId === homeId)!
    expect(row.won).toBe(1)
    expect(row.pts).toBe(3)
    expect(t.tiers![1].league.standings.every((s) => s.played === 0)).toBe(true)
  })
})

describe("league winner via tournament helpers", () => {
  it("getLeagueWinner requires a completed season", () => {
    const teams = makeTeams(4)
    const leagueT = createLeague("L", teams, 1) as Tournament
    expect(getLeagueWinner(leagueT)).toBeNull()
    playLeagueByPower(leagueT, teams)
    expect(getLeagueWinner(leagueT)).toBe("t1")
  })
})
