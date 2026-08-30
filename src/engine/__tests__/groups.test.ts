// engine/__tests__/groups.test.ts
import { describe, expect, it } from "vitest"
import type { Team } from "@/modules/teams/types"
import type { GroupStanding, Tournament } from "@/modules/tournament/types"
import {
  allGroupsDone,
  buildGroupFixture,
  clearGroupMatchResult,
  recalcStandings,
  selectWildcards,
  setGroupMatchResult,
  simulateAllGroups,
  simulateGroup,
  simulateGroupWeek,
  simulateWeek,
} from "../groups"
import { createTournament } from "../tournament"
import { expectStandingsConsistent, makeGroup, makeTeams, playGroupByRule } from "./helpers"

describe("buildGroupFixture", () => {
  it("builds a single round-robin: every pair meets exactly once", () => {
    const teams = ["a", "b", "c", "d"]
    const matches = buildGroupFixture(teams)

    expect(matches).toHaveLength(6) // n*(n-1)/2

    const pairs = new Set<string>()
    for (const m of matches) {
      const key = [m.homeId, m.awayId].sort().join("|")
      expect(pairs.has(key)).toBe(false)
      pairs.add(key)
    }
    expect(pairs.size).toBe(6)
  })

  it("gives every team the same number of matches", () => {
    const teams = ["a", "b", "c", "d", "e"]
    const matches = buildGroupFixture(teams)
    expect(matches).toHaveLength(10) // 5 teams, 5*4/2

    for (const id of teams) {
      const count = matches.filter((m) => m.homeId === id || m.awayId === id).length
      expect(count).toBe(4)
    }
  })

  it("never schedules a team twice within one round (even team count)", () => {
    const matches = buildGroupFixture(["a", "b", "c", "d", "e", "f"])
    expect(matches).toHaveLength(15)

    const perRound = 3 // 6 teams → 3 matches per round
    for (let r = 0; r < matches.length; r += perRound) {
      const round = matches.slice(r, r + perRound)
      const seen = new Set<string>()
      for (const m of round) {
        expect(seen.has(m.homeId)).toBe(false)
        expect(seen.has(m.awayId)).toBe(false)
        seen.add(m.homeId)
        seen.add(m.awayId)
      }
      expect(seen.size).toBe(6)
    }
  })

  it("alternates home/away direction on the second leg", () => {
    const ids = ["a", "b", "c", "d"]
    const matches = buildGroupFixture(ids, 2)
    expect(matches).toHaveLength(12)

    const directions = new Map<string, string[]>()
    for (const m of matches) {
      const key = [m.homeId, m.awayId].sort().join("|")
      const list = directions.get(key) ?? []
      list.push(`${m.homeId}>${m.awayId}`)
      directions.set(key, list)
    }

    for (const [key, legs] of directions) {
      expect(legs).toHaveLength(2)
      const [a, b] = key.split("|")
      expect(legs).toContain(`${a}>${b}`)
      expect(legs).toContain(`${b}>${a}`)
    }
  })

  it("returns an empty fixture for fewer than two teams", () => {
    expect(buildGroupFixture([])).toEqual([])
    expect(buildGroupFixture(["a"])).toEqual([])
  })
})

