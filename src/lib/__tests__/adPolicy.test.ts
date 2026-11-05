import { describe, expect, it } from "vitest"
import { AD_CONFIG_DEFAULTS, countReached, fullscreenAllowed, parseAdConfig } from "../adPolicy"

const MIN = 60_000
const cfg = { ad_min_gap_minutes: 3, ad_grace_minutes: 10 }

describe("fullscreenAllowed", () => {
  const now = 1_000 * MIN

  it("blocks everything inside the grace period after the first launch", () => {
    expect(fullscreenAllowed(now, 0, now - 9 * MIN, cfg)).toBe(false)
    expect(fullscreenAllowed(now, 0, now - 10 * MIN, cfg)).toBe(true)
  })

  it("treats a missing first-launch stamp as no grace period", () => {
    expect(fullscreenAllowed(now, 0, 0, cfg)).toBe(true)
  })

  it("keeps the gap after the last full-screen ad", () => {
    expect(fullscreenAllowed(now, now - 2 * MIN, 1, cfg)).toBe(false)
    expect(fullscreenAllowed(now, now - 3 * MIN, 1, cfg)).toBe(true)
  })
})

describe("parseAdConfig", () => {
  it("keeps the defaults when nothing is set", () => {
    expect(parseAdConfig({})).toEqual(AD_CONFIG_DEFAULTS)
  })

  it("reads numbers and booleans from Remote Config strings", () => {
    const cfg = parseAdConfig({ ad_min_gap_minutes: "5", ad_tournament_end: "false" })
    expect(cfg.ad_min_gap_minutes).toBe(5)
    expect(cfg.ad_tournament_end).toBe(false)
  })

  it("ignores values that do not parse, negative numbers and unknown keys", () => {
    const cfg = parseAdConfig({
      ad_min_gap_minutes: "soon",
      ad_market_every: "-1",
      ad_simulation_end: "yes",
      ad_unknown: "7",
    })
    expect(cfg).toEqual(AD_CONFIG_DEFAULTS)
  })
})

describe("countReached", () => {
  it("is due from the Nth occurrence on", () => {
    expect(countReached(1, 2)).toBe(false)
    expect(countReached(2, 2)).toBe(true)
    // Kept past N when the shared clock blocked the ad: the next one is still due.
    expect(countReached(3, 2)).toBe(true)
  })

  it("never fires when the frequency is 0", () => {
    expect(countReached(5, 0)).toBe(false)
  })
})
