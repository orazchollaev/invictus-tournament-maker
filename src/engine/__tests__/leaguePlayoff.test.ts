// engine/__tests__/leaguePlayoff.test.ts
import { describe, expect, it } from "vitest"
import type { Tournament } from "../../modules/tournament/types"
import {
  canStartLeaguePlayoff,
  computeLeaguePlayoffPlan,
  getLeaguePlayoffData,
  getLeaguePlayoffQualifierIds,
  isTopTierDone,
  seedLeaguePlayoffBracket,
  setLeaguePlayoffData,
} from "../leaguePlayoff"
import { createLeague, createMultiTierLeague } from "../tournament"
import { makeTeams, playLeagueByPower } from "./helpers"

describe("getLeaguePlayoffData / setLeaguePlayoffData", () => {
  it("routes through tiers for multi-tier and league otherwise", () => {
    const single = createLeague("L", makeTeams(8), 1) as Tournament
    const multi = createMultiTierLeague(
      "T",
      [
        { name: "D1", teams: makeTeams(8).slice(0, 4) },
        { name: "D2", teams: makeTeams(8).slice(4) },
      ],
      1
    ) as Tournament

    const data = { enabled: true, qualifierCount: 4, seedMode: "seeded" as const, started: false }
    setLeaguePlayoffData(single, data)
    setLeaguePlayoffData(multi, data)

    expect(getLeaguePlayoffData(single)).toEqual(data)
    expect(getLeaguePlayoffData(multi)).toEqual(data)
    expect(multi.tiers![0].playoff).toEqual(data)
    expect(multi.tiers![1].playoff).toBeUndefined()
  })
})

describe("playoff lifecycle", () => {
  function doneLeague(): Tournament {
    const teams = makeTeams(8)
    const t = createLeague("L", teams, 1) as Tournament
    playLeagueByPower(t, teams)
    setLeaguePlayoffData(t, {
      enabled: true,
      qualifierCount: 6,
      seedMode: "seeded",
      started: false,
    })
    return t
  }

  it("only allows the playoff after the season is finished", () => {
    const t = createLeague("L", makeTeams(8), 1) as Tournament
    setLeaguePlayoffData(t, {
      enabled: true,
      qualifierCount: 4,
      seedMode: "seeded",
      started: false,
    })

    expect(isTopTierDone(t)).toBe(false)
    expect(canStartLeaguePlayoff(t)).toBe(false)

    playLeagueByPower(t, makeTeams(8))
    expect(isTopTierDone(t)).toBe(true)
    expect(canStartLeaguePlayoff(t)).toBe(true)
  })

  it("qualifiers are the top-N of the final table in rank order", () => {
    const t = doneLeague()
    const ids = getLeaguePlayoffQualifierIds(t)
    expect(ids).toHaveLength(6)
    expect(ids[0]).toBe("t1")
    expect(ids[5]).toBe("t6")
  })

  it("cannot start twice once seeded", () => {
    const t = doneLeague()
    expect(canStartLeaguePlayoff(t)).toBe(true)
    seedLeaguePlayoffBracket(t, makeTeams(8), "seeded")
    expect(canStartLeaguePlayoff(t)).toBe(false)
  })

  it("seeded mode gives byes to the top ranks and pairs the rest top-half vs bottom-half", () => {
    const t = doneLeague()
    seedLeaguePlayoffBracket(t, makeTeams(8), "seeded")

    // 6 qualifiers → 8-slot bracket, q1+q2 byed, then (q3,q6) and (q4,q5).
    const r1 = t.rounds[0].matches
    expect(r1).toHaveLength(4)
    expect([r1[0].homeId, r1[0].awayId]).toEqual(["t1", null])
    expect([r1[1].homeId, r1[1].awayId]).toEqual(["t3", "t6"])
    expect([r1[2].homeId, r1[2].awayId]).toEqual(["t4", "t5"])
    expect([r1[3].homeId, r1[3].awayId]).toEqual(["t2", null])
  })

  it("computeLeaguePlayoffPlan matches the committed seeded bracket", () => {
    const t = doneLeague()
    const plan = computeLeaguePlayoffPlan(t)
    expect(plan.orderedIds).toEqual(["t1", "t2", "t3", "t6", "t4", "t5"])

    // Feeding the plan back through the manual path yields the same round-1 layout.
    seedLeaguePlayoffBracket(t, makeTeams(8), "manual", plan.orderedIds)
    const r1 = t.rounds[0].matches
    expect([r1[0].homeId, r1[0].awayId]).toEqual(["t1", null])
    expect([r1[1].homeId, r1[1].awayId]).toEqual(["t3", "t6"])
    expect([r1[2].homeId, r1[2].awayId]).toEqual(["t4", "t5"])
    expect([r1[3].homeId, r1[3].awayId]).toEqual(["t2", null])
  })

  it("reveal sequence walks the bracket slots in order (byes spread, not front-loaded)", () => {
    const t = doneLeague()
    const plan = computeLeaguePlayoffPlan(t)
    const labels = plan.sequence.map((s) => s.targetLabel)
    // Byes land in slots 0 and 3 (spread across subtrees), matches in between.
    expect(labels).toEqual(["BYE 1", "Match 1", "Match 1", "Match 2", "Match 2", "BYE 2"])
    expect(plan.sequence.map((s) => s.teamId)).toEqual(["t1", "t3", "t6", "t4", "t5", "t2"])
  })
})
