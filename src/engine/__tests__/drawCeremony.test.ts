// engine/__tests__/drawCeremony.test.ts
import { describe, expect, it } from "vitest"
import type { Team } from "@/modules/teams/types"
import type { Tournament } from "@/modules/tournament/types"
import {
  buildPots,
  buildPlayoffPots,
  computeCrossDrawPlan,
  computeDrawPlan,
  validatePots,
} from "../drawCeremony"
import { createTournament } from "../tournament"
import { makeRng } from "../utils"
import { makeTeams, playGroupByRule, powerWins } from "./helpers"

const seededCtx = (teams: Team[]) => ({
  kind: "bracket" as const,
  teams,
  drawMode: "seeded" as const,
})
const randomCtx = (teams: Team[]) => ({
  kind: "bracket" as const,
  teams,
  drawMode: "random" as const,
})

describe("buildPots", () => {
  it("random mode uses a single pot", () => {
    const pots = buildPots(randomCtx(makeTeams(8)))
    expect(pots).toHaveLength(1)
    expect(pots[0].teamIds).toHaveLength(8)
  })

  it("seeded bracket mode splits by power into two pots", () => {
    const teams = makeTeams(8)
    const pots = buildPots(seededCtx(teams))
    expect(pots).toHaveLength(2)
    expect(pots[0].teamIds).toEqual(["t1", "t2", "t3", "t4"])
    expect(pots[1].teamIds).toEqual(["t5", "t6", "t7", "t8"])
  })

  it("group mode creates one pot per seeding band", () => {
    const teams = makeTeams(12)
    const pots = buildPots({ kind: "group", teams, drawMode: "seeded", groupCount: 3 })
    expect(pots.map((p) => p.label)).toEqual(["Pot 1", "Pot 2", "Pot 3", "Pot 4"])
    expect(pots.every((p) => p.teamIds.length === 3)).toBe(true)
  })
})

describe("buildPlayoffPots", () => {
  it("derives pots from the current group standings", () => {
    const teams = makeTeams(12)
    const t = createTournament("T", teams, 1, false, teams, 3, 2) as Tournament
    for (const g of t.groups!) playGroupByRule(g, teams, powerWins)

    const pots = buildPlayoffPots(t, teams)
    expect(pots).toHaveLength(2)
    expect(pots[0].label).toBe("Group Winners")
    expect(pots[0].teamIds).toEqual(["t1", "t2", "t3"])
    expect(pots[1].label).toBe("Runners-up")
    expect(pots[1].teamIds).toEqual(["t4", "t5", "t6"])
  })
})

describe("validatePots", () => {
  it("accepts a complete, duplicate-free set", () => {
    const pots = [
      { label: "A", teamIds: ["a", "b"] },
      { label: "B", teamIds: ["c", "d"] },
    ]
    expect(validatePots(pots, 4)).toEqual([])
  })

  it("flags missing teams, duplicates and empty pots", () => {
    expect(validatePots([{ label: "A", teamIds: ["a", "b"] }], 4)).toEqual(["unassigned"])
    expect(validatePots([{ label: "A", teamIds: ["a", "a"] }], 2)).toEqual(["duplicate"])
    expect(
      validatePots(
        [
          { label: "A", teamIds: [] },
          { label: "B", teamIds: ["b"] },
        ],
        1
      )
    ).toEqual(["emptyPot"])
  })
})

describe("computeDrawPlan", () => {
  it("is deterministic for a fixed seed", () => {
    const teams = makeTeams(8)
    const a = computeDrawPlan(buildPots(seededCtx(teams)), seededCtx(teams), makeRng(42))
    const b = computeDrawPlan(buildPots(seededCtx(teams)), seededCtx(teams), makeRng(42))
    expect(a.orderedIds).toEqual(b.orderedIds)
    expect(a.sequence).toEqual(b.sequence)
  })

  it("produces a permutation of all participating teams", () => {
    const teams = makeTeams(8)
    const plan = computeDrawPlan(buildPots(seededCtx(teams)), seededCtx(teams), makeRng(1))
    expect(plan.orderedIds).toHaveLength(8)
    expect(new Set(plan.orderedIds).size).toBe(8)
    expect(plan.sequence.map((s) => s.teamId).sort()).toEqual(plan.orderedIds.slice().sort())
  })

  it("reveals byes first in bracket mode", () => {
    const teams = makeTeams(6) // 2 byes
    const plan = computeDrawPlan(buildPots(seededCtx(teams)), seededCtx(teams), makeRng(7))
    expect(plan.sequence.slice(0, 2).every((s) => s.targetLabel.startsWith("BYE"))).toBe(true)
  })

  it("different seeds give different draws (8 teams)", () => {
    const teams = makeTeams(8)
    const a = computeDrawPlan(buildPots(seededCtx(teams)), seededCtx(teams), makeRng(1))
    const b = computeDrawPlan(buildPots(seededCtx(teams)), seededCtx(teams), makeRng(2))
    expect(a.orderedIds).not.toEqual(b.orderedIds)
  })

  it("group plan interleaves teams so the engine's round-robin groups match the reveal", () => {
    const teams = makeTeams(12)
    const gc = 3
    const ctx = { kind: "group" as const, teams, drawMode: "seeded" as const, groupCount: gc }
    const plan = computeDrawPlan(buildPots(ctx), ctx, makeRng(5))

    // Reconstruct the intended groups from the reveal sequence.
    const intended = new Map<string, string[]>()
    for (const step of plan.sequence) {
      const list = intended.get(step.targetLabel) ?? []
      list.push(step.teamId)
      intended.set(step.targetLabel, list)
    }

    // Engine contract: orderedTeams[i] lands in group i % gc.
    const placed = new Map<string, string[]>()
    plan.orderedIds.forEach((id, i) => {
      const list = placed.get(`Group ${String.fromCharCode(65 + (i % gc))}`) ?? []
      list.push(id)
      placed.set(`Group ${String.fromCharCode(65 + (i % gc))}`, list)
    })

    expect(placed).toEqual(intended)
  })
})

describe("computeCrossDrawPlan", () => {
  it("matches crossPlayoffOrder and labels byes then matches", () => {
    const teams = makeTeams(12)
    const t = createTournament("T", teams, 1, false, teams, 3, 2) as Tournament
    for (const g of t.groups!) playGroupByRule(g, teams, powerWins)

    const plan = computeCrossDrawPlan(t, teams)
    expect(plan.orderedIds).toEqual(["t1", "t2", "t3", "t4", "t5", "t6"])
    expect(new Set(plan.sequence.map((s) => s.teamId)).size).toBe(6)

    const labels = plan.sequence.map((s) => s.targetLabel)
    expect(labels.slice(0, 2)).toEqual(["BYE 1", "BYE 2"])
    expect(labels.slice(2)).toEqual(["Match 1", "Match 1", "Match 2", "Match 2"])
  })
})
