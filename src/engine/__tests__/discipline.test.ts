// engine/__tests__/discipline.test.ts
import { afterEach, describe, expect, it } from "vitest"
import type { MatchResult, RedCard } from "@/modules/tournament/types"
import type { Player, PlayerPosition } from "@/modules/players/types"
import {
  RED_IN_MATCH_POWER_COST,
  RED_NEXT_MATCH_POWER_CAP,
  RED_NEXT_MATCH_POWER_COST,
  computeDisciplineAdjustments,
  extraTimeRedPenalty,
  inMatchRedPenalty,
  redsOf,
  rollMatchReds,
} from "../discipline"
import { setSimConfig, simulateMatch } from "../simulation"
import { generateMatchStats } from "../events/generate"
import { buildLineup } from "../events/lineup"
import { makeTeams } from "./helpers"

const DEFAULT_CONFIG = {
  surpriseFactor: 50,
  formFactor: false,
  homeAdvantage: 6,
  redCardImpact: true,
}

afterEach(() => {
  setSimConfig(DEFAULT_CONFIG)
})

function seq(values: number[]): () => number {
  let i = 0
  return () => values[i++ % values.length]
}

function result(over: Partial<MatchResult> = {}): MatchResult {
  return { home: 1, away: 1, ...over }
}

describe("rollMatchReds", () => {
  it("rolls nothing when neither side clears the chance", () => {
    expect(rollMatchReds(() => 0.9)).toEqual([])
  })

  it("keeps every dismissal inside the ninety", () => {
    for (let i = 0; i < 200; i++) {
      for (const red of rollMatchReds()) {
        expect(red.minute).toBeGreaterThanOrEqual(1)
        expect(red.minute).toBeLessThanOrEqual(90)
      }
    }
  })

  it("sends off at most one player a side", () => {
    const reds = rollMatchReds(() => 0)
    expect(reds.map((r) => r.side)).toEqual(["home", "away"])
  })
})

describe("inMatchRedPenalty", () => {
  it("costs nothing when nobody was sent off", () => {
    expect(inMatchRedPenalty(undefined)).toEqual({ home: 0, away: 0 })
    expect(inMatchRedPenalty([])).toEqual({ home: 0, away: 0 })
  })

  it("costs half the full penalty for a red on the stroke of half time", () => {
    const penalty = inMatchRedPenalty([{ side: "home", minute: 45 }])
    expect(penalty.home).toBeCloseTo(RED_IN_MATCH_POWER_COST / 2)
    expect(penalty.away).toBe(0)
  })

  it("costs nothing for a dismissal in the last minute", () => {
    expect(inMatchRedPenalty([{ side: "away", minute: 90 }]).away).toBe(0)
  })

  it("charges extra time in full — the whole period is played a man down", () => {
    const penalty = extraTimeRedPenalty([{ side: "away", minute: 88 }])
    expect(penalty.away).toBe(RED_IN_MATCH_POWER_COST)
  })
})

describe("redsOf", () => {
  it("prefers the stored dismissals", () => {
    const reds: RedCard[] = [{ side: "home", minute: 30 }]
    expect(redsOf(result({ reds }))).toEqual(reds)
  })

  it("falls back to the timeline for a hand-entered score", () => {
    const stats = {
      events: [
        { minute: 10, type: "yellow" as const, side: "home" as const, playerId: null },
        { minute: 71, type: "red" as const, side: "away" as const, playerId: null },
      ],
      lines: [],
      team: {} as never,
    }
    expect(redsOf(result({ stats }))).toEqual([{ side: "away", minute: 71 }])
  })

  it("reads nothing off a result with neither", () => {
    expect(redsOf(result())).toEqual([])
    expect(redsOf(null)).toEqual([])
  })
})

