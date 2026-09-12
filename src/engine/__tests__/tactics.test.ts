// engine/__tests__/tactics.test.ts
import { describe, expect, it } from "vitest"
import type { Coach, Formation, PlayStyle, Team } from "@/modules/teams/types"
import type { Player } from "@/modules/players/types"
import {
  COACH_POWER_SWING,
  DEFAULT_FORMATION,
  FORMATIONS,
  FORMATION_LIST,
  MAX_LAMBDA_MULTIPLIER,
  MIN_LAMBDA_MULTIPLIER,
  PLAY_STYLES,
  aiStyleFor,
  coachPowerBonus,
  lambdaMultipliers,
  tacticsProfile,
  teamFormation,
  teamProfile,
} from "../tactics"
import { LINEUP_SIZE, buildLineup } from "../events/lineup"

function teamWith(coach?: Coach): Team {
  return { id: "t", name: "T", color: "#333333", power: 60, ...(coach ? { coach } : {}) }
}

function coach(formation: Formation, style: PlayStyle, power = 50): Coach {
  return { name: "C", formation, style, power }
}

describe("FORMATIONS", () => {
  it("every shape fields exactly eleven", () => {
    for (const formation of FORMATION_LIST) {
      const slots = FORMATIONS[formation]
      const total = slots.GK + slots.DEF + slots.MID + slots.FWD
      expect(total, formation).toBe(LINEUP_SIZE)
    }
  })

  it("every shape plays exactly one keeper", () => {
    for (const formation of FORMATION_LIST) {
      expect(FORMATIONS[formation].GK, formation).toBe(1)
    }
  })
})

describe("coachPowerBonus", () => {
  it("is nothing without a coach", () => {
    expect(coachPowerBonus(undefined)).toBe(0)
    expect(coachPowerBonus(null)).toBe(0)
  })

  it("is zero at the midpoint and symmetric around it", () => {
    expect(coachPowerBonus(50)).toBeCloseTo(0, 10)
    expect(coachPowerBonus(99)).toBeCloseTo(COACH_POWER_SWING, 10)
    expect(coachPowerBonus(1)).toBeCloseTo(-COACH_POWER_SWING, 10)
  })

  it("never exceeds the stated swing, even for an out-of-range rating", () => {
    for (const power of [-50, 0, 1, 50, 99, 100, 500]) {
      expect(Math.abs(coachPowerBonus(power))).toBeLessThanOrEqual(COACH_POWER_SWING + 1e-9)
    }
  })
})

describe("teamProfile", () => {
  it("is neutral for a team with no coach — the pre-coach behaviour, unchanged", () => {
    expect(teamProfile(teamWith())).toEqual({ attack: 0, defense: 0, powerBonus: 0 })
    expect(teamProfile(null)).toEqual({ attack: 0, defense: 0, powerBonus: 0 })
  })

  it("an attacking coach scores more and concedes more than a defensive one", () => {
    const attacking = teamProfile(teamWith(coach("3-4-3", "attacking")))
    const defensive = teamProfile(teamWith(coach("5-4-1", "defensive")))
    expect(attacking.attack).toBeGreaterThan(defensive.attack)
    expect(attacking.defense).toBeLessThan(defensive.defense)
  })

  it("shape and instruction both count — same style, different shapes differ", () => {
    const flat = tacticsProfile({ formation: "4-4-2", style: "balanced" })
    const wide = tacticsProfile({ formation: "3-4-3", style: "balanced" })
    expect(wide.attack).toBeGreaterThan(flat.attack)
  })
})

