// engine/utils.test.ts
import { describe, expect, it } from "vitest"
import { getRoundName, makeRng, shuffleWith } from "../utils"
import { legModeToCount } from "../tournament"

describe("getRoundName", () => {
  it("names the final round", () => {
    expect(getRoundName(1)).toBe("Final")
  })

  it("names the semi-finals and quarter-finals", () => {
    expect(getRoundName(2)).toBe("Semi-Finals")
    expect(getRoundName(4)).toBe("Quarter-Finals")
  })

  it("falls back to Round of N for larger rounds", () => {
    expect(getRoundName(8)).toBe("Round of 16")
    expect(getRoundName(16)).toBe("Round of 32")
  })
})

describe("makeRng", () => {
  it("is deterministic for a given seed", () => {
    const a = makeRng(42)
    const b = makeRng(42)
    for (let i = 0; i < 10; i++) {
      expect(a()).toBe(b())
    }
  })

  it("produces floats in [0, 1)", () => {
    const rng = makeRng(7)
    for (let i = 0; i < 100; i++) {
      const n = rng()
      expect(n).toBeGreaterThanOrEqual(0)
      expect(n).toBeLessThan(1)
    }
  })

  it("differs across seeds", () => {
    expect(makeRng(1)()).not.toBe(makeRng(2)())
  })
})

describe("shuffleWith", () => {
  it("keeps all elements and their count", () => {
    const input = [1, 2, 3, 4, 5]
    const shuffled = shuffleWith(input, makeRng(99))
    expect(shuffled).toHaveLength(input.length)
    expect([...shuffled].sort()).toEqual([...input].sort())
  })

  it("does not mutate the input array", () => {
    const input = [1, 2, 3]
    shuffleWith(input, makeRng(1))
    expect(input).toEqual([1, 2, 3])
  })
})

describe("legModeToCount", () => {
  it("maps leg modes to the number of legs", () => {
    expect(legModeToCount("single")).toBe(1)
    expect(legModeToCount("double")).toBe(2)
    expect(legModeToCount("triple")).toBe(3)
    expect(legModeToCount("quadruple")).toBe(4)
  })
})
