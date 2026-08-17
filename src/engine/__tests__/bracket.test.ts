// engine/__tests__/bracket.test.ts
import { describe, expect, it } from "vitest"
import type { Tournament } from "../../modules/tournament/types"
import {
  applyLegModes,
  bracketOrder,
  buildBracketRounds,
  buildEmptyBracketRounds,
  buildPureBracket,
  getLoserId,
  getWinnerId,
  propagateWinners,
  resolveRoundLegMode,
  spreadByeSlots,
  stageForDistance,
  updateThirdPlaceSlots,
} from "../bracket"
import { createTournament, seedBracketFromGroups } from "../tournament"
import { makeTeams, playGroupByRule, powerWins } from "./helpers"

describe("stageForDistance / resolveRoundLegMode", () => {
  it("maps round distance to a named stage", () => {
    expect(stageForDistance(1)).toBe("semifinal")
    expect(stageForDistance(2)).toBe("quarterfinal")
    expect(stageForDistance(3)).toBe("r16")
    expect(stageForDistance(4)).toBe("r32")
    expect(stageForDistance(5)).toBe("r64")
    expect(stageForDistance(9)).toBe("r64")
  })

  it("prefers per-stage overrides over the global knockout leg mode", () => {
    const t = {
      knockoutLegMode: "single" as const,
      roundLegModes: { quarterfinal: "double" as const },
    }
    expect(resolveRoundLegMode(t, 1)).toBe("single") // semifinal → global
    expect(resolveRoundLegMode(t, 2)).toBe("double") // quarterfinal → override
    expect(resolveRoundLegMode(t, 3)).toBe("single") // r16 → global
  })
})

describe("getWinnerId", () => {
  it("returns null without a result", () => {
    expect(getWinnerId({ id: "m", homeId: "a", awayId: "b", result: null })).toBeNull()
  })

  it("resolves a single-leg tie by score", () => {
    expect(getWinnerId({ id: "m", homeId: "a", awayId: "b", result: { home: 2, away: 1 } })).toBe(
      "a"
    )
    expect(getWinnerId({ id: "m", homeId: "a", awayId: "b", result: { home: 1, away: 3 } })).toBe(
      "b"
    )
  })

  it("resolves a drawn single-leg tie by penalties", () => {
    const m = {
      id: "m",
      homeId: "a",
      awayId: "b",
      result: { home: 1, away: 1, penHome: 4, penAway: 3 },
    }
    expect(getWinnerId(m)).toBe("a")
    const m2 = {
      id: "m",
      homeId: "a",
      awayId: "b",
      result: { home: 1, away: 1, penHome: 2, penAway: 5 },
    }
    expect(getWinnerId(m2)).toBe("b")
  })

  it("keeps a double-leg tie pending until the second leg is played", () => {
    const m = { id: "m", homeId: "a", awayId: "b", result: { home: 1, away: 0 }, leg2Result: null }
    expect(getWinnerId(m)).toBeNull()
  })

  it("decides a double-leg tie on aggregate", () => {
    // leg1 a 2-0, leg2 (b home) 1-1 → aggregate a 3-1
    const m = {
      id: "m",
      homeId: "a",
      awayId: "b",
      result: { home: 2, away: 0 },
      leg2Result: { home: 1, away: 1 },
    }
    expect(getWinnerId(m)).toBe("a")
  })

  it("decides a level double-leg tie on leg-2 penalties", () => {
    // Aggregate 2-2; in leg 2, penHome is the away side's shootout (b), penAway is a's.
    const m = {
      id: "m",
      homeId: "a",
      awayId: "b",
      result: { home: 1, away: 1 },
      leg2Result: { home: 1, away: 1, penHome: 3, penAway: 4 },
    }
    expect(getWinnerId(m)).toBe("a")

    const m2 = {
      id: "m",
      homeId: "a",
      awayId: "b",
      result: { home: 1, away: 1 },
      leg2Result: { home: 1, away: 1, penHome: 4, penAway: 3 },
    }
    expect(getWinnerId(m2)).toBe("b")
  })
})