describe("recalcStandings", () => {
  /** Apply results keyed by the sorted pair "lowId|highId" so direction never matters. */
  function applyResults(
    teams: Team[],
    results: Record<string, readonly [number, number]>,
    tiebreaker: "goal-diff" | "head-to-head" = "goal-diff"
  ): GroupStanding[] {
    const g = makeGroup(teams.map((t) => t.id))
    for (const m of g.matches) {
      const [x, y] = [m.homeId, m.awayId].sort()
      const r = results[`${x}|${y}`]
      if (!r) continue
      m.result = m.homeId === x ? { home: r[0], away: r[1] } : { home: r[1], away: r[0] }
    }
    recalcStandings(g, tiebreaker)
    return g.standings
  }

  it("computes points, goals and orders by pts → gd → gf", () => {
    const standings = applyResults(makeTeams(4), {
      "t1|t2": [2, 0], // t1 beats t2
      "t3|t4": [1, 1], // draw
      "t1|t3": [1, 0], // t1 beats t3
      "t2|t4": [0, 0], // draw
      "t1|t4": [0, 1], // t4 beats t1
      "t2|t3": [0, 2], // t3 beats t2
    } as const)

    const byId = new Map(standings.map((s) => [s.teamId, s]))
    expect(byId.get("t1")!.pts).toBe(6)
    expect(byId.get("t2")!.pts).toBe(1)
    expect(byId.get("t3")!.pts).toBe(4)
    expect(byId.get("t4")!.pts).toBe(5)

    expect(standings.map((s) => s.teamId)).toEqual(["t1", "t4", "t3", "t2"])
    expectStandingsConsistent(standings)
  })

  it("breaks a points tie by goal difference, then goals scored", () => {
    // t1 and t3 tie on 7 pts; t1's gd +4 beats t3's gd +3 (both scored 4).
    const gdWins = applyResults(makeTeams(4), {
      "t1|t2": [3, 0],
      "t3|t4": [2, 0],
      "t1|t3": [0, 0],
      "t2|t4": [1, 1],
      "t1|t4": [1, 0],
      "t2|t3": [1, 2], // t3 wins 2-1
    } as const)
    expect(gdWins.map((s) => s.teamId)[0]).toBe("t1")

    // t1 and t3 tie on 7 pts and gd +3; t1's 4 goals beat t3's 3.
    const gfWins = applyResults(makeTeams(4), {
      "t1|t2": [2, 0],
      "t3|t4": [2, 0],
      "t1|t3": [0, 0],
      "t2|t4": [0, 0],
      "t1|t4": [2, 1],
      "t2|t3": [0, 1], // t3 wins 1-0
    } as const)
    expect(gfWins.map((s) => s.teamId)[0]).toBe("t1")
  })

  it("lets head-to-head override goal difference between tied teams", () => {
    // t1 and t2 both finish on 6 pts; t1 has the better gd but t2 beat t1 head-to-head.
    const results = {
      "t1|t2": [0, 1], // t2 beats t1
      "t1|t3": [4, 0],
      "t1|t4": [2, 1], // t1: 6 pts, gf 6, ga 2, gd +4
      "t2|t3": [2, 0],
      "t2|t4": [0, 1], // t4 beats t2 → t2: 6 pts, gd +2
      "t3|t4": [0, 0],
    } as const

    const goalDiff = applyResults(makeTeams(4), results, "goal-diff")
    expect(goalDiff[0].teamId).toBe("t1")

    const h2h = applyResults(makeTeams(4), results, "head-to-head")
    expect(h2h[0].teamId).toBe("t2")
    expectStandingsConsistent(h2h)
  })

  it("applies point adjustments after computing results", () => {
    const teams = makeTeams(2)
    const g = makeGroup(teams.map((t) => t.id))
    const m = g.matches[0]
    // Give the win to team "a" regardless of home/away.
    m.result = m.homeId === "t1" ? { home: 1, away: 0 } : { home: 0, away: 1 }
    recalcStandings(g, "goal-diff", 3, 1, 0, { t1: 10 })
    const a = g.standings.find((s) => s.teamId === "t1")!
    expect(a.won).toBe(1)
    expect(a.pts).toBe(13)
  })
})

describe("setGroupMatchResult / clearGroupMatchResult", () => {
  it("updates standings when a result is set and resets when cleared", () => {
    const teams = makeTeams(4)
    // groupCount must be >= 2 to produce a group+bracket tournament.
    const t = createTournament("T", teams, 1, false, undefined, 2) as Tournament

    setGroupMatchResult(t, 0, 0, 3, 1)
    const home = t.groups![0].standings.find((s) => s.teamId === t.groups![0].matches[0].homeId)!
    expect(home.won).toBe(1)
    expect(home.pts).toBe(3)
    expect(home.gf).toBe(3)

    clearGroupMatchResult(t, 0, 0)
    const cleared = t.groups![0].standings.find((s) => s.teamId === home.teamId)!
    expect(cleared.played).toBe(0)
    expect(cleared.pts).toBe(0)
    expect(t.groups![0].matches[0].result).toBeNull()
  })
})

