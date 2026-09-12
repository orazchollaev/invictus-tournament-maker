// engine/__tests__/liveMatch.test.ts
import { afterEach, describe, expect, it } from "vitest"
import type { Player } from "@/modules/players/types"
import type { Coach, Team } from "@/modules/teams/types"
import {
  MAX_SUBSTITUTIONS,
  advanceMinute,
  applySubstitution,
  benchFor,
  createLiveMatch,
  decideAiTactics,
  endMinute,
  finishLiveMatch,
  onPitchFor,
  playToEnd,
  setTactics,
  type LiveMatchState,
} from "../liveMatch"
import { setSimConfig } from "../simulation"
import { claimWatchedMatch, pendingKey, stashWatchedMatch } from "../events/pending"
import { FULL_TIME_MINUTES, REGULATION_MINUTES } from "../periods"
import { LINEUP_SIZE, slotPower } from "../events/lineup"

const DEFAULT_CONFIG = {
  surpriseFactor: 50,
  formFactor: false,
  homeAdvantage: 6,
  redCardImpact: true,
  injuriesEnabled: true,
}

afterEach(() => {
  setSimConfig(DEFAULT_CONFIG)
})

const POSITION_CYCLE = [
  "GK",
  "DEF",
  "DEF",
  "DEF",
  "DEF",
  "MID",
  "MID",
  "MID",
  "MID",
  "FWD",
  "FWD",
  "GK",
  "DEF",
  "MID",
  "FWD",
  "DEF",
  "MID",
  "FWD",
] as const

function squad(teamId: string, size = 18, power = 60): Player[] {
  return Array.from({ length: size }, (_, i) => ({
    id: `${teamId}-p${i}`,
    teamId,
    name: `${teamId} player ${i}`,
    position: POSITION_CYCLE[i % POSITION_CYCLE.length],
    power,
  }))
}

function team(id: string, power = 60, coach?: Coach): Team {
  return { id, name: id, color: "#333333", power, ...(coach ? { coach } : {}) }
}

function kickoff(overrides: Partial<Parameters<typeof createLiveMatch>[0]> = {}): LiveMatchState {
  return createLiveMatch({
    homeTeam: team("h"),
    awayTeam: team("a"),
    homeSquad: squad("h"),
    awaySquad: squad("a"),
    ...overrides,
  })
}

/** Goals on the timeline, per side — the invariant the scoreboard must match. */
function goalsFromEvents(state: LiveMatchState): { home: number; away: number } {
  const scoring = new Set(["goal", "penGoal", "ownGoal"])
  const tally = { home: 0, away: 0 }
  for (const event of state.events) {
    if (scoring.has(event.type)) tally[event.side]++
  }
  return tally
}

describe("createLiveMatch", () => {
  it("fields eleven a side and puts the rest on the bench", () => {
    const state = kickoff()
    expect(onPitchFor(state, "home")).toHaveLength(LINEUP_SIZE)
    expect(onPitchFor(state, "away")).toHaveLength(LINEUP_SIZE)
    expect(benchFor(state, "home")).toHaveLength(18 - LINEUP_SIZE)
  })

  it("starts at 0-0, on minute zero, with nothing decided", () => {
    const state = kickoff()
    expect(state.minute).toBe(0)
    expect(state.score).toEqual({ home: 0, away: 0 })
    expect(state.events).toHaveLength(0)
    expect(state.finished).toBe(false)
    expect(state.ft).toBeUndefined()
  })

  it("lines the managed side up in the user's shape, not the club coach's", () => {
    const state = kickoff({
      homeTeam: team("h", 60, { name: "C", formation: "5-4-1", style: "defensive", power: 50 }),
      managedSide: "home",
      managedTactics: { formation: "3-4-3", style: "attacking" },
    })
    expect(state.home.tactics).toEqual({ formation: "3-4-3", style: "attacking" })
    expect(onPitchFor(state, "home").filter((s) => s.position === "FWD")).toHaveLength(3)
  })

  it("leaves an unmanaged side on its coach's instructions", () => {
    const state = kickoff({
      awayTeam: team("a", 60, { name: "C", formation: "5-3-2", style: "defensive", power: 40 }),
    })
    expect(state.away.tactics).toEqual({ formation: "5-3-2", style: "defensive" })
    expect(state.away.managed).toBe(false)
  })

  it("plays a coachless side straight down the middle", () => {
    const state = kickoff()
    expect(state.home.tactics.style).toBe("balanced")
    expect(state.home.coachPower).toBeUndefined()
  })
})

