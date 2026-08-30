import { describe, it, expect } from "vitest"
import { ref } from "vue"
import type { Team } from "@/modules/teams/types"
import type { Tournament } from "@/modules/tournament/types"
import { makeWithTournament, assertNoSliceCollisions, adjustedTeams } from "../helpers"

function tournament(id: string): Tournament {
  return { id, name: id, format: "bracket", teamIds: [], createdAt: 0 } as unknown as Tournament
}

function teams(): Team[] {
  return [
    { id: "a", name: "A", color: "#111111", power: 50 },
    { id: "b", name: "B", color: "#222222", power: 98 },
    { id: "c", name: "C", color: "#333333", power: 3 },
  ]
}

describe("makeWithTournament", () => {
  it("hands the tournament to the callback and returns its result", () => {
    const withTournament = makeWithTournament(ref([tournament("x"), tournament("y")]))
    expect(withTournament("y", (t) => t.name)).toBe("y")
  })

  it("skips the callback entirely when the id is gone", () => {
    const withTournament = makeWithTournament(ref([tournament("x")]))
    let ran = false
    const result = withTournament("missing", () => {
      ran = true
      return "value"
    })
    expect(ran).toBe(false)
    expect(result).toBeUndefined()
  })
})

describe("assertNoSliceCollisions", () => {
  it("accepts slices with disjoint action names", () => {
    expect(() =>
      assertNoSliceCollisions({ crud: { create: 1 }, scoring: { setTiebreaker: 1 } })
    ).not.toThrow()
  })

  /** A spread would let the later slice shadow the earlier one silently. */
  it("names both slices when an action is exported twice", () => {
    expect(() => assertNoSliceCollisions({ crud: { reset: 1 }, bracket: { reset: 1 } })).toThrow(
      /"reset" is exported by both crud and bracket/
    )
  })
})

describe("adjustedTeams", () => {
  it("returns the same array when the tournament has no adjustments", () => {
    const input = teams()
    const t = tournament("x")
    expect(adjustedTeams(input, t)).toBe(input)

    t.teamPowerAdjustments = {}
    expect(adjustedTeams(input, t)).toBe(input)
  })

  it("applies deltas without touching the team records", () => {
    const input = teams()
    const t = tournament("x")
    t.teamPowerAdjustments = { a: 10 }

    const out = adjustedTeams(input, t)
    expect(out[0].power).toBe(60)
    expect(input[0].power).toBe(50)
    expect(out[1]).toBe(input[1]) // untouched teams are passed through as-is
  })

  it("clamps into 1..100 rather than producing an unusable power", () => {
    const t = tournament("x")
    t.teamPowerAdjustments = { b: 50, c: -50 }

    const out = adjustedTeams(teams(), t)
    expect(out[1].power).toBe(100)
    expect(out[2].power).toBe(1)
  })
})