describe("computeDisciplineAdjustments", () => {
  const matches = (...rows: { homeId: string; awayId: string; result: MatchResult | null }[]) =>
    rows

  it("penalises only the side that was sent down to ten", () => {
    const map = computeDisciplineAdjustments(
      ["a", "b"],
      matches({
        homeId: "a",
        awayId: "b",
        result: result({ reds: [{ side: "home", minute: 20 }] }),
      })
    )
    expect(map.get("a")).toBe(-RED_NEXT_MATCH_POWER_COST)
    expect(map.get("b")).toBe(0)
  })

  it("only the most recent match counts — a red is served once", () => {
    const map = computeDisciplineAdjustments(
      ["a", "b"],
      matches(
        { homeId: "a", awayId: "b", result: result({ reds: [{ side: "home", minute: 20 }] }) },
        { homeId: "a", awayId: "b", result: result({ reds: [] }) }
      )
    )
    expect(map.get("a")).toBe(0)
  })

  it("caps the residual so a two-red match cannot gut the next one", () => {
    const reds: RedCard[] = [
      { side: "home", minute: 20 },
      { side: "home", minute: 40 },
      { side: "home", minute: 60 },
    ]
    const map = computeDisciplineAdjustments(
      ["a", "b"],
      matches({ homeId: "a", awayId: "b", result: result({ reds }) })
    )
    expect(map.get("a")).toBe(-RED_NEXT_MATCH_POWER_CAP)
  })

  it("ignores fixtures that have not been played", () => {
    const map = computeDisciplineAdjustments(
      ["a", "b"],
      matches(
        { homeId: "a", awayId: "b", result: result({ reds: [{ side: "home", minute: 20 }] }) },
        { homeId: "a", awayId: "b", result: null }
      )
    )
    expect(map.get("a")).toBe(-RED_NEXT_MATCH_POWER_COST)
  })
})

describe("red cards in a simulated match", () => {
  it("stores the dismissals it priced into the score", () => {
    const teams = makeTeams(4)
    let seen = 0
    for (let i = 0; i < 400; i++) {
      const r = simulateMatch({ id: "m", homeId: "t1", awayId: "t2", result: null }, teams)
      if (r.reds) {
        seen++
        expect(r.reds.length).toBeGreaterThan(0)
      }
    }
    expect(seen).toBeGreaterThan(0)
  })

  it("rolls none at all when the setting is off", () => {
    setSimConfig({ redCardImpact: false })
    const teams = makeTeams(4)
    for (let i = 0; i < 200; i++) {
      const r = simulateMatch({ id: "m", homeId: "t1", awayId: "t2", result: null }, teams)
      expect(r.reds).toBeUndefined()
    }
  })

  it("costs the ten-man side goals over a long run", () => {
    setSimConfig({ surpriseFactor: 0, formFactor: false, homeAdvantage: 0, redCardImpact: true })
    const teams = makeTeams(4).map((t) => ({ ...t, power: 60 }))
    const match = { id: "m", homeId: "t1", awayId: "t2", result: null }

    let evenGap = 0
    let shortGap = 0
    for (let i = 0; i < 600; i++) {
      const even = simulateMatch(match, teams)
      evenGap += even.home - even.away
    }
    // Same fixture, but the home side is a man down from the 15th minute.
    const teamsShort = teams.map((t) => (t.id === "t1" ? { ...t, power: 60 - 22 } : t))
    for (let i = 0; i < 600; i++) {
      const short = simulateMatch(match, teamsShort)
      shortGap += short.home - short.away
    }
    expect(shortGap).toBeLessThan(evenGap)
  })
})

