// engine/__tests__/knockout.test.ts
//
// One tie, one rule: ninety minutes, then extra time, then kicks. These pin
// the boundaries between the three, and the one case that used to be written
// out six different ways — a level *leg* whose *aggregate* is not level.
import { describe, it, expect } from "vitest"
import { decideKnockoutResult, extraTimeGoalsOf } from "../knockout"
import { setSimConfig } from "../simulation"
import { makeTeams } from "./helpers"

const MATCH = { id: "m1", homeId: "t1", awayId: "t2" } as never

/** A pile of ties, so the rare branches actually show up. */
function decideMany(count: number, opts?: Parameters<typeof decideKnockoutResult>[2]) {
  const teams = makeTeams(2)
  return Array.from({ length: count }, () => decideKnockoutResult(MATCH, teams, opts))
}

describe("decideKnockoutResult", () => {
  it("always produces a winner", () => {
    for (const { result } of decideMany(400)) {
      const home = result.home + (result.penHome ?? 0)
      const away = result.away + (result.penAway ?? 0)
      expect(home).not.toBe(away)
    }
  })

  it("leaves ft unset exactly when ninety minutes settled it", () => {
    const decisions = decideMany(400)
    expect(decisions.some((d) => !d.result.ft)).toBe(true)

    for (const { result, extraTimeGoals, shootout } of decisions) {
      if (result.ft) continue
      // No extra time means the ninety minutes were the whole match.
      expect(result.home).not.toBe(result.away)
      expect(extraTimeGoals).toBeUndefined()
      expect(shootout).toBeUndefined()
      expect(result.penHome).toBeUndefined()
    }
  })

  it("records the score at ninety whenever extra time was played", () => {
    const withExtra = decideMany(600).filter((d) => d.result.ft)
    expect(withExtra.length).toBeGreaterThan(0)

    for (const { result, extraTimeGoals } of withExtra) {
      // Extra time only happens off a level ninety minutes.
      expect(result.ft!.home).toBe(result.ft!.away)
      // And the goals it produced are folded into the final score.
      expect(extraTimeGoalsOf(result)).toEqual(extraTimeGoals)
      expect(result.home).toBe(result.ft!.home + extraTimeGoals!.home)
      expect(result.away).toBe(result.ft!.away + extraTimeGoals!.away)
    }
  })

  it("only goes to kicks when extra time left it level", () => {
    for (const { result, shootout } of decideMany(600)) {
      if (result.penHome === undefined) continue
      expect(result.home).toBe(result.away)
      expect(result.ft).toBeDefined()
      expect(shootout!.penHome).toBe(result.penHome)
      expect(shootout!.penAway).toBe(result.penAway)
    }
  })

  it("judges a second leg on aggregate, not on the leg", () => {
    // Leg 1 finished 3-0 to the side that is away in this frame, so a level
    // leg is a three-goal aggregate defeat — nothing to settle.
    const decisions = decideMany(300, { aggregateOffset: { home: 0, away: 3 } })
    const levelLegs = decisions.filter((d) => d.result.home === d.result.away)
    expect(levelLegs.length).toBeGreaterThan(0)
    for (const { result } of levelLegs) {
      expect(result.ft).toBeUndefined()
      expect(result.penHome).toBeUndefined()
    }
  })

  it("goes to extra time when the leg is level on aggregate but not on the night", () => {
    // Leg 1 was 0-2 in this frame, so a 2-0 leg makes the aggregate level.
    const decisions = decideMany(600, { aggregateOffset: { home: 0, away: 2 } })
    const levelAggregate = decisions.filter((d) => d.result.home === d.result.away + 2)
    expect(levelAggregate.length).toBeGreaterThan(0)
    for (const { result } of levelAggregate) {
      expect(result.ft).toBeDefined()
    }
  })

  it("respects the surprise factor rather than reading it once", () => {
    setSimConfig({ surpriseFactor: 0 })
    const dominant = decideMany(200).filter((d) => d.result.home > d.result.away).length
    setSimConfig({ surpriseFactor: 100 })
    const chaotic = decideMany(200).filter((d) => d.result.home > d.result.away).length
    setSimConfig({ surpriseFactor: 50 })

    // t1 is the stronger side, so lowering the surprise factor should win it
    // more ties, not fewer.
    expect(dominant).toBeGreaterThan(chaotic)
  })
})
