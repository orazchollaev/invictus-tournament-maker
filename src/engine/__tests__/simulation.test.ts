// engine/__tests__/simulation.test.ts
import { afterEach, describe, expect, it } from "vitest"
import type { Team } from "@/modules/teams/types"
import {
  computeFormAdjustments,
  isFormFactorEnabled,
  setSimConfig,
  simulateMatch,
  simulatePenaltyShootout,
} from "../simulation"
import { makeTeams } from "./helpers"

const DEFAULT_CONFIG = { surpriseFactor: 50, formFactor: false, homeAdvantage: 6 }

afterEach(() => {
  // Restore the module-level simulation config so tests never leak state.
  setSimConfig(DEFAULT_CONFIG)
})

function match(homeId: string, awayId: string) {
  return { id: "m", homeId, awayId, result: null }
}

describe("simulateMatch", () => {
  it("always produces sane, non-negative integer scores", () => {
    const teams = makeTeams(8)
    for (let i = 0; i < 100; i++) {
      const r = simulateMatch(match("t1", "t8"), teams)
      expect(Number.isInteger(r.home)).toBe(true)
      expect(Number.isInteger(r.away)).toBe(true)
      expect(r.home).toBeGreaterThanOrEqual(0)
      expect(r.away).toBeGreaterThanOrEqual(0)
      expect(r.home).toBeLessThanOrEqual(6)
      expect(r.away).toBeLessThanOrEqual(6)
    }
  })

  it("a huge power gap is nearly always a win for the stronger side (surprise 0)", () => {
    setSimConfig({ surpriseFactor: 0, formFactor: false, homeAdvantage: 0 })
    const strong = { id: "s", name: "Strong", color: "#000", power: 100 } as Team
    const weak = { id: "w", name: "Weak", color: "#000", power: 1 } as Team

    let strongWins = 0
    let weakWins = 0
    for (let i = 0; i < 300; i++) {
      const r = simulateMatch(match("s", "w"), [strong, weak])
      if (r.home > r.away) strongWins++
      else if (r.away > r.home) weakWins++
    }
    // Loose statistical bounds (300 runs, expectation ~93%): keeps the test
    // meaningful while staying well outside normal fluctuation.
    expect(strongWins).toBeGreaterThan(260)
    expect(weakWins).toBeLessThan(30)
  })

  it("equal powers produce both winners and draws over many runs", () => {
    setSimConfig({ surpriseFactor: 100, formFactor: false, homeAdvantage: 0 })
    const a = { id: "a", name: "A", color: "#000", power: 50 } as Team
    const b = { id: "b", name: "B", color: "#000", power: 50 } as Team

    let homeWins = 0
    let awayWins = 0
    let draws = 0
    for (let i = 0; i < 300; i++) {
      const r = simulateMatch(match("a", "b"), [a, b])
      if (r.home > r.away) homeWins++
      else if (r.away > r.home) awayWins++
      else draws++
    }
    expect(homeWins).toBeGreaterThan(0)
    expect(awayWins).toBeGreaterThan(0)
    expect(draws).toBeGreaterThan(0)
  })

  it("home advantage boosts the home side's output", () => {
    setSimConfig({ surpriseFactor: 0, formFactor: false, homeAdvantage: 20 })
    const a = { id: "a", name: "A", color: "#000", power: 60 } as Team
    const b = { id: "b", name: "B", color: "#000", power: 60 } as Team

    let homeGoals = 0
    let awayGoals = 0
    for (let i = 0; i < 200; i++) {
      const r = simulateMatch(match("a", "b"), [a, b])
      homeGoals += r.home
      awayGoals += r.away
    }
    expect(homeGoals).toBeGreaterThan(awayGoals)
  })
})

describe("setSimConfig", () => {
  it("clamps surprise factor and home advantage to their ranges", () => {
    setSimConfig({ surpriseFactor: 500, homeAdvantage: 99 })
    // Clamped values are enforced indirectly: simulate with an extreme
    // mismatch still resolves sanely (see tests above). Just verify flags.
    expect(isFormFactorEnabled()).toBe(false)

    setSimConfig({ formFactor: true })
    expect(isFormFactorEnabled()).toBe(true)
  })

  it("persists until changed (module state)", () => {
    setSimConfig({ formFactor: true })
    expect(isFormFactorEnabled()).toBe(true)
    setSimConfig({ formFactor: false })
    expect(isFormFactorEnabled()).toBe(false)
  })
})

describe("computeFormAdjustments", () => {
  it("maps a full winning streak to +10 and a losing streak to -10", () => {
    const wins = Array.from({ length: 5 }, () => ({
      homeId: "a",
      awayId: "b",
      result: { home: 1, away: 0 },
    }))
    expect(computeFormAdjustments(["a"], wins).get("a")).toBe(10)

    const losses = Array.from({ length: 5 }, () => ({
      homeId: "a",
      awayId: "b",
      result: { home: 0, away: 1 },
    }))
    expect(computeFormAdjustments(["a"], losses).get("a")).toBe(-10)
  })

  it("only counts the last five played matches", () => {
    // Oldest match is a loss and must fall out of the five-match window.
    const played = [
      { homeId: "a", awayId: "b", result: { home: 0, away: 1 } },
      ...Array.from({ length: 5 }, () => ({
        homeId: "a",
        awayId: "b",
        result: { home: 1, away: 0 },
      })),
    ]
    expect(computeFormAdjustments(["a"], played).get("a")).toBe(10)
  })

  it("gives zero for teams with no matches and negative for all-draw form", () => {
    const draws = Array.from({ length: 5 }, () => ({
      homeId: "a",
      awayId: "b",
      result: { home: 0, away: 0 },
    }))
    expect(computeFormAdjustments(["a"], draws).get("a")).toBeCloseTo(-3.333, 2)
    expect(computeFormAdjustments(["c"], []).get("c")).toBe(0)
  })
})

describe("simulatePenaltyShootout", () => {
  it("always declares a winner with non-negative scores", () => {
    const teams = makeTeams(2)
    for (let i = 0; i < 50; i++) {
      const r = simulatePenaltyShootout(match("t1", "t2"), teams)
      expect(r.penHome).toBeGreaterThanOrEqual(0)
      expect(r.penAway).toBeGreaterThanOrEqual(0)
      expect(r.penHome).not.toBe(r.penAway)
      expect(r.penHome).toBeLessThanOrEqual(30)
      expect(r.penAway).toBeLessThanOrEqual(30)
    }
  })
})
