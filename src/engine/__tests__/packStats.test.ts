import { beforeEach, describe, expect, it } from "vitest"
import type { Player } from "@/modules/players/types"
import type { MatchStats } from "@/modules/tournament/types"
import { parseStoredTournament } from "@/modules/tournament/services/tournamentSchema"
import { ensureMatchStats } from "../events/ensure"
import { clearStatsCache, packStats, statsOf, unpackStats } from "../events/packStats"
import { createLeague } from "../tournament"
import { simulateAllLeague } from "../league"
import { makeTeams } from "./helpers"

function squads(teamIds: string[]): Player[] {
  return teamIds.flatMap((teamId) =>
    Array.from(
      { length: 20 },
      (_, i) =>
        ({
          id: `${teamId}-p${i}`,
          name: `P${i}`,
          teamId,
          position: (["GK", "DEF", "MID", "FWD"] as const)[i % 4],
          power: 60 + i,
        }) as unknown as Player
    )
  )
}

function playedLeague(teamCount = 8) {
  const teams = makeTeams(teamCount)
  const t = createLeague("L", teams, 1, "single")
  simulateAllLeague(t as never, teams)
  ensureMatchStats(t, teams, squads(teams.map((x) => x.id)))
  return t
}

beforeEach(() => clearStatsCache())

describe("packStats", () => {
  it("round-trips every generated report exactly", () => {
    const t = playedLeague()
    const matches = t.league!.matchdays.flatMap((d) => d.matches)
    expect(matches.length).toBeGreaterThan(20)
    for (const m of matches) {
      const stats = statsOf(m.result)!
      expect(stats).toBeTruthy()
      expect(unpackStats(packStats(stats))).toStrictEqual(stats)
    }
  })

  it("keeps the optional fields' presence, absence and null apart", () => {
    const stats: MatchStats = {
      events: [
        { minute: 10, type: "goal", side: "home", playerId: "a", assistId: "b" },
        { minute: 20, type: "goal", side: "away", playerId: "c", assistId: null },
        { minute: 30, type: "yellow", side: "home", playerId: null },
        { minute: 95, type: "red", side: "away", playerId: "d" },
      ],
      lines: [
        {
          playerId: "a",
          side: "home",
          position: "GK",
          goals: 0,
          assists: 0,
          yellow: 0,
          red: 0,
          saves: 0,
          conceded: 2,
          cleanSheet: false,
          rating: 6.5,
          minutesPlayed: 60,
        },
        {
          playerId: null,
          side: "away",
          position: "FWD",
          goals: 1,
          assists: 0,
          yellow: 1,
          red: 0,
          rating: 8,
        },
      ],
      team: {
        possession: 55,
        shots: [10, 4],
        onTarget: [5, 1],
        corners: [6, 2],
        fouls: [9, 12],
        xg: [1.7, 0.3],
        bigChances: [2, 0],
        offsides: [1, 3],
      },
      substitutions: [
        {
          minute: 60,
          side: "home",
          outPlayerId: "a",
          inPlayerId: null,
          position: "DEF",
          reason: "injury",
          injuryMatches: 3,
        },
        { minute: 70, side: "away", outPlayerId: null, inPlayerId: "c", position: "MID" },
      ],
      shootout: [
        { order: 1, side: "home", playerId: "a", scored: true },
        { order: 2, side: "away", playerId: null, scored: false },
      ],
    }
    expect(unpackStats(packStats(stats))).toStrictEqual(stats)

    const bare: MatchStats = { ...stats, substitutions: undefined, shootout: undefined }
    delete bare.substitutions
    delete bare.shootout
    expect(unpackStats(packStats(bare))).toStrictEqual(bare)
  })

  it("is far smaller than the unpacked report", () => {
    const t = playedLeague()
    const m = t.league!.matchdays[0].matches[0]
    const packed = m.result!.stats as string
    expect(typeof packed).toBe("string")
    const unpacked = JSON.stringify(statsOf(m.result))
    expect(packed.length).toBeLessThan(unpacked.length * 0.4)
  })
})

describe("statsOf", () => {
  it("reads nothing as null", () => {
    expect(statsOf(undefined)).toBeNull()
    expect(statsOf(null)).toBeNull()
    expect(statsOf({ stats: undefined })).toBeNull()
    expect(statsOf({ stats: null })).toBeNull()
  })

  it("accepts a report that is still an object", () => {
    const t = playedLeague(4)
    const stats = statsOf(t.league!.matchdays[0].matches[0].result)!
    expect(statsOf({ stats })).toBe(stats)
  })

  it("reads an unreadable packed string as no report instead of throwing", () => {
    expect(statsOf({ stats: "not json" })).toBeNull()
  })
})

describe("loading a tournament saved by an older build", () => {
  it("repacks object reports so they stop weighing ~6 KB a match", () => {
    const t = playedLeague(6)
    const matches = t.league!.matchdays.flatMap((d) => d.matches)
    const expected = matches.map((m) => statsOf(m.result))
    // Simulate the old on-disk form: reports stored as plain objects.
    for (const [i, m] of matches.entries()) m.result!.stats = expected[i]
    const oldJson = JSON.stringify(t)

    const loaded = parseStoredTournament(oldJson)!
    const loadedMatches = loaded.league!.matchdays.flatMap((d) => d.matches)
    expect(loadedMatches.every((m) => typeof m.result!.stats === "string")).toBe(true)
    expect(loadedMatches.map((m) => statsOf(m.result))).toStrictEqual(expected)
    expect(JSON.stringify(loaded).length).toBeLessThan(oldJson.length * 0.4)
  })
})
