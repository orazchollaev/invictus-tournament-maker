// engine/__tests__/venue.test.ts
//
// A tournament's own home edge, and the neutral final. The override has to
// reach the goal model, and the neutral-final rule has to pick out exactly
// the deciding one-off tie — never a semifinal, never a two-legged final.
import { afterEach, describe, expect, it } from "vitest"
import type { Tournament, TournamentPhase } from "@/modules/tournament/types"
import { createTournament } from "../tournament"
import { matchLambdas, setSimConfig, sideStrength } from "../simulation"
import { isFinalRound, knockoutHomeAdvantage, matchHomeAdvantage, phaseVenue } from "../venue"
import { simulateKnockoutAll } from "../knockoutOps"
import { makeTeams } from "./helpers"

afterEach(() => setSimConfig({ homeAdvantage: 6, surpriseFactor: 50 }))

describe("sideStrength / matchLambdas home advantage override", () => {
  it("falls back to the app-wide setting when no override is given", () => {
    setSimConfig({ homeAdvantage: 10 })
    expect(sideStrength(50, 50)).toBeCloseTo(Math.tanh(10 / 40))
  })

  it("an override of 0 makes equal sides exactly level", () => {
    setSimConfig({ homeAdvantage: 20 })
    expect(sideStrength(50, 50, 0)).toBe(0)
    const { home, away } = matchLambdas(50, 50, { rng: () => 0.5, homeAdvantage: 0 })
    expect(home).toBeCloseTo(away)
  })

  it("clamps an override into the setting's 0-20 range", () => {
    expect(sideStrength(50, 50, 99)).toBeCloseTo(Math.tanh(20 / 40))
    expect(sideStrength(50, 50, -5)).toBe(0)
  })

  it("a bigger home edge raises the home goal rate", () => {
    const flat = matchLambdas(50, 50, { rng: () => 0.5, homeAdvantage: 0 })
    const steep = matchLambdas(50, 50, { rng: () => 0.5, homeAdvantage: 15 })
    expect(steep.home).toBeGreaterThan(flat.home)
    expect(steep.away).toBeLessThan(flat.away)
  })
})

describe("isFinalRound", () => {
  it("is only the last round of a single bracket", () => {
    const t = createTournament("cup", makeTeams(8))
    expect(t.rounds).toHaveLength(3)
    expect(isFinalRound(t, 2)).toBe(true)
    expect(isFinalRound(t, 1)).toBe(false)
    expect(isFinalRound(t, 0)).toBe(false)
  })

  it("is the grand final and its reset in a double bracket", () => {
    const t = createTournament(
      "cup",
      makeTeams(8),
      1,
      false,
      undefined,
      undefined,
      2,
      0,
      "single",
      "single",
      "single",
      undefined,
      true
    )
    const n = t.rounds.length
    expect(isFinalRound(t, n - 1)).toBe(true)
    expect(isFinalRound(t, n - 2)).toBe(true)
    expect(isFinalRound(t, n - 3)).toBe(false)
  })

  it("is false for an empty bracket", () => {
    expect(isFinalRound({ rounds: [] }, 0)).toBe(false)
  })
})

describe("knockoutHomeAdvantage", () => {
  function cup(overrides: Partial<Tournament> = {}): Tournament {
    return { ...createTournament("cup", makeTeams(8)), ...overrides }
  }

  it("is undefined (app-wide) when the tournament sets nothing", () => {
    const t = cup()
    expect(knockoutHomeAdvantage(t, 2, t.rounds[2].matches[0])).toBeUndefined()
  })

  it("carries the tournament's own edge to every tie", () => {
    const t = cup({ homeAdvantage: 12 })
    expect(knockoutHomeAdvantage(t, 0, t.rounds[0].matches[0])).toBe(12)
    expect(knockoutHomeAdvantage(t, 2, t.rounds[2].matches[0])).toBe(12)
  })

  it("puts only the final on neutral ground", () => {
    const t = cup({ homeAdvantage: 12, neutralFinal: true })
    expect(knockoutHomeAdvantage(t, 2, t.rounds[2].matches[0])).toBe(0)
    expect(knockoutHomeAdvantage(t, 1, t.rounds[1].matches[0])).toBe(12)
  })

  it("leaves a two-legged final home and away", () => {
    const t = cup({ neutralFinal: true })
    const final = { ...t.rounds[2].matches[0], leg2Result: null }
    expect(knockoutHomeAdvantage(t, 2, final)).toBeUndefined()
  })
})

describe("matchHomeAdvantage", () => {
  it("finds a bracket final by id", () => {
    const t = { ...createTournament("cup", makeTeams(4)), homeAdvantage: 9, neutralFinal: true }
    expect(matchHomeAdvantage(t, t.rounds[1].matches[0].id)).toBe(0)
    expect(matchHomeAdvantage(t, t.rounds[0].matches[0].id)).toBe(9)
  })

  it("falls back to the tournament's edge for an unknown id", () => {
    const t = { ...createTournament("cup", makeTeams(4)), homeAdvantage: 4 }
    expect(matchHomeAdvantage(t, "nope")).toBe(4)
  })

  it("reads a custom phase's own neutral-final switch", () => {
    const base = createTournament("cup", makeTeams(4))
    const phase: TournamentPhase = {
      id: "p1",
      name: "Cup",
      kind: "knockout",
      pos: { x: 0, y: 0 },
      config: {
        kind: "knockout",
        knockout: {
          seedMode: "seeded",
          hasThirdPlace: false,
          knockoutLegMode: "single",
          roundLegModes: {},
          finalLegMode: "single",
          thirdPlaceLegMode: "single",
          neutralFinal: true,
        },
      },
      teamIds: base.teamIds,
      status: "active",
      rounds: base.rounds,
    }
    const t: Tournament = {
      ...base,
      format: "custom",
      rounds: [],
      homeAdvantage: 7,
      // The top-level switch never reaches a phase.
      neutralFinal: false,
      phases: [phase],
      phaseEdges: [],
    }
    expect(matchHomeAdvantage(t, phase.rounds![1].matches[0].id)).toBe(0)
    expect(matchHomeAdvantage(t, phase.rounds![0].matches[0].id)).toBe(7)
    expect(phaseVenue(phase, t)).toEqual({ homeAdvantage: 7, neutralFinal: true })
  })
})

describe("simulation honours the venue", () => {
  it("a neutral final between equal sides is a coin flip, a home final is not", () => {
    // Two equal teams, power gap amplified, so the home edge is the only tilt.
    setSimConfig({ surpriseFactor: 0, homeAdvantage: 20 })
    const teams = makeTeams(2).map((t) => ({ ...t, power: 60 }))
    const runs = 1500
    let homeWinsNeutral = 0
    let homeWinsHome = 0
    for (let i = 0; i < runs; i++) {
      const neutral = { ...createTournament("f", teams), neutralFinal: true }
      const home = createTournament("f", teams)
      const homeId = neutral.rounds[0].matches[0].homeId
      if (simulateKnockoutAll(neutral, teams) === homeId) homeWinsNeutral++
      const homeSideId = home.rounds[0].matches[0].homeId
      if (simulateKnockoutAll(home, teams) === homeSideId) homeWinsHome++
    }
    expect(homeWinsNeutral / runs).toBeGreaterThan(0.42)
    expect(homeWinsNeutral / runs).toBeLessThan(0.58)
    expect(homeWinsHome / runs).toBeGreaterThan(0.6)
  })
})
