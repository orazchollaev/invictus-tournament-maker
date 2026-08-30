import { describe, it, expect } from "vitest"
import { hasFlag } from "../utils/flags"

/**
 * The flag set is pulled in with import.meta.glob. A wrong path does not throw
 * — it just yields an empty set, which shows up as missing flags in the team
 * badge and the language picker rather than as an error. This is the tripwire.
 */
describe("flags", () => {
  it("resolves the bundled circle-flags set", () => {
    expect(hasFlag("tr")).toBe(true)
    expect(hasFlag("br")).toBe(true)
    expect(hasFlag("GB")).toBe(true)
  })

  it("reports a missing flag rather than guessing", () => {
    expect(hasFlag("zz")).toBe(false)
    expect(hasFlag(undefined)).toBe(false)
    expect(hasFlag("")).toBe(false)
  })
})