describe("the generated timeline replays the dismissals", () => {
  const lineup = () => buildLineup([], seq([0.5]))

  it("shows exactly the reds the score was simulated with", () => {
    const stats = generateMatchStats(
      {
        homeLineup: lineup(),
        awayLineup: lineup(),
        homePower: 60,
        awayPower: 60,
        homeGoals: 1,
        awayGoals: 0,
        reds: [{ side: "away", minute: 37 }],
      },
      seq([0.5, 0.2, 0.8, 0.1])
    )
    const reds = stats.events.filter((e) => e.type === "red")
    expect(reds).toHaveLength(1)
    expect(reds[0]).toMatchObject({ side: "away", minute: 37 })
  })

  it("shows no red at all when the simulator rolled none", () => {
    const stats = generateMatchStats(
      {
        homeLineup: lineup(),
        awayLineup: lineup(),
        homePower: 60,
        awayPower: 60,
        homeGoals: 0,
        awayGoals: 0,
        reds: [],
      },
      seq([0.5, 0.2, 0.8, 0.1])
    )
    expect(stats.events.filter((e) => e.type === "red")).toHaveLength(0)
  })

  it("credits an unfilled slot rather than dropping the dismissal", () => {
    const stats = generateMatchStats(
      {
        homeLineup: lineup(),
        awayLineup: lineup(),
        homePower: 60,
        awayPower: 60,
        homeGoals: 0,
        awayGoals: 0,
        reds: [{ side: "home", minute: 55 }],
      },
      seq([0.5, 0.2, 0.8, 0.1])
    )
    const red = stats.events.find((e) => e.type === "red")
    expect(red).toBeDefined()
    expect(red!.playerId).toBeNull()
    // The anonymous slot still shows the card on its own line.
    const carded = stats.lines.filter((l) => l.red > 0)
    expect(carded).toHaveLength(0)
  })
})

describe("a sent-off player takes no further part", () => {
  /** A full 1-4-3-3, so every slot has a real, identifiable player in it. */
  function squad(prefix: string): Player[] {
    const shape: [PlayerPosition, number][] = [
      ["GK", 1],
      ["DEF", 4],
      ["MID", 3],
      ["FWD", 3],
    ]
    const players: Player[] = []
    for (const [position, count] of shape) {
      for (let i = 0; i < count; i++) {
        players.push({
          id: `${prefix}-${position}${i}`,
          teamId: prefix,
          name: `${prefix} ${position}${i}`,
          position,
          power: 50 + i,
        })
      }
    }
    return players
  }

  function playMatch() {
    return generateMatchStats({
      homeLineup: buildLineup(squad("home")),
      awayLineup: buildLineup(squad("away")),
      homePower: 60,
      awayPower: 60,
      homeGoals: 5,
      awayGoals: 4,
      extraTime: { home: 1, away: 1 },
      penHome: 4,
      penAway: 3,
      reds: [
        { side: "home", minute: 18 },
        { side: "away", minute: 24 },
      ],
    })
  }

  /** Every dismissal in a report, as the player it fell on. */
  function dismissed(events: ReturnType<typeof playMatch>["events"]) {
    return events
      .filter((e) => e.type === "red" && e.playerId !== null)
      .map((e) => ({ playerId: e.playerId as string, minute: e.minute }))
  }

  it("never scores, assists or is booked after the red", () => {
    for (let i = 0; i < 300; i++) {
      const stats = playMatch()
      // Both sides are down to ten, and on real players rather than blanks.
      expect(dismissed(stats.events).length).toBeGreaterThanOrEqual(2)

      for (const red of dismissed(stats.events)) {
        for (const event of stats.events) {
          if (event === undefined) continue
          if (event.type === "red" && event.playerId === red.playerId) continue
          if (event.minute < red.minute) continue
          expect(event.playerId).not.toBe(red.playerId)
          expect(event.assistId ?? null).not.toBe(red.playerId)
        }
      }
    }
  })

  it("takes no kick in the shootout", () => {
    for (let i = 0; i < 300; i++) {
      const stats = playMatch()
      const off = new Set(dismissed(stats.events).map((r) => r.playerId))
      for (const kick of stats.shootout ?? []) {
        expect(off.has(kick.playerId ?? "")).toBe(false)
      }
    }
  })

  it("keeps its own red on its match line", () => {
    const stats = playMatch()
    for (const red of dismissed(stats.events)) {
      const line = stats.lines.find((l) => l.playerId === red.playerId)
      expect(line?.red).toBe(1)
    }
  })
})
