// engine/__tests__/matchIterator.test.ts
import { describe, expect, it } from "vitest"
import type { Tournament } from "@/modules/tournament/types"
import { allMatches, forEachMatch, isBye, matchesForTeam, playedMatches } from "../matchIterator"
import { propagateWinners } from "../bracket"
import { createTournament } from "../tournament"
import { buildPhase } from "../customPhases"
import { createCustomTournament, createPhase, createPhaseEdge } from "../phaseFactory"
import { makeTeams } from "./helpers"

describe("allMatches", () => {
  it("walks every knockout match as a single entry for single-leg ties", () => {
    const t = createTournament("Cup", makeTeams(8), 1, false) as Tournament
    const matches = allMatches(t)
    // 4 + 2 + 1 knockout ties, no leg2 → one entry each
    expect(matches).toHaveLength(7)
    expect(matches.every((e) => e.isDoubleLeg === false)).toBe(true)
  })

  it("emits two entries for a played double-leg tie, with the second leg flipped", () => {
    const t = createTournament("Cup", makeTeams(8), 1, false) as Tournament
    const m = t.rounds[0].matches[0]
    m.homeId = "a"
    m.awayId = "b"
    m.result = { home: 2, away: 1 }
    m.leg2Result = { home: 1, away: 0 }

    const entries = allMatches(t).filter((e) => e.match === m)
    expect(entries).toHaveLength(2)

    expect(entries[0].source).toEqual(expect.objectContaining({ leg: 1 }))
    expect(entries[0].homeId).toBe("a")
    expect(entries[0].result).toEqual({ home: 2, away: 1 })

    expect(entries[1].source).toEqual(expect.objectContaining({ leg: 2 }))
    expect(entries[1].homeId).toBe("b") // fixture reversed
    expect(entries[1].awayId).toBe("a")
    expect(entries[1].result).toEqual({ home: 1, away: 0 })
    expect(entries[1].isDoubleLeg).toBe(true)
  })

  it("covers groups, leagues, tiers and third-place matches", () => {
    const teams = makeTeams(12)
    const t = createTournament("T", teams, 1, false, teams, 3, 2) as Tournament
    t.hasThirdPlace = true
    t.thirdPlaceMatch = { id: "tp", homeId: "a", awayId: "b", result: null }

    const sources = allMatches(t).map((e) => e.source.kind)
    expect(sources.filter((k) => k === "group").length).toBe(18) // 3 groups × 6
    expect(sources.filter((k) => k === "knockout").length).toBe(7)
    expect(sources.filter((k) => k === "third-place").length).toBe(1)
  })
})

describe("playedMatches / matchesForTeam", () => {
  function completedBracket(): Tournament {
    const t = createTournament("Cup", makeTeams(8), 1, false) as Tournament
    // Play every round, propagating winners between rounds.
    for (const round of t.rounds) {
      for (const m of round.matches) m.result = { home: 1, away: 0 }
      propagateWinners(t.rounds, makeTeams(8))
    }
    return t
  }

  it("excludes byes and unplayed ties", () => {
    const t = createTournament("Cup", makeTeams(5), 1, false) as Tournament
    // Round 1 has 3 byes auto-resolved (walkovers) + 1 real tie; later rounds are empty.
    expect(playedMatches(t)).toHaveLength(0)

    const real = t.rounds[0].matches.find((m) => m.homeId && m.awayId)!
    real.result = { home: 2, away: 1 }
    const played = playedMatches(t)
    expect(played).toHaveLength(1)
    expect(played.every((e) => !isBye(e))).toBe(true)
  })

  it("filters matches for a single team across the tournament", () => {
    // orderedTeams pins the bracket: (t1,t2) and (t3,t4).
    const teams = makeTeams(4)
    const t = createTournament("Cup", teams, 1, false, teams) as Tournament
    expect([t.rounds[0].matches[0].homeId, t.rounds[0].matches[0].awayId]).toEqual(["t1", "t2"])

    t.rounds[0].matches[0].result = { home: 1, away: 0 } // t1 beats t2
    t.rounds[0].matches[1].result = { home: 0, away: 1 } // t4 beats t3

    const forT1 = matchesForTeam(t, "t1")
    expect(forT1).toHaveLength(1)
    expect(forT1[0].awayId).toBe("t2")
    expect(matchesForTeam(t, "t5")).toHaveLength(0)
  })

  it("counts every played match of the eventual winner", () => {
    const t = completedBracket()
    const winner = t.rounds[t.rounds.length - 1].matches[0].homeId!
    const entries = matchesForTeam(t, winner)
    expect(entries).toHaveLength(3) // quarterfinal + semifinal + final
    expect(playedMatches(t)).toHaveLength(7)
  })

  it("forEachMatch visits every entry in container order", () => {
    const t = completedBracket()
    let count = 0
    forEachMatch(t, () => count++)
    expect(count).toBe(allMatches(t).length)
  })
})