describe("advanceMinute", () => {
  it("runs to the final whistle at ninety", () => {
    const state = kickoff()
    playToEnd(state)
    expect(state.minute).toBe(REGULATION_MINUTES)
    expect(state.finished).toBe(true)
    expect(endMinute(state)).toBe(REGULATION_MINUTES)
  })

  it("does nothing once the whistle has gone", () => {
    const state = kickoff()
    playToEnd(state)
    expect(advanceMinute(state)).toEqual([])
    expect(state.minute).toBe(REGULATION_MINUTES)
  })

  it("the scoreboard always equals the goals on the timeline", () => {
    for (let i = 0; i < 50; i++) {
      const state = kickoff()
      playToEnd(state)
      expect(goalsFromEvents(state)).toEqual(state.score)
    }
  })

  it("never places an event outside the minutes actually played", () => {
    for (let i = 0; i < 20; i++) {
      const state = kickoff()
      playToEnd(state)
      for (const event of state.events) {
        expect(event.minute).toBeGreaterThanOrEqual(1)
        expect(event.minute).toBeLessThanOrEqual(endMinute(state))
      }
    }
  })

  it("produces plausible scorelines over many matches", () => {
    let goals = 0
    const runs = 200
    for (let i = 0; i < runs; i++) {
      const state = kickoff()
      playToEnd(state)
      goals += state.score.home + state.score.away
      expect(state.score.home).toBeLessThan(12)
      expect(state.score.away).toBeLessThan(12)
    }
    // Two even sides, ~1.45 expected goals each before home advantage. Wide
    // bounds so only a genuinely broken rate can fail this.
    const perMatch = goals / runs
    expect(perMatch).toBeGreaterThan(1.5)
    expect(perMatch).toBeLessThan(5.5)
  })

  it("a stronger side wins far more often than it loses", () => {
    setSimConfig({ surpriseFactor: 20, homeAdvantage: 0 })
    let strongWins = 0
    let weakWins = 0
    for (let i = 0; i < 200; i++) {
      const state = kickoff({
        homeTeam: team("h", 95),
        awayTeam: team("a", 35),
        homeSquad: squad("h", 18, 95),
        awaySquad: squad("a", 18, 35),
      })
      playToEnd(state)
      if (state.score.home > state.score.away) strongWins++
      else if (state.score.away > state.score.home) weakWins++
    }
    expect(strongWins).toBeGreaterThan(weakWins * 3)
  })

  it("only ever credits a goal to somebody still on the pitch", () => {
    for (let i = 0; i < 40; i++) {
      const state = kickoff()
      playToEnd(state)
      const sentOff = new Map<string, number>()
      for (const event of state.events) {
        if (event.type === "red" && event.playerId) sentOff.set(event.playerId, event.minute)
      }
      for (const event of state.events) {
        if (event.type !== "goal" && event.type !== "penGoal") continue
        if (!event.playerId) continue
        const off = sentOff.get(event.playerId)
        if (off !== undefined) expect(event.minute).toBeLessThan(off)
      }
    }
  })
})

describe("tactics during a match", () => {
  it("switching to attacking raises the scoring rate over the rest of the match", () => {
    setSimConfig({
      surpriseFactor: 50,
      homeAdvantage: 0,
      redCardImpact: false,
      injuriesEnabled: false,
    })

    function secondHalfGoals(style: "attacking" | "defensive"): number {
      let goals = 0
      for (let i = 0; i < 400; i++) {
        const state = kickoff({
          managedSide: "home",
          managedTactics: { formation: "4-4-2", style: "balanced" },
        })
        while (state.minute < 45) advanceMinute(state)
        const atHalfTime = state.score.home
        setTactics(state, "home", { formation: style === "attacking" ? "3-4-3" : "5-4-1", style })
        playToEnd(state)
        goals += state.score.home - atHalfTime
      }
      return goals
    }

    const attacking = secondHalfGoals("attacking")
    const defensive = secondHalfGoals("defensive")
    // ~+21% vs ~-16% on the rate across 400 second halves each — measured at
    // roughly 366 goals against 235. The bound is set far below that gap so
    // only a real regression, not ordinary noise, can fail it.
    expect(attacking).toBeGreaterThan(defensive * 1.15)
  })

  it("the AI throws players forward when it is losing late", () => {
    const state = kickoff({ managedSide: "home" })
    state.minute = 80
    state.score = { home: 2, away: 0 }
    decideAiTactics(state, "away")
    expect(state.away.tactics.style).toBe("attacking")
  })

  it("the AI leaves the managed side's instructions alone", () => {
    const state = kickoff({
      managedSide: "home",
      managedTactics: { formation: "5-4-1", style: "defensive" },
    })
    state.minute = 85
    state.score = { home: 0, away: 3 }
    decideAiTactics(state, "home")
    expect(state.home.tactics.style).toBe("defensive")
  })
})

