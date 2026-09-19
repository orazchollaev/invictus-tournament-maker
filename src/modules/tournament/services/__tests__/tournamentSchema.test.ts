// modules/tournament/services/__tests__/tournamentSchema.test.ts
//
// These are the launch-crash tests. Every case here is a record that used to
// reach the store as-is and take the whole app down with it, so each one
// asserts the same two things: the app still starts, and as much of the user's
// tournament as could be saved was saved.
import { describe, expect, it } from "vitest"
import type { Tournament } from "@/modules/tournament/types"
import { normalizeTournament, parseStoredTournament } from "../tournamentSchema"

/** A minimal but complete record, the shape a healthy save has. */
function healthy(): Record<string, unknown> {
  return {
    id: "t1",
    name: "Cup",
    season: 1,
    format: "bracket",
    teamIds: ["a", "b"],
    rounds: [
      {
        name: "Final",
        matches: [{ id: "m1", homeId: "a", awayId: "b", result: { home: 2, away: 1 } }],
      },
    ],
    winnerId: "a",
    createdAt: 1700000000000,
  }
}

describe("identity", () => {
  it("keeps a healthy record intact", () => {
    const t = normalizeTournament(healthy())
    expect(t).toMatchObject({
      id: "t1",
      name: "Cup",
      season: 1,
      format: "bracket",
      teamIds: ["a", "b"],
      winnerId: "a",
    })
    expect(t?.rounds[0].matches[0].result).toEqual({ home: 2, away: 1 })
  })

  it("rejects anything that is not an object", () => {
    for (const value of [null, undefined, 42, "tournament", [], true]) {
      expect(normalizeTournament(value)).toBeNull()
    }
  })

  it("rejects a record with no id — it could not be saved or deleted anyway", () => {
    expect(normalizeTournament({ ...healthy(), id: undefined })).toBeNull()
    expect(normalizeTournament({ ...healthy(), id: 7 })).toBeNull()
  })

  it("rejects a format nothing knows how to draw", () => {
    expect(normalizeTournament({ ...healthy(), format: "quidditch" })).toBeNull()
    expect(normalizeTournament({ ...healthy(), format: undefined })).toBeNull()
  })

  it("accepts every format the app actually has", () => {
    for (const format of ["bracket", "group+bracket", "league", "swiss", "custom"]) {
      expect(normalizeTournament({ ...healthy(), format })?.format).toBe(format)
    }
  })
})

