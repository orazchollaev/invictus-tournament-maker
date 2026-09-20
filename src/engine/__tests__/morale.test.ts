// engine/__tests__/morale.test.ts
import { describe, expect, it } from "vitest"
import type { MatchResult } from "@/modules/tournament/types"
import { MORALE_MAX, MORALE_STEP, computeMoraleAdjustments } from "../morale"

function result(over: Partial<MatchResult> = {}): MatchResult {
  return { home: 1, away: 0, ...over }
}

describe("computeMoraleAdjustments", () => {
  it("is zero with no history at all", () => {
    expect(computeMoraleAdjustments(["a"], []).get("a")).toBe(0)
  })

  it("a single win gives one step of positive morale", () => {
    const map = computeMoraleAdjustments(
      ["a"],
      [{ homeId: "a", awayId: "b", result: result({ home: 1, away: 0 }) }]
    )
    expect(map.get("a")).toBe(MORALE_STEP)
  })

  it("a winning streak climbs, capped at the max", () => {
    const wins = Array.from({ length: 10 }, () => ({
      homeId: "a",
      awayId: "b",
      result: result({ home: 1, away: 0 }),
    }))
    expect(computeMoraleAdjustments(["a"], wins).get("a")).toBe(MORALE_MAX)
  })

  it("a losing streak mirrors it negatively", () => {
    const losses = Array.from({ length: 10 }, () => ({
      homeId: "a",
      awayId: "b",
      result: result({ home: 0, away: 1 }),
    }))
    expect(computeMoraleAdjustments(["a"], losses).get("a")).toBe(-MORALE_MAX)
  })

  it("a draw caps the streak at neutral rather than continuing it", () => {
    const map = computeMoraleAdjustments(
      ["a"],
      [
        { homeId: "a", awayId: "b", result: result({ home: 1, away: 0 }) },
        { homeId: "a", awayId: "b", result: result({ home: 1, away: 0 }) },
        { homeId: "a", awayId: "b", result: result({ home: 0, away: 0 }) },
      ]
    )
    expect(map.get("a")).toBe(0)
  })

  it("only the current streak counts — an old loss before a win run does not drag it down", () => {
    const map = computeMoraleAdjustments(
      ["a"],
      [
        { homeId: "a", awayId: "b", result: result({ home: 0, away: 1 }) },
        { homeId: "a", awayId: "b", result: result({ home: 1, away: 0 }) },
        { homeId: "a", awayId: "b", result: result({ home: 1, away: 0 }) },
      ]
    )
    expect(map.get("a")).toBe(2 * MORALE_STEP)
  })

  it("only counts the last five matches", () => {
    const played = [
      { homeId: "a", awayId: "b", result: result({ home: 0, away: 1 }) },
      ...Array.from({ length: 5 }, () => ({
        homeId: "a",
        awayId: "b",
        result: result({ home: 1, away: 0 }),
      })),
    ]
    expect(computeMoraleAdjustments(["a"], played).get("a")).toBe(MORALE_MAX)
  })

  it("ignores fixtures that have not been played", () => {
    const map = computeMoraleAdjustments(
      ["a"],
      [
        { homeId: "a", awayId: "b", result: result({ home: 1, away: 0 }) },
        { homeId: "a", awayId: "b", result: null },
      ]
    )
    expect(map.get("a")).toBe(MORALE_STEP)
  })

  it("reads a team's own result whichever side it played on", () => {
    const map = computeMoraleAdjustments(
      ["a"],
      [{ homeId: "b", awayId: "a", result: result({ home: 0, away: 1 }) }]
    )
    expect(map.get("a")).toBe(MORALE_STEP)
  })
})