describe("getLoserId", () => {
  it("returns the losing side of a decided match", () => {
    expect(getLoserId({ id: "m", homeId: "a", awayId: "b", result: { home: 2, away: 1 } })).toBe(
      "b"
    )
    expect(getLoserId({ id: "m", homeId: "a", awayId: "b", result: { home: 0, away: 1 } })).toBe(
      "a"
    )
  })

  it("returns null for an undecided match", () => {
    expect(getLoserId({ id: "m", homeId: "a", awayId: "b", result: null })).toBeNull()
  })
})

describe("buildBracketRounds", () => {
  it("builds log2 rounds and names them", () => {
    const teams = makeTeams(4)
    const rounds = buildBracketRounds(teams)
    expect(rounds).toHaveLength(2)
    expect(rounds[0].name).toBe("Semi-Finals")
    expect(rounds[0].matches).toHaveLength(2)
    expect(rounds[1].name).toBe("Final")
    expect(rounds[1].matches).toHaveLength(1)
  })

  it("auto-resolves byes as walkover wins", () => {
    const rounds = buildBracketRounds([makeTeams(3)[0], null, makeTeams(3)[1], makeTeams(3)[2]])
    expect(rounds[0].matches[0].result).toEqual({ home: 1, away: 0 })
    expect(rounds[0].matches[1].result).toBeNull()
  })

  it("builds empty rounds of the right sizes", () => {
    const rounds = buildEmptyBracketRounds(8)
    expect(rounds.map((r) => r.matches.length)).toEqual([4, 2, 1])
    expect(rounds.every((r) => r.matches.every((m) => m.result === null))).toBe(true)
  })
})

describe("buildPureBracket", () => {
  it("places every team exactly once", () => {
    const teams = makeTeams(8)
    const rounds = buildPureBracket(teams, false)
    expect(rounds).toHaveLength(3)

    const placed = rounds[0].matches.flatMap((m) => [m.homeId, m.awayId]).filter(Boolean)
    expect(placed).toHaveLength(8)
    expect(new Set(placed).size).toBe(8)
  })

  it("gives the strongest teams byes when the count is not a power of two", () => {
    const teams = makeTeams(5)
    const rounds = buildPureBracket(teams, true)
    const placed = rounds[0].matches.flatMap((m) => [m.homeId, m.awayId]).filter(Boolean)
    expect(placed).toHaveLength(5)
    expect(new Set(placed).size).toBe(5)

    // 3 byes are auto-resolved walkovers for the 3 strongest teams.
    const byes = rounds[0].matches.filter((m) => m.result && (!m.homeId || !m.awayId))
    expect(byes).toHaveLength(3)
    const byeIds = byes.map((m) => m.homeId ?? m.awayId)
    expect(byeIds.sort()).toEqual(["t1", "t2", "t3"])
  })

  it("respects an explicit ordered list with bye-front packing", () => {
    const teams = makeTeams(5)
    const rounds = buildPureBracket(teams, false, teams)
    const r1 = rounds[0].matches

    expect([r1[0].homeId, r1[0].awayId]).toEqual(["t1", null])
    expect([r1[1].homeId, r1[1].awayId]).toEqual(["t2", null])
    expect([r1[2].homeId, r1[2].awayId]).toEqual(["t3", null])
    expect([r1[3].homeId, r1[3].awayId]).toEqual(["t4", "t5"])
  })
})

