// engine/__tests__/tournament.test.ts
import { describe, expect, it } from "vitest"
import type { Tournament } from "../../modules/tournament/types"
import {
  createLeague,
  createMultiTierLeague,
  createTournament,
  crossPlayoffOrder,
} from "../tournament"
import { makeTeams, playGroupByRule, powerWins } from "./helpers"

describe("createTournament — bracket", () => {
  it("builds a pure knockout bracket for a power-of-two field", () => {
    const t = createTournament("Cup", makeTeams(8), 1, false) as Tournament
    expect(t.format).toBe("bracket")
    expect(t.rounds).toHaveLength(3)
    expect(t.rounds[0].matches).toHaveLength(4)
    expect(t.winnerId).toBeNull()
    expect(t.teamIds).toHaveLength(8)
  })

  it("adds byes for a non-power-of-two field", () => {
    const t = createTournament("Cup", makeTeams(7), 1, false) as Tournament
    expect(t.rounds[0].matches).toHaveLength(4)
    const placed = t.rounds[0].matches.flatMap((m) => [m.homeId, m.awayId]).filter(Boolean)
    expect(placed).toHaveLength(7)
    expect(new Set(placed).size).toBe(7)
  })

  it("tracks season and name", () => {
    const t = createTournament("Cup", makeTeams(4), 3, false) as Tournament
    expect(t.season).toBe(3)
    expect(t.name).toBe("Cup")
  })
})

describe("createTournament — group + bracket", () => {
  it("splits teams evenly across the requested groups", () => {
    const teams = makeTeams(12)
    const t = createTournament("Euro", teams, 1, false, teams, 3, 2) as Tournament

    expect(t.format).toBe("group+bracket")
    expect(t.groups).toHaveLength(3)
    for (const g of t.groups!) {
      expect(g.teamIds).toHaveLength(4)
      expect(g.matches).toHaveLength(6) // round-robin
      expect(g.standings).toHaveLength(4)
      expect(g.standings.every((s) => s.played === 0)).toBe(true)
    }
    expect(t.groupsDone).toBe(false)
    // Knockout rounds exist but are empty until the groups feed them.
    expect(t.rounds.length).toBeGreaterThan(0)
    expect(t.rounds[0].matches.every((m) => m.homeId === null && m.awayId === null)).toBe(true)
  })

  it("clamps qualifiersPerGroup to the group size", () => {
    const teams = makeTeams(12)
    const t = createTournament("Euro", teams, 1, false, teams, 3, 5) as Tournament
    expect(t.qualifiersPerGroup).toBe(4)
  })

  it("distributes ordered teams round-robin across groups", () => {
    const teams = makeTeams(12)
    const t = createTournament("Euro", teams, 1, false, teams, 3, 2) as Tournament
    const g0 = new Set(t.groups![0].teamIds)
    // t1 → group 0, t2 → group 1, t3 → group 2, t4 → group 0, …
    expect(g0.has("t1")).toBe(true)
    expect(g0.has("t4")).toBe(true)
    expect(g0.has("t2")).toBe(false)
  })
})

describe("createLeague / createMultiTierLeague", () => {
  it("creates a single-tier league", () => {
    const t = createLeague("Lig", makeTeams(6), 2) as Tournament
    expect(t.format).toBe("league")
    expect(t.season).toBe(2)
    expect(t.league!.matchdays).toHaveLength(5)
    expect(t.league!.standings).toHaveLength(6)
    expect(t.rounds).toEqual([])
  })

  it("creates a multi-tier league with promotion count", () => {
    const teams = makeTeams(10)
    const t = createMultiTierLeague(
      "T",
      [
        { name: "Div 1", teams: teams.slice(0, 5) },
        { name: "Div 2", teams: teams.slice(5) },
      ],
      1,
      "double",
      3
    ) as Tournament

    expect(t.tiers).toHaveLength(2)
    expect(t.tiers![0].teamIds).toEqual(["t1", "t2", "t3", "t4", "t5"])
    expect(t.tiers![1].teamIds).toEqual(["t6", "t7", "t8", "t9", "t10"])
    expect(t.tiers![0].league.legMode).toBe("double")
    // double legs, 5 teams → 20 matches, 2 per matchday → 10 matchdays
    expect(t.tiers![0].league.matchdays).toHaveLength(10)
    expect(t.promotionCount).toBe(3)
  })
})

describe("crossPlayoffOrder", () => {
  it("returns the rotating cross with byes to the strongest winners", () => {
    const teams = makeTeams(12)
    const t = createTournament("T", teams, 1, false, teams, 3, 2) as Tournament
    for (const g of t.groups!) playGroupByRule(g, teams, powerWins)

    const order = crossPlayoffOrder(t, teams)
    expect(order).not.toBeNull()
    expect(order!.byeCount).toBe(2)
    expect(order!.ids).toEqual(["t1", "t2", "t3", "t4", "t5", "t6"])
    expect(new Set(order!.ids).size).toBe(6)
  })

  it("returns null for formats without groups or qpg ≠ 2", () => {
    const t = createTournament("T", makeTeams(8), 1, false) as Tournament
    expect(crossPlayoffOrder(t, makeTeams(8))).toBeNull()

    const g = createTournament("T", makeTeams(12), 1, false, makeTeams(12), 3, 3) as Tournament
    expect(crossPlayoffOrder(g, makeTeams(12))).toBeNull()
  })
})
