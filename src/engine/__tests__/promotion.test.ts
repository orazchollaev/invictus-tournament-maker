import { describe, it, expect } from "vitest"
import type { Team } from "@/modules/teams/types"
import type { Tournament } from "@/modules/tournament/types"
import { createMultiTierLeague } from "../tournament"
import { recalcLeagueStandings } from "../league"
import { knockoutHostOf, isPhaseComplete } from "../customPhases"
import { simulateKnockoutAll } from "../knockoutOps"
import { createCustomTournament, createPhase } from "../phaseFactory"
import {
  computeSeasonMoves,
  customRelegatedIds,
  promotionPlayoffOf,
  promotionPlayoffRange,
  promotionPlayoffsDone,
  relegationCountFor,
  suggestReplacements,
  syncPromotionPlayoffs,
} from "../promotion"
import { makeTeams } from "./helpers"

/** Three divisions of eight; the stronger side always wins, so tables follow power. */
function pyramid(promotionCount: number, playoffSize: number) {
  const teams = makeTeams(24)
  const t = createMultiTierLeague(
    "Pyramid",
    [
      { name: "Div 1", teams: teams.slice(0, 8) },
      { name: "Div 2", teams: teams.slice(8, 16) },
      { name: "Div 3", teams: teams.slice(16) },
    ],
    1,
    "single",
    promotionCount,
    playoffSize
  )
  return { t, teams }
}

function playTier(t: Tournament, tierIdx: number, teams: Team[]) {
  const power = new Map(teams.map((tm) => [tm.id, tm.power]))
  const league = t.tiers![tierIdx].league
  for (const md of league.matchdays) {
    for (const m of md.matches) {
      const homeWins = (power.get(m.homeId) ?? 0) > (power.get(m.awayId) ?? 0)
      m.result = homeWins ? { home: 2, away: 0 } : { home: 0, away: 2 }
    }
  }
  recalcLeagueStandings(league, "goal-diff", 3, 1, 0)
}

function playAll(t: Tournament, teams: Team[]) {
  t.tiers!.forEach((_, i) => playTier(t, i, teams))
  syncPromotionPlayoffs(t, teams)
}

describe("promotion play-off range", () => {
  it("sits right below direct promotion and above the division's own drop zone", () => {
    const { t } = pyramid(2, 4)
    expect(promotionPlayoffRange(t, 0)).toBeNull()
    // Div 2 sends 3 down itself (2 direct + its own play-off below), so 3-5.
    expect(promotionPlayoffRange(t, 1)).toEqual({ fromRank: 3, toRank: 5 })
    // The bottom division has nothing below it: the full 3-6.
    expect(promotionPlayoffRange(t, 2)).toEqual({ fromRank: 3, toRank: 6 })
  })

  it("relegates one extra team from the division above a play-off", () => {
    const { t } = pyramid(2, 4)
    expect(relegationCountFor(t, 0)).toBe(3)
    expect(relegationCountFor(t, 1)).toBe(3)
    expect(relegationCountFor(t, 2)).toBe(0)
  })

  it("is off without a size, and promotion can be off entirely", () => {
    const { t } = pyramid(0, 0)
    expect(promotionPlayoffRange(t, 1)).toBeNull()
    expect(relegationCountFor(t, 0)).toBe(0)
    expect(computeSeasonMoves(t).promoted.size).toBe(0)
  })
})

