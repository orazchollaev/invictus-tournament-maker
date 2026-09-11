// engine/__tests__/injuries.test.ts
import { describe, expect, it } from "vitest"
import type { Substitution } from "@/modules/tournament/types"
import {
  INJURY_MAX_MATCHES,
  INJURY_MIN_MATCHES,
  computeInjuryAvailability,
  rollInjuryDuration,
  type InjuryMatch,
} from "../injuries"

function injurySub(over: Partial<Substitution> = {}): Substitution {
  return {
    minute: 30,
    side: "home",
    outPlayerId: "p1",
    inPlayerId: "sub1",
    position: "MID",
    reason: "injury",
    injuryMatches: 2,
    ...over,
  }
}

function match(over: Partial<InjuryMatch> = {}): InjuryMatch {
  return { matchId: "m", leg: 1, homeId: "home", awayId: "away", ...over }
}

describe("rollInjuryDuration", () => {
  it("stays within the documented bounds", () => {
    for (let i = 0; i < 200; i++) {
      const d = rollInjuryDuration()
      expect(d).toBeGreaterThanOrEqual(INJURY_MIN_MATCHES)
      expect(d).toBeLessThanOrEqual(INJURY_MAX_MATCHES)
    }
  })

  it("rolls the minimum on the lowest possible draw", () => {
    expect(rollInjuryDuration(() => 0)).toBe(INJURY_MIN_MATCHES)
  })
})

describe("computeInjuryAvailability", () => {
  it("nobody is unavailable when nothing has happened", () => {
    const out = computeInjuryAvailability([match({ matchId: "m1" }), match({ matchId: "m2" })])
    expect(out.every((a) => a.unavailableHomeIds.length === 0)).toBe(true)
    expect(out.every((a) => a.unavailableAwayIds.length === 0)).toBe(true)
  })

  it("the match a player got hurt in does not count as a miss", () => {
    const out = computeInjuryAvailability([
      match({ matchId: "m1", substitutions: [injurySub({ side: "home", injuryMatches: 2 })] }),
    ])
    // Nothing to report for m1 itself — the availability snapshot is taken
    // BEFORE that match's own subs are read.
    expect(out[0].unavailableHomeIds).toEqual([])
  })

  it("rules the player out of exactly the next N matches for his own team", () => {
    const out = computeInjuryAvailability([
      match({ matchId: "m1", substitutions: [injurySub({ side: "home", injuryMatches: 2 })] }),
      match({ matchId: "m2" }),
      match({ matchId: "m3" }),
      match({ matchId: "m4" }),
    ])
    const byId = new Map(out.map((a) => [a.matchId, a]))
    expect(byId.get("m2")!.unavailableHomeIds).toEqual(["p1"])
    expect(byId.get("m3")!.unavailableHomeIds).toEqual(["p1"])
    expect(byId.get("m4")!.unavailableHomeIds).toEqual([]) // recovered
  })

  it("never touches the other side", () => {
    const out = computeInjuryAvailability([
      match({ matchId: "m1", substitutions: [injurySub({ side: "home" })] }),
      match({ matchId: "m2" }),
    ])
    expect(out[1].unavailableAwayIds).toEqual([])
  })

  it("a team's own recovery clock only ticks on matches that team actually played", () => {
    // p1's team (home = "A") is injured in m1, then sits out a bye-like gap
    // where it is neither home nor away, before its next two fixtures.
    const out = computeInjuryAvailability([
      {
        matchId: "m1",
        leg: 1,
        homeId: "A",
        awayId: "B",
        substitutions: [injurySub({ side: "home" })],
      },
      { matchId: "other", leg: 1, homeId: "C", awayId: "D" }, // A does not play
      { matchId: "m2", leg: 1, homeId: "A", awayId: "C" },
      { matchId: "m3", leg: 1, homeId: "B", awayId: "A" },
      { matchId: "m4", leg: 1, homeId: "A", awayId: "D" },
    ])
    const byId = new Map(out.map((a) => [a.matchId, a]))
    // injuryMatches defaults to 2 — misses A's next two fixtures (m2, m3).
    expect(byId.get("m2")!.unavailableHomeIds).toEqual(["p1"])
    expect(byId.get("m3")!.unavailableAwayIds).toEqual(["p1"])
    expect(byId.get("m4")!.unavailableHomeIds).toEqual([])
  })

  it("ignores a substitution with no injury duration or no player attached", () => {
    const out = computeInjuryAvailability([
      match({
        matchId: "m1",
        substitutions: [injurySub({ injuryMatches: undefined }), injurySub({ outPlayerId: null })],
      }),
      match({ matchId: "m2" }),
    ])
    expect(out[1].unavailableHomeIds).toEqual([])
  })

  it("ignores a tactical substitution entirely", () => {
    const out = computeInjuryAvailability([
      match({ matchId: "m1", substitutions: [injurySub({ reason: "tactical" })] }),
      match({ matchId: "m2" }),
    ])
    expect(out[1].unavailableHomeIds).toEqual([])
  })

  it("a second injury overwrites the first one's clock", () => {
    const out = computeInjuryAvailability([
      match({ matchId: "m1", substitutions: [injurySub({ injuryMatches: 4 })] }),
      match({ matchId: "m2", substitutions: [injurySub({ injuryMatches: 1 })] }),
      match({ matchId: "m3" }),
      match({ matchId: "m4" }),
    ])
    const byId = new Map(out.map((a) => [a.matchId, a]))
    // Re-injured (or the same knock re-logged) in m2 with a shorter duration —
    // only one match missed from that point, not the original four.
    expect(byId.get("m3")!.unavailableHomeIds).toEqual(["p1"])
    expect(byId.get("m4")!.unavailableHomeIds).toEqual([])
  })
})
