import { describe, it, expect } from "vitest"
import type { Player } from "@/modules/players/types"
import { planGeneration, drawGenerationSpecs } from "../generatePlayers"

function makePlayer(position: Player["position"]): Player {
  return { id: `${position}-${Math.random()}`, teamId: "t1", name: "X", position, power: 60 }
}

describe("planGeneration", () => {
  it("fills an empty squad to the full position split", () => {
    const plan = planGeneration([])
    const total = plan.reduce((sum, d) => sum + d.count, 0)
    expect(total).toBe(18)
    expect(plan.find((d) => d.position === "GK")?.count).toBe(2)
    expect(plan.find((d) => d.position === "DEF")?.count).toBe(6)
    expect(plan.find((d) => d.position === "MID")?.count).toBe(6)
    expect(plan.find((d) => d.position === "FWD")?.count).toBe(4)
  })

  it("adds nothing once the squad already meets the target size", () => {
    const squad = Array.from({ length: 20 }, () => makePlayer("MID"))
    expect(planGeneration(squad)).toEqual([])
  })

  it("only tops up the positions that are actually short", () => {
    const squad = Array.from({ length: 2 }, () => makePlayer("GK"))
    const plan = planGeneration(squad)
    expect(plan.find((d) => d.position === "GK")).toBeUndefined()
    expect(plan.find((d) => d.position === "DEF")?.count).toBe(6)
  })

  it("never plans past the overall squad target", () => {
    // 15 GKs already fills far past target depth for that position, but the
    // squad as a whole still has room — only that remaining room is planned.
    const squad = Array.from({ length: 15 }, () => makePlayer("GK"))
    const plan = planGeneration(squad)
    const total = plan.reduce((sum, d) => sum + d.count, 0)
    expect(total).toBe(3)
  })
})

describe("drawGenerationSpecs", () => {
  it("produces one spec per planned slot, with power around the team's rating", () => {
    const plan = [
      { position: "GK" as const, count: 2 },
      { position: "FWD" as const, count: 3 },
    ]
    const specs = drawGenerationSpecs(plan, ["A", "B"], ["X", "Y"], 70)
    expect(specs).toHaveLength(5)
    for (const spec of specs) {
      expect(spec.power).toBeGreaterThanOrEqual(55)
      expect(spec.power).toBeLessThanOrEqual(85)
      expect(spec.name.trim().length).toBeGreaterThan(0)
    }
  })

  it("clamps power to 1-99 even at the extremes of the team rating range", () => {
    const plan = [{ position: "FWD" as const, count: 20 }]
    const low = drawGenerationSpecs(plan, ["A"], ["X"], 1)
    const high = drawGenerationSpecs(plan, ["A"], ["X"], 99)
    for (const spec of [...low, ...high]) {
      expect(spec.power).toBeGreaterThanOrEqual(1)
      expect(spec.power).toBeLessThanOrEqual(99)
    }
  })

  it("centers generated power on the team's rating, not a fixed default", () => {
    const plan = [{ position: "MID" as const, count: 200 }]
    const specs = drawGenerationSpecs(plan, ["A"], ["X"], 85)
    const average = specs.reduce((sum, s) => sum + s.power, 0) / specs.length
    expect(average).toBeGreaterThan(80)
  })

  it("avoids repeating a name while the pool has unused combinations left", () => {
    const plan = [{ position: "MID" as const, count: 4 }]
    const specs = drawGenerationSpecs(plan, ["A", "B"], ["X", "Y"])
    const names = specs.map((s) => s.name)
    expect(new Set(names).size).toBe(4)
  })

  it("gives every generated player a unique shirt number", () => {
    const plan = [{ position: "MID" as const, count: 18 }]
    const specs = drawGenerationSpecs(plan, ["A"], ["X"])
    const numbers = specs.map((s) => s.number)
    expect(numbers.every((n) => n !== undefined)).toBe(true)
    expect(new Set(numbers).size).toBe(numbers.length)
  })

  it("never reuses a shirt number already taken by the existing squad", () => {
    const plan = [{ position: "MID" as const, count: 10 }]
    const taken = new Set([1, 2, 3, 4, 5])
    const specs = drawGenerationSpecs(plan, ["A"], ["X"], 60, taken)
    for (const spec of specs) {
      expect(taken.has(spec.number as number)).toBe(false)
    }
  })
})