describe("syncPromotionPlayoffs", () => {
  it("draws a division's play-off only once its table is final", () => {
    const { t, teams } = pyramid(2, 4)
    syncPromotionPlayoffs(t, teams)
    expect(t.phases).toBeUndefined()

    playTier(t, 2, teams)
    syncPromotionPlayoffs(t, teams)
    const phase = promotionPlayoffOf(t, 2)
    expect(phase).toBeDefined()
    expect(promotionPlayoffOf(t, 1)).toBeUndefined()
    // Places 3-6 of Div 3 (t19..t22), in table order.
    expect(phase!.teamIds).toEqual(["t19", "t20", "t21", "t22"])
    expect(phase!.status).toBe("active")
  })

  it("withdraws an untouched play-off when its table reopens", () => {
    const { t, teams } = pyramid(2, 4)
    playTier(t, 2, teams)
    syncPromotionPlayoffs(t, teams)
    t.tiers![2].league.matchdays[0].matches[0].result = null
    syncPromotionPlayoffs(t, teams)
    expect(promotionPlayoffOf(t, 2)).toBeUndefined()
  })

  it("keeps a play-off that has already been played in", () => {
    const { t, teams } = pyramid(2, 4)
    playTier(t, 2, teams)
    syncPromotionPlayoffs(t, teams)
    const phase = promotionPlayoffOf(t, 2)!
    phase.rounds![0].matches[0].result = { home: 1, away: 0 }
    t.tiers![2].league.matchdays[0].matches[0].result = null
    syncPromotionPlayoffs(t, teams)
    expect(promotionPlayoffOf(t, 2)).toBe(phase)
  })
})

describe("computeSeasonMoves", () => {
  it("swaps direct places plus each play-off winner, keeping division sizes", () => {
    const { t, teams } = pyramid(2, 4)
    playAll(t, teams)
    expect(promotionPlayoffsDone(t)).toBe(false)

    for (const phase of t.phases ?? []) simulateKnockoutAll(knockoutHostOf(phase), teams)
    expect(t.phases!.every(isPhaseComplete)).toBe(true)
    expect(promotionPlayoffsDone(t)).toBe(true)

    const moves = computeSeasonMoves(t)
    expect(moves.nextTierTeamIds.map((ids) => ids.length)).toEqual([8, 8, 8])
    // Direct: top two of Div 2 and Div 3.
    for (const id of ["t9", "t10", "t17", "t18"]) expect(moves.promoted.has(id)).toBe(true)
    // One play-off winner from each lower division.
    expect(moves.playoffWinners.size).toBe(2)
    // Bottom three of Div 1 and Div 2 go down.
    for (const id of ["t6", "t7", "t8", "t14", "t15", "t16"]) {
      expect(moves.relegated.has(id)).toBe(true)
    }
    // Nobody is in two divisions.
    const all = moves.nextTierTeamIds.flat()
    expect(new Set(all).size).toBe(24)
  })

  it("promotes nobody through an unfinished play-off", () => {
    const { t, teams } = pyramid(1, 2)
    playAll(t, teams)
    const moves = computeSeasonMoves(t)
    expect(moves.playoffWinners.size).toBe(0)
    expect(moves.relegated.size).toBe(2)
    expect(moves.nextTierTeamIds.map((ids) => ids.length)).toEqual([8, 8, 8])
  })
})

describe("custom format relegation", () => {
  function customLeague(relegationCount: number) {
    const teams = makeTeams(10)
    const table = createPhase("league", { name: "Table", teamCount: 6, isFinal: true })
    if (table.config.kind === "league") table.config.league.relegationCount = relegationCount
    const t = createCustomTournament("Cup", teams.slice(0, 6), {
      phases: [table],
      phaseEdges: [],
    })!
    return { t, teams }
  }

  it("relegates the bottom of a finished league phase", () => {
    const { t, teams } = customLeague(2)
    const phase = t.phases![0]
    expect(customRelegatedIds(t)).toEqual([])
    const power = new Map(teams.map((tm) => [tm.id, tm.power]))
    for (const md of phase.league!.matchdays) {
      for (const m of md.matches) {
        const homeWins = (power.get(m.homeId) ?? 0) > (power.get(m.awayId) ?? 0)
        m.result = homeWins ? { home: 1, away: 0 } : { home: 0, away: 1 }
      }
    }
    recalcLeagueStandings(phase.league!, "goal-diff", 3, 1, 0)
    expect(customRelegatedIds(t)).toEqual(["t5", "t6"])
  })

  it("suggests the strongest teams outside the tournament", () => {
    const { t, teams } = customLeague(2)
    expect(suggestReplacements(t, teams, 2)).toEqual(["t7", "t8"])
  })
})