describe("substitutions", () => {
  it("puts the replacement on the pitch and takes the other man off", () => {
    const state = kickoff({ managedSide: "home" })
    advanceMinute(state)

    const outSlot = onPitchFor(state, "home")[5]
    const inPlayer = benchFor(state, "home")[0]
    expect(applySubstitution(state, "home", outSlot, inPlayer)).not.toBeNull()

    const pitch = onPitchFor(state, "home")
    expect(pitch).toHaveLength(LINEUP_SIZE)
    expect(pitch).not.toContain(outSlot)
    expect(pitch.some((slot) => slot.playerId === inPlayer.id)).toBe(true)
    expect(benchFor(state, "home")).not.toContain(inPlayer)
  })

  it("records it on the timeline, both men named", () => {
    const state = kickoff({ managedSide: "home" })
    advanceMinute(state)
    const outSlot = onPitchFor(state, "home")[3]
    const inPlayer = benchFor(state, "home")[0]
    applySubstitution(state, "home", outSlot, inPlayer)

    const sub = state.events.find((e) => e.type === "sub")
    expect(sub).toMatchObject({ side: "home", playerId: inPlayer.id, assistId: outSlot.playerId })
  })

  it("refuses a man who is not on the pitch and one who is not on the bench", () => {
    const state = kickoff({ managedSide: "home" })
    advanceMinute(state)
    const awaySlot = onPitchFor(state, "away")[0]
    const homeBench = benchFor(state, "home")[0]
    expect(applySubstitution(state, "home", awaySlot, homeBench)).toBeNull()

    const homeSlot = onPitchFor(state, "home")[0]
    const alreadyPlaying = state.home.squad.find(
      (p) => p.id === onPitchFor(state, "home")[1].playerId
    )!
    expect(applySubstitution(state, "home", homeSlot, alreadyPlaying)).toBeNull()
  })

  it("still fields eleven when a substitute is himself substituted", () => {
    const state = kickoff({ managedSide: "home", homeSquad: squad("h", 20) })
    advanceMinute(state)

    const first = benchFor(state, "home")[0]
    applySubstitution(state, "home", onPitchFor(state, "home")[4], first)
    const firstSlot = onPitchFor(state, "home").find((s) => s.playerId === first.id)!

    advanceMinute(state)
    const second = benchFor(state, "home")[0]
    expect(applySubstitution(state, "home", firstSlot, second)).not.toBeNull()

    const pitch = onPitchFor(state, "home")
    expect(pitch).toHaveLength(LINEUP_SIZE)
    expect(pitch.some((s) => s.playerId === first.id)).toBe(false)
    expect(pitch.some((s) => s.playerId === second.id)).toBe(true)

    // And the three men who wore that shirt split the ninety between them.
    playToEnd(state)
    const { stats } = finishLiveMatch(state)
    const shirt = stats.lines.filter((l) =>
      [first.id, second.id, firstSlot.playerId].includes(l.playerId)
    )
    const minutes = shirt.reduce((sum, l) => sum + (l.minutesPlayed ?? 0), 0)
    expect(minutes).toBeGreaterThan(0)
    expect(minutes).toBeLessThanOrEqual(REGULATION_MINUTES)
  })

  it("stops at the allowance", () => {
    const state = kickoff({ managedSide: "home", homeSquad: squad("h", 20) })
    advanceMinute(state)
    for (let i = 0; i < MAX_SUBSTITUTIONS; i++) {
      const outSlot = onPitchFor(state, "home")[i]
      const inPlayer = benchFor(state, "home")[0]
      expect(applySubstitution(state, "home", outSlot, inPlayer)).not.toBeNull()
    }
    const extra = applySubstitution(
      state,
      "home",
      onPitchFor(state, "home")[LINEUP_SIZE - 1],
      benchFor(state, "home")[0]
    )
    expect(extra).toBeNull()
    expect(state.home.subsUsed).toBe(MAX_SUBSTITUTIONS)
  })

  it("the man coming on is worth what he is worth in that shirt", () => {
    const state = kickoff({ managedSide: "home" })
    advanceMinute(state)

    const outSlot = onPitchFor(state, "home")[2]
    const inPlayer = benchFor(state, "home")[0]
    const before = onPitchFor(state, "home").reduce((sum, s) => sum + s.power, 0)
    applySubstitution(state, "home", outSlot, inPlayer)

    const inSlot = onPitchFor(state, "home").find((s) => s.playerId === inPlayer.id)!
    expect(inSlot.position).toBe(outSlot.position)
    expect(inSlot.power).toBe(slotPower(inPlayer, outSlot.position))

    const after = onPitchFor(state, "home").reduce((sum, s) => sum + s.power, 0)
    expect(after - before).toBe(inSlot.power - outSlot.power)
  })
})