describe("repairing a partial record", () => {
  it("gives a missing rounds array an empty one instead of undefined", () => {
    const t = normalizeTournament({ ...healthy(), rounds: undefined })
    expect(t?.rounds).toEqual([])
  })

  it("survives rounds that are not an array at all", () => {
    expect(normalizeTournament({ ...healthy(), rounds: "oops" })?.rounds).toEqual([])
    expect(normalizeTournament({ ...healthy(), rounds: { 0: {} } })?.rounds).toEqual([])
  })

  it("drops rounds and matches that carry no usable data", () => {
    const t = normalizeTournament({
      ...healthy(),
      rounds: [
        null,
        { name: "Empty", matches: [] },
        { name: "Semis", matches: [{ id: "ok", homeId: null, awayId: "b", result: null }, {}, 3] },
      ],
    })
    expect(t?.rounds).toHaveLength(1)
    expect(t?.rounds[0].name).toBe("Semis")
    expect(t?.rounds[0].matches).toHaveLength(1)
  })

  it("names a round that lost its name", () => {
    const t = normalizeTournament({
      ...healthy(),
      rounds: [{ matches: [{ id: "m", homeId: "a", awayId: "b", result: null }] }],
    })
    expect(t?.rounds[0].name).toBe("Round 1")
  })

  it("replaces a non-numeric score with an unplayed match", () => {
    const t = normalizeTournament({
      ...healthy(),
      rounds: [
        {
          name: "Final",
          matches: [
            { id: "m1", homeId: "a", awayId: "b", result: { home: "2", away: 1 } },
            { id: "m2", homeId: "a", awayId: "b", result: { home: NaN, away: 1 } },
            { id: "m3", homeId: "a", awayId: "b", result: { away: 1 } },
          ],
        },
      ],
    })
    expect(t?.rounds[0].matches.map((m) => m.result)).toEqual([null, null, null])
  })

  it("keeps the three meanings of leg2Result apart", () => {
    const t = normalizeTournament({
      ...healthy(),
      rounds: [
        {
          name: "Final",
          matches: [
            { id: "single", homeId: "a", awayId: "b", result: null },
            { id: "pending", homeId: "a", awayId: "b", result: null, leg2Result: null },
            {
              id: "played",
              homeId: "a",
              awayId: "b",
              result: { home: 1, away: 0 },
              leg2Result: { home: 0, away: 2 },
            },
          ],
        },
      ],
    })
    const [single, pending, played] = t!.rounds[0].matches
    expect("leg2Result" in single).toBe(false)
    expect(pending.leg2Result).toBeNull()
    expect(played.leg2Result).toEqual({ home: 0, away: 2 })
  })

  it("repairs broken numbers rather than letting NaN reach a table", () => {
    const t = normalizeTournament({
      ...healthy(),
      season: NaN,
      createdAt: "yesterday",
      teamIds: ["a", 5, null, "b"],
    })
    expect(t?.season).toBe(1)
    expect(Number.isFinite(t?.createdAt)).toBe(true)
    expect(t?.teamIds).toEqual(["a", "b"])
  })

  it("drops group standings rows with no team, and zeroes broken counters", () => {
    const t = normalizeTournament({
      ...healthy(),
      format: "group+bracket",
      groups: [
        {
          name: "Group A",
          teamIds: ["a", "b"],
          matches: [
            { id: "g1", homeId: "a", awayId: "b", result: { home: 1, away: 1 } },
            { id: "g2", homeId: "a", result: null },
          ],
          standings: [{ teamId: "a", pts: "three" }, { pts: 3 }, null],
        },
      ],
    })
    expect(t?.groups).toHaveLength(1)
    // The half-written group match is gone; a group fixture always has two sides.
    expect(t?.groups?.[0].matches).toHaveLength(1)
    expect(t?.groups?.[0].standings).toHaveLength(1)
    expect(t?.groups?.[0].standings[0]).toMatchObject({ teamId: "a", pts: 0 })
  })

  it("treats a groups field that is not an array as absent", () => {
    expect(normalizeTournament({ ...healthy(), groups: "none" })?.groups).toBeUndefined()
    expect(normalizeTournament({ ...healthy(), groups: [] })?.groups).toBeUndefined()
  })

  it("repairs a league that lost its matchdays", () => {
    const t = normalizeTournament({
      ...healthy(),
      format: "league",
      league: { standings: [{ teamId: "a" }] },
    })
    expect(t?.league?.matchdays).toEqual([])
    expect(t?.league?.legMode).toBe("single")
  })

  it("drops tiers that have no league left", () => {
    const t = normalizeTournament({
      ...healthy(),
      format: "league",
      tiers: [{ name: "D1", teamIds: ["a"], league: { matchdays: [], standings: [] } }, { name: "D2" }],
    })
    expect(t?.tiers).toHaveLength(1)
  })

  it("never claims a third-place match that is not there", () => {
    const t = normalizeTournament({ ...healthy(), hasThirdPlace: true, thirdPlaceMatch: null })
    expect(t?.hasThirdPlace).toBe(false)
    expect(t?.thirdPlaceMatch).toBeUndefined()
  })

  it("drops a manager pointing at a team that is not in the tournament", () => {
    const withManager = (teamId: unknown) =>
      normalizeTournament({
        ...healthy(),
        manager: { teamId, formation: "4-3-3", style: "balanced", startedAt: 1 },
      })
    expect(withManager("zzz")?.manager).toBeUndefined()
    expect(withManager(undefined)?.manager).toBeUndefined()
    expect(withManager("a")?.manager).toMatchObject({ teamId: "a" })
  })

  it("keeps only numeric point and power adjustments", () => {
    const t = normalizeTournament({
      ...healthy(),
      teamPointAdjustments: { a: -3, b: "x" },
      teamPowerAdjustments: { a: NaN },
    })
    expect(t?.teamPointAdjustments).toEqual({ a: -3 })
    expect(t?.teamPowerAdjustments).toBeUndefined()
  })
})

