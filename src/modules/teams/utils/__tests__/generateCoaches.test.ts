import { describe, expect, it } from "vitest"
import type { Team } from "@/modules/teams/types"
import { FORMATION_LIST, PLAY_STYLES } from "@/engine"
import {
  COACH_POWER_SPREAD,
  drawCoachSpec,
  drawCoachSpecs,
  planCoachGeneration,
  randomCoachTactics,
} from "../generateCoaches"

const FIRST = ["Ada", "Bo", "Cem", "Dev"]
const LAST = ["Kaya", "Lang", "Moss", "Nero"]

function team(id: string, power: number, hasCoach = false): Team {
  return {
    id,
    name: `Team ${id}`,
    color: "#333333",
    power,
    ...(hasCoach
      ? {
          coach: {
            name: "Existing",
            formation: "4-4-2" as const,
            style: "balanced" as const,
            power: 50,
          },
        }
      : {}),
  }
}

/** Deterministic stand-in for Math.random, cycling a fixed sequence. */
function seededRng(values: number[]): () => number {
  let i = 0
  return () => values[i++ % values.length]
}

describe("planCoachGeneration", () => {
  it("skips clubs that already have a manager", () => {
    const teams = [team("a", 70), team("b", 60, true), team("c", 50)]
    expect(planCoachGeneration(teams, false).map((t) => t.id)).toEqual(["a", "c"])
  })

  it("takes every club when overwriting", () => {
    const teams = [team("a", 70), team("b", 60, true)]
    expect(planCoachGeneration(teams, true).map((t) => t.id)).toEqual(["a", "b"])
  })

  it("returns a copy, never the caller's array", () => {
    const teams = [team("a", 70)]
    expect(planCoachGeneration(teams, true)).not.toBe(teams)
  })
})

describe("drawCoachSpec", () => {
  it("draws a rating near the club's own", () => {
    for (const power of [10, 50, 90]) {
      for (let i = 0; i < 200; i++) {
        const spec = drawCoachSpec(team("t", power), FIRST, LAST)
        expect(Math.abs(spec.power - power)).toBeLessThanOrEqual(COACH_POWER_SPREAD + 1)
      }
    }
  })

  it("clamps to the 1-99 rating range at both ends", () => {
    for (let i = 0; i < 300; i++) {
      expect(drawCoachSpec(team("t", 1), FIRST, LAST).power).toBeGreaterThanOrEqual(1)
      expect(drawCoachSpec(team("t", 99), FIRST, LAST).power).toBeLessThanOrEqual(99)
    }
  })

  it("only ever produces a real formation and style", () => {
    for (let i = 0; i < 200; i++) {
      const spec = drawCoachSpec(team("t", 60), FIRST, LAST)
      expect(FORMATION_LIST).toContain(spec.formation)
      expect(PLAY_STYLES).toContain(spec.style)
    }
  })

  it("is deterministic under a seeded rng", () => {
    const a = drawCoachSpec(team("t", 60), FIRST, LAST, seededRng([0.1, 0.2, 0.3, 0.4, 0.5]))
    const b = drawCoachSpec(team("t", 60), FIRST, LAST, seededRng([0.1, 0.2, 0.3, 0.4, 0.5]))
    expect(a).toEqual(b)
  })

  it("falls back to a name rather than throwing on an empty pool", () => {
    expect(drawCoachSpec(team("t", 60), [], []).name).toBe("Coach")
  })
})

describe("drawCoachSpecs", () => {
  it("names every club's manager without repeating one", () => {
    const teams = Array.from({ length: 8 }, (_, i) => team(`t${i}`, 50 + i))
    const specs = drawCoachSpecs(teams, FIRST, LAST)
    expect(specs).toHaveLength(8)
    expect(new Set(specs.map((s) => s.name)).size).toBe(8)
    expect(specs.map((s) => s.teamId)).toEqual(teams.map((t) => t.id))
  })

  it("keeps going once the name pool is exhausted", () => {
    const teams = Array.from({ length: 30 }, (_, i) => team(`t${i}`, 60))
    expect(drawCoachSpecs(teams, ["Solo"], ["Name"])).toHaveLength(30)
  })
})

describe("randomCoachTactics", () => {
  it("always returns a usable pair", () => {
    for (let i = 0; i < 100; i++) {
      const { formation, style } = randomCoachTactics()
      expect(FORMATION_LIST).toContain(formation)
      expect(PLAY_STYLES).toContain(style)
    }
  })
})