describe("red cards", () => {
  it("leave the side a man short for the rest of the match", () => {
    let checked = 0
    for (let i = 0; i < 120 && checked < 5; i++) {
      const state = kickoff()
      playToEnd(state)
      const red = state.events.find((e) => e.type === "red")
      if (!red) continue
      checked++
      const shorthanded = state[red.side]
      const pitch = onPitchFor(state, red.side)
      expect(pitch.length).toBeLessThan(LINEUP_SIZE)
      expect(shorthanded.state.dismissals.length).toBeGreaterThan(0)
      expect(state.reds.some((r) => r.side === red.side && r.minute === red.minute)).toBe(true)
    }
    expect(checked).toBeGreaterThan(0)
  })

  it("are never rolled in the opening quarter-hour", () => {
    for (let i = 0; i < 60; i++) {
      const state = kickoff()
      playToEnd(state)
      for (const red of state.reds) expect(red.minute).toBeGreaterThanOrEqual(15)
    }
  })
})

describe("a tie that needs a winner", () => {
  function playTie(): LiveMatchState {
    const state = kickoff({ requiresWinner: true })
    playToEnd(state)
    return state
  }

  it("runs to a hundred and twenty when level at ninety, and stamps the 90' score", () => {
    let sawExtraTime = 0
    for (let i = 0; i < 60 && sawExtraTime < 3; i++) {
      const state = playTie()
      if (!state.extraTime) {
        expect(state.minute).toBe(REGULATION_MINUTES)
        expect(state.score.home).not.toBe(state.score.away)
        continue
      }
      sawExtraTime++
      expect(state.minute).toBe(FULL_TIME_MINUTES)
      expect(state.ft).toBeDefined()
      expect(state.ft!.home).toBe(state.ft!.away)
      expect(state.score.home).toBeGreaterThanOrEqual(state.ft!.home)
      expect(state.score.away).toBeGreaterThanOrEqual(state.ft!.away)
    }
    expect(sawExtraTime).toBeGreaterThan(0)
  })

  it("goes to kicks only when still level after extra time", () => {
    let sawShootout = 0
    for (let i = 0; i < 200 && sawShootout < 3; i++) {
      const state = playTie()
      if (!state.shootout) {
        if (state.extraTime) expect(state.score.home).not.toBe(state.score.away)
        continue
      }
      sawShootout++
      expect(state.score.home).toBe(state.score.away)
      expect(state.shootout.penHome).not.toBe(state.shootout.penAway)
    }
    expect(sawShootout).toBeGreaterThan(0)
  })

  it("counts the first leg when deciding whether the tie is level", () => {
    // Home lost the first leg 0-2, so 2-0 here is level on aggregate and the
    // tie has to go on. The ninetieth minute can still produce a goal, so the
    // assertion is the rule itself rather than a fixed outcome.
    const offset = { home: 0, away: 2 }
    for (let i = 0; i < 30; i++) {
      const state = kickoff({ requiresWinner: true, aggregateOffset: offset })
      while (state.minute < REGULATION_MINUTES - 1) advanceMinute(state)
      state.score = { home: 2, away: 0 }
      advanceMinute(state)

      const level = state.score.home + offset.home === state.score.away + offset.away
      expect(state.extraTime).toBe(level)
      expect(state.finished).toBe(!level)
    }
  })

  it("ends at ninety when a league match is drawn", () => {
    const state = kickoff({ requiresWinner: false })
    playToEnd(state)
    expect(state.extraTime).toBe(false)
    expect(state.shootout).toBeUndefined()
    expect(state.minute).toBe(REGULATION_MINUTES)
  })
})