describe("lambdaMultipliers", () => {
  it("leaves a coachless match exactly as it was", () => {
    const neutral = { attack: 0, defense: 0, powerBonus: 0 }
    expect(lambdaMultipliers(neutral, neutral)).toEqual({ home: 1, away: 1 })
  })

  it("stays inside the clamp for every pairing of shape and style", () => {
    for (const hf of FORMATION_LIST) {
      for (const hs of PLAY_STYLES) {
        for (const af of FORMATION_LIST) {
          for (const as of PLAY_STYLES) {
            const { home, away } = lambdaMultipliers(
              tacticsProfile({ formation: hf, style: hs }, 99),
              tacticsProfile({ formation: af, style: as }, 1)
            )
            expect(home).toBeGreaterThanOrEqual(MIN_LAMBDA_MULTIPLIER)
            expect(home).toBeLessThanOrEqual(MAX_LAMBDA_MULTIPLIER)
            expect(away).toBeGreaterThanOrEqual(MIN_LAMBDA_MULTIPLIER)
            expect(away).toBeLessThanOrEqual(MAX_LAMBDA_MULTIPLIER)
          }
        }
      }
    }
  })

  it("going for it against a balanced side raises the rate, and the risk with it", () => {
    const { home, away } = lambdaMultipliers(
      tacticsProfile({ formation: "3-4-3", style: "attacking" }),
      tacticsProfile({ formation: "4-4-2", style: "balanced" })
    )
    // Moderate by design: the squad rating is meant to stay the main factor,
    // so a fifth either way is the whole budget.
    expect(home).toBeGreaterThan(1.15)
    expect(home).toBeLessThanOrEqual(MAX_LAMBDA_MULTIPLIER)
    // …and the same shape leaks at the back.
    expect(away).toBeGreaterThan(1.1)
  })

  it("an all-out attack against a parked bus is close to a wash — but still worth it", () => {
    const { home } = lambdaMultipliers(
      tacticsProfile({ formation: "3-4-3", style: "attacking" }),
      tacticsProfile({ formation: "5-4-1", style: "defensive" })
    )
    expect(home).toBeGreaterThan(1)
    expect(home).toBeLessThan(1.1)
  })

  it("two defensive sides make for a quiet afternoon", () => {
    const bus = tacticsProfile({ formation: "5-4-1", style: "defensive" })
    const { home, away } = lambdaMultipliers(bus, bus)
    expect(home).toBeLessThan(0.95)
    expect(away).toBeLessThan(0.95)
  })
})

describe("aiStyleFor", () => {
  it("leaves a side alone while it is level or ahead", () => {
    expect(aiStyleFor("defensive", 0, 80)).toBe("defensive")
    expect(aiStyleFor("defensive", 2, 88)).toBe("defensive")
  })

  it("leaves a side alone early, however badly it is going", () => {
    expect(aiStyleFor("balanced", -3, 30)).toBe("balanced")
  })

  it("throws players forward when chasing late", () => {
    expect(aiStyleFor("defensive", -1, 75)).toBe("attacking")
    expect(aiStyleFor("balanced", -2, 62)).toBe("attacking")
  })

  it("only ever goes more attacking, never less", () => {
    for (const base of PLAY_STYLES) {
      for (const diff of [-3, -2, -1, 0, 1]) {
        for (const minute of [10, 45, 61, 75, 89]) {
          const out = aiStyleFor(base, diff, minute)
          const rank = { defensive: 0, balanced: 1, attacking: 2 } as const
          expect(rank[out]).toBeGreaterThanOrEqual(rank[base])
        }
      }
    }
  })
})

describe("teamFormation", () => {
  it("falls back to the engine default", () => {
    expect(teamFormation(teamWith())).toBe(DEFAULT_FORMATION)
    expect(teamFormation(undefined)).toBe(DEFAULT_FORMATION)
  })

  it("reads the coach's shape", () => {
    expect(teamFormation(teamWith(coach("5-3-2", "defensive")))).toBe("5-3-2")
  })
})

describe("buildLineup with a formation", () => {
  function squad(size: number): Player[] {
    const positions = [
      "GK",
      "GK",
      "DEF",
      "DEF",
      "DEF",
      "DEF",
      "DEF",
      "MID",
      "MID",
      "MID",
      "MID",
      "MID",
      "FWD",
      "FWD",
      "FWD",
      "FWD",
    ] as const
    return Array.from({ length: size }, (_, i) => ({
      id: `p${i}`,
      teamId: "t",
      name: `P${i}`,
      position: positions[i % positions.length],
      power: 50 + (i % 10),
    }))
  }

  it("lines up in the shape it was given", () => {
    for (const formation of FORMATION_LIST) {
      const lineup = buildLineup(squad(20), Math.random, formation)
      expect(lineup.length, formation).toBe(LINEUP_SIZE)
      const counts = { GK: 0, DEF: 0, MID: 0, FWD: 0 }
      for (const slot of lineup) counts[slot.position]++
      expect(counts, formation).toEqual(FORMATIONS[formation])
    }
  })

  it("still fields eleven real names when the squad is big enough", () => {
    const lineup = buildLineup(squad(16), Math.random, "5-4-1")
    expect(lineup.filter((s) => s.playerId !== null)).toHaveLength(LINEUP_SIZE)
  })

  it("defaults to the engine formation when none is passed", () => {
    const lineup = buildLineup(squad(20))
    const counts = { GK: 0, DEF: 0, MID: 0, FWD: 0 }
    for (const slot of lineup) counts[slot.position]++
    expect(counts).toEqual(FORMATIONS[DEFAULT_FORMATION])
  })
})