describe("propagateWinners", () => {
  it("fills the next round with winners in the right slots", () => {
    const rounds = buildBracketRounds(makeTeams(4)) // deterministic: (t1,t2) and (t3,t4)
    expect([rounds[0].matches[0].homeId, rounds[0].matches[0].awayId]).toEqual(["t1", "t2"])

    rounds[0].matches[0].result = { home: 1, away: 0 } // t1 beats t2
    rounds[0].matches[1].result = { home: 0, away: 2 } // t4 beats t3

    propagateWinners(rounds, makeTeams(4))
    expect(rounds[1].matches[0].homeId).toBe("t1")
    expect(rounds[1].matches[0].awayId).toBe("t4")

    rounds[1].matches[0].result = { home: 2, away: 1 }
    propagateWinners(rounds, makeTeams(4))
    expect(rounds[1].matches[0].homeId).toBe("t1") // winner of the final is the last standing
  })
})

describe("applyLegModes", () => {
  it("marks non-bye matches as double-leg only where configured", () => {
    const rounds = buildPureBracket(makeTeams(8), false)
    applyLegModes(rounds, {
      knockoutLegMode: "single",
      roundLegModes: { quarterfinal: "double" },
      finalLegMode: "single",
    })

    // 8 teams → 3 rounds: quarterfinal (distance 2) is double, semifinal + final single.
    expect(rounds[0].matches.every((m) => m.leg2Result === null)).toBe(true)
    expect(rounds[1].matches.every((m) => m.leg2Result === undefined)).toBe(true)
    expect(rounds[2].matches.every((m) => m.leg2Result === undefined)).toBe(true)
  })

  it("never marks bye matches as double-leg", () => {
    const rounds = buildPureBracket(makeTeams(5), false) // 3 byes in round 1
    applyLegModes(rounds, {
      knockoutLegMode: "double",
      roundLegModes: undefined,
      finalLegMode: "double",
    })

    for (const m of rounds[0].matches) {
      const isBye = (m.homeId && !m.awayId) || (!m.homeId && m.awayId)
      expect(m.leg2Result === undefined).toBe(isBye)
      if (!isBye) expect(m.leg2Result).toBeNull()
    }
  })
})

describe("bracketOrder / spreadByeSlots", () => {
  it("produces the standard snake bracket order", () => {
    expect(bracketOrder(4)).toEqual([0, 3, 1, 2])
    expect(bracketOrder(8)).toEqual([0, 7, 3, 4, 1, 6, 2, 5])
  })

  it("spreads byes across different subtrees", () => {
    expect(spreadByeSlots(2, 8)).toEqual([0, 7])
    expect(spreadByeSlots(3, 8)).toEqual([0, 7, 3])
    expect(spreadByeSlots(0, 8)).toEqual([])
  })
})