describe("finishLiveMatch", () => {
  it("hands back a result matching the match that was played", () => {
    const state = kickoff()
    playToEnd(state)
    const { result } = finishLiveMatch(state)
    expect(result.home).toBe(state.score.home)
    expect(result.away).toBe(state.score.away)
    expect(result.ft).toBeUndefined()
  })

  it("builds a report whose goals add up to the score", () => {
    for (let i = 0; i < 30; i++) {
      const state = kickoff()
      playToEnd(state)
      const { stats } = finishLiveMatch(state)

      const scored = { home: 0, away: 0 }
      for (const line of stats.lines) scored[line.side] += line.goals
      // Own goals count for the other side, so they are added back the same
      // way the report renders them.
      const ownGoals = { home: 0, away: 0 }
      for (const event of state.events) {
        if (event.type === "ownGoal") ownGoals[event.side]++
      }
      expect(scored.home + ownGoals.home).toBe(state.score.home)
      expect(scored.away + ownGoals.away).toBe(state.score.away)
    }
  })

  it("rates every player in range and gives both sides a full set of lines", () => {
    const state = kickoff()
    playToEnd(state)
    const { stats } = finishLiveMatch(state)
    expect(stats.lines.filter((l) => l.side === "home").length).toBeGreaterThanOrEqual(LINEUP_SIZE)
    for (const line of stats.lines) {
      expect(line.rating).toBeGreaterThanOrEqual(1)
      expect(line.rating).toBeLessThanOrEqual(10)
    }
  })

  it("returns the timeline in minute order", () => {
    const state = kickoff()
    playToEnd(state)
    const { stats } = finishLiveMatch(state)
    const minutes = stats.events.map((e) => e.minute)
    expect([...minutes].sort((a, b) => a - b)).toEqual(minutes)
  })

  it("carries the substitutions through to the report", () => {
    const state = kickoff({ managedSide: "home" })
    advanceMinute(state)
    applySubstitution(state, "home", onPitchFor(state, "home")[7], benchFor(state, "home")[0])
    playToEnd(state)
    const { stats } = finishLiveMatch(state)
    expect(stats.substitutions?.some((s) => s.side === "home")).toBe(true)
  })

  it("produces a result the watched-match stash accepts", () => {
    const state = kickoff()
    playToEnd(state)
    const { result, stats } = finishLiveMatch(state)

    const key = pendingKey("m1", 1)
    stashWatchedMatch(key, {
      home: result.home,
      away: result.away,
      ...(result.ft ? { ft: result.ft } : {}),
      ...(result.reds ? { reds: result.reds } : {}),
      stats,
    })
    // The commit path re-checks the score before applying the stash, so this
    // is the assertion that a managed match survives being saved.
    const committed = { home: result.home, away: result.away }
    expect(claimWatchedMatch(key, committed)).toBe(stats)
  })

  it("carries extra time and the shootout onto the result", () => {
    let checked = false
    for (let i = 0; i < 300 && !checked; i++) {
      const state = kickoff({ requiresWinner: true })
      playToEnd(state)
      if (!state.shootout) continue
      checked = true
      const { result, stats } = finishLiveMatch(state)
      expect(result.ft).toEqual(state.ft)
      expect(result.penHome).toBe(state.shootout.penHome)
      expect(result.penAway).toBe(state.shootout.penAway)
      expect(stats.shootout?.length).toBe(state.shootout.kicks.length)
    }
    expect(checked).toBe(true)
  })
})

describe("with injuries switched off", () => {
  it("never forces a change", () => {
    setSimConfig({ injuriesEnabled: false })
    for (let i = 0; i < 40; i++) {
      const state = kickoff({ managedSide: "home" })
      playToEnd(state)
      expect(state.home.subsUsed).toBe(0)
    }
  })
})
