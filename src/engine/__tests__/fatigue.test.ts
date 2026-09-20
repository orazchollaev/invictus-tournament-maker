// engine/__tests__/fatigue.test.ts
import { describe, expect, it } from "vitest"
import type { MatchResult, PlayerMatchLine } from "@/modules/tournament/types"
import {
  FATIGUE_FULL_MATCH_LOAD,
  FATIGUE_MAX,
  FATIGUE_POSITION_LOAD,
  averageFatigue,
  computeFatigueByPlayer,
  fatigueAfterMinutes,
  fatigueInjuryMultiplier,
  fatigueRatingPenalty,
  fatigueSampleWeightMultiplier,
  fatigueTeamPowerMalus,
} from "../fatigue"

function line(over: Partial<PlayerMatchLine> = {}): PlayerMatchLine {
  return {
    playerId: "p1",
    side: "home",
    position: "MID",
    goals: 0,
    assists: 0,
    yellow: 0,
    red: 0,
    rating: 6,
    ...over,
  }
}

function match(
  lines: PlayerMatchLine[],
  over: Partial<MatchResult> = {}
): {
  homeId: string
  awayId: string
  result: MatchResult
} {
  return {
    homeId: "home",
    awayId: "away",
    result: {
      home: 1,
      away: 0,
      stats: { events: [], lines, team: {} as never },
      ...over,
    },
  }
}

describe("computeFatigueByPlayer", () => {
  it("nobody is tired before anything has been played", () => {
    expect(computeFatigueByPlayer("home", []).size).toBe(0)
  })

  it("a full ninety adds a full match's worth of load", () => {
    const out = computeFatigueByPlayer("home", [match([line({ playerId: "p1" })])])
    expect(out.get("p1")).toBeCloseTo(FATIGUE_FULL_MATCH_LOAD, 5)
  })

  it("a cameo adds proportionally less than a full match", () => {
    const out = computeFatigueByPlayer("home", [
      match([line({ playerId: "p1", minutesPlayed: 30 })]),
    ])
    expect(out.get("p1")).toBeCloseTo((30 / 90) * FATIGUE_FULL_MATCH_LOAD, 5)
  })

  it("decays a player who does not appear the following match", () => {
    const out = computeFatigueByPlayer("home", [
      match([line({ playerId: "p1" })]),
      match([line({ playerId: "p2" })]), // p1 rests
    ])
    expect(out.get("p1")).toBeLessThan(1)
    expect(out.get("p1")).toBeGreaterThan(0)
  })

  it("settles at a steady level, never exceeding the cap, across many consecutive nineties", () => {
    const matches = Array.from({ length: 10 }, () => match([line({ playerId: "p1" })]))
    const out = computeFatigueByPlayer("home", matches)
    expect(out.get("p1")).toBeLessThanOrEqual(FATIGUE_MAX)
    // load / (1 - decay) = 0.4 / 0.5 = 0.8 — the level an every-match
    // ever-green settles into, well short of the cap.
    expect(out.get("p1")!).toBeCloseTo(0.8, 1)
  })

  it("sheds half of what he carried in for every match he sits out", () => {
    const out = computeFatigueByPlayer("home", [
      match([line({ playerId: "p1" })]),
      match([line({ playerId: "p2" })]), // p1 rests
    ])
    expect(out.get("p1")).toBeCloseTo(FATIGUE_FULL_MATCH_LOAD * 0.5, 5)
  })

  it("ignores a team's own history that belongs to the other side", () => {
    const out = computeFatigueByPlayer("away", [match([line({ playerId: "p1", side: "home" })])])
    expect(out.size).toBe(0)
  })

  it("ignores matches with no report yet", () => {
    const out = computeFatigueByPlayer("home", [{ homeId: "home", awayId: "away", result: null }])
    expect(out.size).toBe(0)
  })

  it("wears a busier position out faster over the same ninety minutes", () => {
    const fwd = computeFatigueByPlayer("home", [
      match([line({ playerId: "p1", position: "FWD" })]),
    ]).get("p1")!
    const gk = computeFatigueByPlayer("home", [
      match([line({ playerId: "p1", position: "GK" })]),
    ]).get("p1")!
    expect(fwd).toBeGreaterThan(gk)
    expect(gk).toBeCloseTo(FATIGUE_FULL_MATCH_LOAD * FATIGUE_POSITION_LOAD.GK, 5)
  })
})

describe("fatigueAfterMinutes", () => {
  it("adds nothing for a player who has not played any more minutes", () => {
    expect(fatigueAfterMinutes(0.3, 0)).toBeCloseTo(0.3, 5)
  })

  it("adds a full match's load, at the position's own pace, for a full ninety more", () => {
    expect(fatigueAfterMinutes(0, 90, "MID")).toBeCloseTo(FATIGUE_FULL_MATCH_LOAD, 5)
    expect(fatigueAfterMinutes(0, 90, "GK")).toBeCloseTo(
      FATIGUE_FULL_MATCH_LOAD * FATIGUE_POSITION_LOAD.GK,
      5
    )
  })

  it("never pushes the total past the cap", () => {
    expect(fatigueAfterMinutes(0.9, 90, "FWD")).toBeLessThanOrEqual(FATIGUE_MAX)
  })
})

describe("averageFatigue", () => {
  it("is zero when nobody in the list has an entry", () => {
    expect(averageFatigue(new Map(), ["a", "b"])).toBe(0)
  })

  it("averages only the ids it actually knows about", () => {
    const map = new Map([
      ["a", 1],
      ["b", 0],
    ])
    expect(averageFatigue(map, ["a", "b", "c"])).toBeCloseTo(0.5, 5)
  })
})

describe("fatigueTeamPowerMalus", () => {
  it("costs nothing for a fully fresh lineup", () => {
    const map = new Map([["p1", 0]])
    expect(fatigueTeamPowerMalus(map, ["p1"])).toBe(0)
  })

  it("costs the most for a fully fatigued lineup", () => {
    const map = new Map([["p1", 1]])
    expect(fatigueTeamPowerMalus(map, ["p1"])).toBeLessThan(0)
  })
})

describe("fatigueRatingPenalty / fatigueSampleWeightMultiplier / fatigueInjuryMultiplier", () => {
  it("are monotonic in fatigue and hit their documented bounds", () => {
    expect(fatigueRatingPenalty(0)).toBe(0)
    expect(fatigueRatingPenalty(1)).toBeLessThan(0)
    expect(fatigueRatingPenalty(1)).toBeLessThan(fatigueRatingPenalty(0.5))

    expect(fatigueSampleWeightMultiplier(0)).toBe(1)
    expect(fatigueSampleWeightMultiplier(1)).toBeGreaterThan(0) // never zeroes a player out entirely
    expect(fatigueSampleWeightMultiplier(1)).toBeLessThan(fatigueSampleWeightMultiplier(0))

    expect(fatigueInjuryMultiplier(0)).toBe(1)
    expect(fatigueInjuryMultiplier(1)).toBeGreaterThan(fatigueInjuryMultiplier(0))
  })

  it("clamps fatigue outside 0-1 rather than extrapolating", () => {
    expect(fatigueRatingPenalty(2)).toBe(fatigueRatingPenalty(1))
    expect(fatigueRatingPenalty(-1)).toBe(fatigueRatingPenalty(0))
  })
})