describe("simulateGroup / simulateAllGroups", () => {
  it("simulates every group match and keeps standings consistent", () => {
    const teams = makeTeams(12)
    const t = createTournament("T", teams, 1, false, teams, 3, 2) as Tournament

    expect(allGroupsDone(t)).toBe(false)
    simulateAllGroups(t, teams)

    expect(allGroupsDone(t)).toBe(true)
    for (const g of t.groups!) {
      expect(g.matches.every((m) => m.result !== null)).toBe(true)
      for (const s of g.standings) {
        expect(s.played).toBe(3) // 4-team group, single leg
      }
      expectStandingsConsistent(g.standings)
    }
  })

  it("simulateGroup only fills the requested group", () => {
    const teams = makeTeams(8)
    const t = createTournament("T", teams, 1, false, teams, 2, 2) as Tournament

    simulateGroup(t, 0, teams)
    expect(allGroupsDone(t)).toBe(false)
    expect(t.groups![0].matches.every((m) => m.result !== null)).toBe(true)
    expect(t.groups![1].matches.every((m) => m.result === null)).toBe(true)
  })
})

describe("simulateGroupWeek / simulateWeek", () => {
  it("simulates round by round and reports the round index", () => {
    const teams = makeTeams(4)
    const group = makeGroup(teams.map((t) => t.id))
    const t = { groups: [group] } as unknown as Tournament

    expect(simulateGroupWeek(t, 0, teams)).toBe(0)
    expect(group.matches.filter((m) => m.result).length).toBe(2)

    expect(simulateGroupWeek(t, 0, teams)).toBe(1)
    expect(group.matches.filter((m) => m.result).length).toBe(4)

    expect(simulateGroupWeek(t, 0, teams)).toBe(2)
    expect(group.matches.every((m) => m.result)).toBe(true)

    expect(simulateGroupWeek(t, 0, teams)).toBe(-1)
  })

  it("simulateWeek advances every group at the same pace", () => {
    const teams = makeTeams(12)
    const t = createTournament("T", teams, 1, false, teams, 3, 2) as Tournament

    expect(simulateWeek(t, teams)).toBe(0)
    for (const g of t.groups!) {
      expect(g.matches.filter((m) => m.result).length).toBe(2)
    }
  })
})

describe("selectWildcards", () => {
  it("picks the best-ranked runners-up across groups", () => {
    const teams = makeTeams(12)
    const groups = [
      makeGroup(["t1", "t2", "t3", "t4"], 1, "A"),
      makeGroup(["t5", "t6", "t7", "t8"], 1, "B"),
      makeGroup(["t9", "t10", "t11", "t12"], 1, "C"),
    ]

    // Strength order per group with a direction-agnostic margin for the runner-up.
    function groupRule(order: string[], runnerUpId: string, runnerUpMargin: number) {
      return (h: Team, a: Team): [number, number] => {
        const hi = order.indexOf(h.id)
        const ai = order.indexOf(a.id)
        const stronger = hi < ai ? h : a
        const margin = stronger.id === runnerUpId ? runnerUpMargin : 2
        return stronger === h ? [margin, 0] : [0, margin]
      }
    }

    playGroupByRule(groups[0], teams, groupRule(["t1", "t2", "t3", "t4"], "t2", 2))
    playGroupByRule(groups[1], teams, groupRule(["t5", "t6", "t7", "t8"], "t6", 1))
    playGroupByRule(groups[2], teams, groupRule(["t9", "t10", "t11", "t12"], "t10", 3))

    // Runners-up: t2 (gd +2), t6 (gd 0), t10 (gd +4) — all on 6 pts.
    const wildcards = selectWildcards(groups, 1, 2, teams)
    const ids = wildcards.map((w) => w.team.id)
    expect(ids).toContain("t10") // best gd
    expect(ids).toContain("t2")
    expect(ids).not.toContain("t6")
  })
})