describe("seedBracketFromGroups", () => {
  function seededTournament(wildcardCount = 0): {
    t: Tournament
    teams: ReturnType<typeof makeTeams>
  } {
    const teams = makeTeams(12)
    // orderedTeams pins group composition: g0=[t1,t4,t7,t10], g1=[t2,t5,t8,t11], g2=[t3,t6,t9,t12]
    const t = createTournament("T", teams, 1, false, teams, 3, 2, wildcardCount) as Tournament
    for (const g of t.groups!) playGroupByRule(g, teams, powerWins)
    return { t, teams }
  }

  function round1Teams(t: Tournament): string[] {
    return t.rounds[0].matches.flatMap((m) => [m.homeId, m.awayId]).filter((x): x is string => !!x)
  }

  it("cross mode: byes go to the strongest winners and no same-group pair meets", () => {
    const { t, teams } = seededTournament()
    seedBracketFromGroups(t, teams, "cross")

    expect(t.groupsDone).toBe(true)
    const r1 = t.rounds[0].matches
    expect(r1).toHaveLength(4) // 6 qualifiers → 8-slot bracket

    const placed = round1Teams(t)
    expect(placed.sort()).toEqual(["t1", "t2", "t3", "t4", "t5", "t6"])
    expect(new Set(placed).size).toBe(6)

    // Rotating cross: (t1 bye), (t3 vs t4), (t5 vs t6), (t2 bye)
    expect([r1[0].homeId, r1[0].awayId]).toEqual(["t1", null])
    expect([r1[1].homeId, r1[1].awayId]).toEqual(["t3", "t4"])
    expect([r1[2].homeId, r1[2].awayId]).toEqual(["t5", "t6"])
    expect([r1[3].homeId, r1[3].awayId]).toEqual(["t2", null])

    // No same-group teams meet in round 1
    for (const m of r1) {
      if (!m.homeId || !m.awayId) continue
      const gOf = (id: string) => t.groups!.findIndex((g) => g.teamIds.includes(id))
      expect(gOf(m.homeId)).not.toBe(gOf(m.awayId))
    }
  })

  it("no-same-group mode interleaves by rank so group-mates never meet early", () => {
    const { t, teams } = seededTournament()
    seedBracketFromGroups(t, teams, "no-same-group")

    const r1 = t.rounds[0].matches
    expect([r1[0].homeId, r1[0].awayId]).toEqual(["t1", null])
    expect([r1[1].homeId, r1[1].awayId]).toEqual(["t2", "t3"])
    expect([r1[2].homeId, r1[2].awayId]).toEqual(["t6", null])
    expect([r1[3].homeId, r1[3].awayId]).toEqual(["t5", "t4"])

    for (const m of r1) {
      if (!m.homeId || !m.awayId) continue
      const gOf = (id: string) => t.groups!.findIndex((g) => g.teamIds.includes(id))
      expect(gOf(m.homeId)).not.toBe(gOf(m.awayId))
    }
  })

  it("random mode places every qualifier exactly once", () => {
    const { t, teams } = seededTournament()
    seedBracketFromGroups(t, teams, "random")

    const placed = round1Teams(t)
    expect(placed).toHaveLength(6)
    expect(new Set(placed).size).toBe(6)
    expect(placed.every((id) => ["t1", "t2", "t3", "t4", "t5", "t6"].includes(id))).toBe(true)
  })

  it("manual mode packs the given order with bye-front slots", () => {
    const { t, teams } = seededTournament()
    seedBracketFromGroups(t, teams, "manual", ["t6", "t5", "t4", "t3", "t2", "t1"])

    const r1 = t.rounds[0].matches
    expect([r1[0].homeId, r1[0].awayId]).toEqual(["t6", null])
    expect([r1[1].homeId, r1[1].awayId]).toEqual(["t4", "t3"])
    expect([r1[2].homeId, r1[2].awayId]).toEqual(["t2", "t1"])
    expect([r1[3].homeId, r1[3].awayId]).toEqual(["t5", null])
  })

  it("includes wildcards as the extra qualifiers", () => {
    const { t, teams } = seededTournament(1)
    seedBracketFromGroups(t, teams, "cross")

    const placed = round1Teams(t).sort()
    // 6 direct qualifiers + 1 wildcard (best 3rd place, t7)
    expect(placed).toEqual(["t1", "t2", "t3", "t4", "t5", "t6", "t7"])

    const r1 = t.rounds[0].matches
    for (const m of r1) {
      if (!m.homeId || !m.awayId) continue
      const gOf = (id: string) => t.groups!.findIndex((g) => g.teamIds.includes(id))
      expect(gOf(m.homeId)).not.toBe(gOf(m.awayId))
    }
  })
})

describe("updateThirdPlaceSlots", () => {
  it("fills the third-place match with the semifinal losers", () => {
    const t = {
      format: "bracket",
      rounds: buildBracketRounds(makeTeams(4)), // (t1,t2) and (t3,t4)
      hasThirdPlace: true,
      thirdPlaceMatch: { id: "tp", homeId: null, awayId: null, result: null },
    } as unknown as Tournament

    t.rounds[0].matches[0].result = { home: 2, away: 0 } // t1 beats t2
    t.rounds[0].matches[1].result = { home: 1, away: 0 } // t3 beats t4
    propagateWinners(t.rounds, makeTeams(4))

    updateThirdPlaceSlots(t)
    expect(t.thirdPlaceMatch!.homeId).toBe("t2")
    expect(t.thirdPlaceMatch!.awayId).toBe("t4")
  })
})