describe("phase graphs", () => {
  function customRaw(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      ...healthy(),
      format: "custom",
      rounds: [],
      phases: [
        {
          id: "p1",
          name: "Groups",
          kind: "group",
          pos: { x: 10, y: 20 },
          status: "active",
          teamIds: ["a", "b"],
          config: { kind: "group", group: { groupCount: 2 } },
          groups: [
            { name: "Group A", teamIds: ["a", "b"], matches: [], standings: [] },
          ],
        },
        {
          id: "p2",
          name: "Cup",
          kind: "knockout",
          isFinal: true,
          pos: { x: 200, y: 20 },
          status: "pending",
          teamIds: [],
          config: { kind: "knockout", knockout: { seedMode: "seeded" } },
        },
      ],
      phaseEdges: [{ id: "e1", fromPhaseId: "p1", toPhaseId: "p2", fromRank: 1, toRank: 2 }],
      ...overrides,
    }
  }

  it("keeps a healthy graph whole", () => {
    const t = normalizeTournament(customRaw())
    expect(t?.phases).toHaveLength(2)
    expect(t?.phaseEdges).toHaveLength(1)
    expect(t?.phases?.[0]).toMatchObject({ id: "p1", kind: "group", status: "active" })
    expect(t?.phases?.[1].isFinal).toBe(true)
  })

  it("fills in group qualifier counts a record was saved without", () => {
    const raw = customRaw()
    const phases = raw.phases as Record<string, unknown>[]
    // The shape an earlier build wrote: a group config with no qualifiers.
    phases[0].config = { kind: "group", group: { groupCount: 4 } }
    const t = normalizeTournament(raw)
    const cfg = t!.phases![0].config
    expect(cfg.kind).toBe("group")
    if (cfg.kind === "group") {
      expect(cfg.group.qualifiersPerGroup).toBe(2)
      expect(cfg.group.wildcardCount).toBe(0)
      expect(cfg.group.groupCount).toBe(4)
    }
  })

  it("repairs a broken group count rather than passing NaN on", () => {
    const raw = customRaw()
    const phases = raw.phases as Record<string, unknown>[]
    phases[0].config = {
      kind: "group",
      group: { groupCount: "four", qualifiersPerGroup: NaN, wildcardCount: -3 },
    }
    const cfg = normalizeTournament(raw)!.phases![0].config
    if (cfg.kind === "group") {
      expect(cfg.group.groupCount).toBe(2)
      expect(cfg.group.qualifiersPerGroup).toBe(2)
      expect(cfg.group.wildcardCount).toBe(0)
    }
  })

  it("drops a phase whose config is for a different kind", () => {
    const raw = customRaw()
    const phases = raw.phases as Record<string, unknown>[]
    phases[1].config = { kind: "league", league: {} }
    const t = normalizeTournament(raw)
    expect(t?.phases?.map((p) => p.id)).toEqual(["p1"])
    // The edge that pointed at it goes too, or advancing would read a ghost.
    expect(t?.phaseEdges).toEqual([])
  })

  it("drops a phase with an unknown kind or no id", () => {
    const raw = customRaw()
    const phases = raw.phases as Record<string, unknown>[]
    phases.push({ id: "p3", name: "?", kind: "chess", config: {}, pos: {}, status: "pending" })
    phases.push({ name: "no id", kind: "league", config: { kind: "league", league: {} } })
    expect(normalizeTournament(raw)?.phases?.map((p) => p.id)).toEqual(["p1", "p2"])
  })

  it("drops edges that point at nothing, at themselves, or repeat an id", () => {
    const t = normalizeTournament(
      customRaw({
        phaseEdges: [
          { id: "e1", fromPhaseId: "p1", toPhaseId: "p2", fromRank: 1, toRank: 2 },
          { id: "e2", fromPhaseId: "p1", toPhaseId: "ghost", fromRank: 1, toRank: 2 },
          { id: "e3", fromPhaseId: "p1", toPhaseId: "p1", fromRank: 1, toRank: 2 },
          { id: "e1", fromPhaseId: "p1", toPhaseId: "p2", fromRank: 3, toRank: 4 },
          "nonsense",
        ],
      })
    )
    expect(t?.phaseEdges?.map((e) => e.id)).toEqual(["e1"])
  })

  it("repairs an inverted or fractional rank range", () => {
    const t = normalizeTournament(
      customRaw({
        phaseEdges: [{ id: "e1", fromPhaseId: "p1", toPhaseId: "p2", fromRank: 2.6, toRank: 1 }],
      })
    )
    const edge = t!.phaseEdges![0]
    expect(edge.fromRank).toBe(3)
    expect(edge.toRank).toBeGreaterThanOrEqual(edge.fromRank)
  })

  it("puts a phase that claims to be underway with no fixture back to pending", () => {
    const raw = customRaw()
    const phases = raw.phases as Record<string, unknown>[]
    phases[0].groups = undefined
    const t = normalizeTournament(raw)
    expect(t?.phases?.[0].status).toBe("pending")
  })

  it("defaults a missing position and an unknown status", () => {
    const raw = customRaw()
    const phases = raw.phases as Record<string, unknown>[]
    phases[1].pos = "somewhere"
    phases[1].status = "running"
    const t = normalizeTournament(raw)
    expect(t?.phases?.[1].pos).toEqual({ x: 0, y: 0 })
    expect(t?.phases?.[1].status).toBe("pending")
  })

  it("leaves a non-custom tournament with no phase fields", () => {
    const t = normalizeTournament(healthy())
    expect(t?.phases).toBeUndefined()
    expect(t?.phaseEdges).toBeUndefined()
  })

  it("survives a phases field that is not an array", () => {
    const t = normalizeTournament({ ...healthy(), format: "custom", phases: "gone" })
    expect(t?.phases).toEqual([])
    expect(t?.phaseEdges).toEqual([])
  })
})

describe("parseStoredTournament", () => {
  it("parses the JSON the store writes", () => {
    const stored = JSON.stringify(healthy())
    expect(parseStoredTournament(stored)?.id).toBe("t1")
  })

  it("returns null for JSON that was cut off mid-write", () => {
    const stored = JSON.stringify(healthy()).slice(0, 40)
    expect(parseStoredTournament(stored)).toBeNull()
  })

  it("returns null for JSON that is valid but not a tournament", () => {
    expect(parseStoredTournament('{"hello":true}')).toBeNull()
    expect(parseStoredTournament("[]")).toBeNull()
    expect(parseStoredTournament("null")).toBeNull()
  })

  it("accepts an already-parsed object too", () => {
    expect(parseStoredTournament(healthy())?.id).toBe("t1")
  })

  it("round-trips a normalized tournament unchanged", () => {
    const once = normalizeTournament(healthy()) as Tournament
    const twice = parseStoredTournament(JSON.stringify(once))
    expect(twice).toEqual(once)
  })
})