describe("custom format phases", () => {
  /** A group phase feeding a knockout, both built, with results in the group. */
  function customTournament() {
    const teams = makeTeams(8)
    const group = createPhase("group", { name: "Qualifying", teamCount: 8 })
    if (group.config.kind === "group") group.config.group.groupCount = 2
    const cup = createPhase("knockout", { name: "Cup", teamCount: 4, isFinal: true })
    if (cup.config.kind === "knockout") cup.config.knockout.hasThirdPlace = true
    const t = createCustomTournament("Custom", teams, {
      phases: [group, cup],
      phaseEdges: [createPhaseEdge(group.id, cup.id, 1, 4)],
    })!
    return { t, teams, group: t.phases![0], cup: t.phases![1] }
  }

  it("walks a phase's group matches, tagged with the phase they came from", () => {
    const { t, group } = customTournament()
    const entries = allMatches(t)
    // Two groups of four: six matches each, and nothing else is built yet.
    expect(entries).toHaveLength(12)
    expect(entries.every((e) => e.source.phaseId === group.id)).toBe(true)
    expect(entries.every((e) => e.source.phaseName === "Qualifying")).toBe(true)
    expect(entries.every((e) => e.source.kind === "group")).toBe(true)
  })

  it("walks a phase's league table", () => {
    const teams = makeTeams(6)
    const table = createPhase("league", { name: "Table", teamCount: 6, isFinal: true })
    const t = createCustomTournament("Solo", teams, { phases: [table], phaseEdges: [] })!
    const entries = allMatches(t)
    expect(entries).toHaveLength(15) // round robin of six
    expect(entries.every((e) => e.source.kind === "league")).toBe(true)
    expect(entries.every((e) => e.source.phaseName === "Table")).toBe(true)
  })

  it("walks a phase's knockout rounds and its third-place tie", () => {
    const { t, teams, cup } = customTournament()
    buildPhase(cup, teams.slice(0, 4).map((x) => x.id), teams)

    const cupEntries = allMatches(t).filter((e) => e.source.phaseId === cup.id)
    // Two semifinals, one final, one third-place match.
    expect(cupEntries).toHaveLength(4)
    expect(cupEntries.filter((e) => e.source.kind === "third-place")).toHaveLength(1)
    expect(cupEntries.filter((e) => e.source.kind === "knockout")).toHaveLength(3)
  })

  it("emits both legs of a two-legged phase tie, the second one flipped", () => {
    const { t, teams, cup } = customTournament()
    if (cup.config.kind === "knockout") cup.config.knockout.roundLegModes = { semifinal: "double" }
    buildPhase(cup, teams.slice(0, 4).map((x) => x.id), teams)
    const tie = cup.rounds![0].matches[0]
    tie.result = { home: 2, away: 1 }
    tie.leg2Result = { home: 1, away: 0 }

    const entries = allMatches(t).filter((e) => e.match === tie)
    expect(entries).toHaveLength(2)
    expect(entries[1].homeId).toBe(tie.awayId)
    expect(entries[1].source.phaseId).toBe(cup.id)
    expect(entries[1].isDoubleLeg).toBe(true)
  })

  it("counts a team's phase matches in its history", () => {
    const { t, group } = customTournament()
    const first = group.groups![0].matches[0]
    first.result = { home: 3, away: 0 }

    expect(playedMatches(t)).toHaveLength(1)
    expect(matchesForTeam(t, first.homeId)).toHaveLength(1)
    expect(matchesForTeam(t, first.homeId)[0].source.phaseId).toBe(group.id)
  })

  it("leaves the source untagged for every fixed format", () => {
    const t = createTournament("Cup", makeTeams(8), 1, false) as Tournament
    expect(allMatches(t).every((e) => e.source.phaseId === undefined)).toBe(true)
  })
})
