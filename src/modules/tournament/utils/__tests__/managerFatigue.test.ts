import { describe, expect, it } from "vitest"
import { fatigueLevel, staminaPercent } from "../managerFatigue"

describe("fatigueLevel", () => {
  it("is null when there is no data at all", () => {
    expect(fatigueLevel(undefined)).toBeNull()
  })

  it("buckets fresh, tired and exhausted at their thresholds", () => {
    expect(fatigueLevel(0)).toBe("fresh")
    expect(fatigueLevel(0.39)).toBe("fresh")
    expect(fatigueLevel(0.4)).toBe("tired")
    expect(fatigueLevel(0.74)).toBe("tired")
    expect(fatigueLevel(0.75)).toBe("exhausted")
    expect(fatigueLevel(1)).toBe("exhausted")
  })
})

describe("staminaPercent", () => {
  it("reads 100% for a fully fresh player and 0% for a fully spent one", () => {
    expect(staminaPercent(0)).toBe(100)
    expect(staminaPercent(1)).toBe(0)
  })

  it("falls as the underlying fatigue value climbs — the opposite direction", () => {
    expect(staminaPercent(0.2)).toBeGreaterThan(staminaPercent(0.8))
  })

  it("reads fully fresh when there is no fatigue value at all", () => {
    expect(staminaPercent(undefined)).toBe(100)
  })
})
