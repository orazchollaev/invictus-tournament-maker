import { describe, expect, it } from "vitest"
import { weekOf, weekStart } from "../week"

describe("weekOf", () => {
  it("starts week 0 on the first Monday after the epoch", () => {
    expect(new Date(weekStart(0)).toISOString()).toBe("1970-01-05T00:00:00.000Z")
    expect(new Date(weekStart(0)).getUTCDay()).toBe(1)
  })

  it("turns over at Monday 00:00 UTC, not a moment earlier", () => {
    const monday = Date.UTC(2026, 10, 9) // Monday 9 November 2026
    expect(new Date(monday).getUTCDay()).toBe(1)
    expect(weekOf(monday)).toBe(weekOf(monday - 1) + 1)
    expect(weekOf(monday + 7 * 86_400_000 - 1)).toBe(weekOf(monday))
    expect(weekStart(weekOf(monday))).toBe(monday)
  })
})
