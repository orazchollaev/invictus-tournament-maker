// modules/tournament/composables/__tests__/useTournamentStats.test.ts
//
// The Stats tab showed nothing for a custom tournament however many matches had
// been played, because this composable walked the league, the tiers, the groups
// and the bracket by hand — and a custom tournament keeps its fixtures inside
// its phases. The same gap also skipped the third-place match in every format.
//
// Driving it through the match iterator is the fix, and these are the cases that
// keep it that way.
import { describe, expect, it } from "vitest"
import type { Tournament } from "@/modules/tournament/types"
import { makeTeams } from "@/engine/__tests__/helpers"
import {
  buildPhase,
  createCustomTournament,
  createPhase,
  createPhaseEdge,
  createTournament,
} from "@/engine"
import { useTournamentStats } from "../useTournamentStats"

const TEAMS = makeTeams(8)

function statsOf(t: Tournament) {
  return useTournamentStats(
    () => t,
    () => TEAMS
  )
}

describe("useTournamentStats", () => {
  it("counts a custom tournament's phase matches", () => {
    const table = createPhase("league", { name: "Table", teamCount: 8, isFinal: true })
    const t = createCustomTournament("Custom", TEAMS, { phases: [table], phaseEdges: [] })!
    const match = t.phases![0].league!.matchdays[0].matches[0]
    match.result = { home: 3, away: 1 }

    const { hasStats, topScorers } = statsOf(t)
    expect(hasStats.value).toBe(true)

    const home = topScorers.value.find((s) => s.teamId === match.homeId)!
    const away = topScorers.value.find((s) => s.teamId === match.awayId)!
    expect(home).toMatchObject({ gf: 3, ga: 1, played: 1 })
    expect(away).toMatchObject({ gf: 1, ga: 3, played: 1 })
  })

  it("counts a custom group phase's matches", () => {
    const group = createPhase("group", { name: "Groups", teamCount: 8 })
    if (group.config.kind === "group") group.config.group.groupCount = 2
    const cup = createPhase("knockout", { name: "Cup", teamCount: 4, isFinal: true })
    const t = createCustomTournament("Custom", TEAMS, {
      phases: [group, cup],
      phaseEdges: [createPhaseEdge(group.id, cup.id, 1, 4)],
    })!
    const match = t.phases![0].groups![0].matches[0]
    match.result = { home: 2, away: 2 }

    const { topScorers } = statsOf(t)
    expect(topScorers.value.find((s) => s.teamId === match.homeId)).toMatchObject({
      gf: 2,
      ga: 2,
      played: 1,
    })
  })

  it("counts a custom knockout phase's matches", () => {
    const cup = createPhase("knockout", { name: "Cup", teamCount: 8, isFinal: true })
    const t = createCustomTournament("Cup", TEAMS, { phases: [cup], phaseEdges: [] })!
    const tie = t.phases![0].rounds![0].matches[0]
    tie.result = { home: 1, away: 0 }

    const { topScorers } = statsOf(t)
    expect(topScorers.value.find((s) => s.teamId === tie.homeId)).toMatchObject({
      gf: 1,
      ga: 0,
      played: 1,
    })
  })

  it("has nothing to report before a ball is kicked", () => {
    const table = createPhase("league", { name: "Table", teamCount: 8, isFinal: true })
    const t = createCustomTournament("Custom", TEAMS, { phases: [table], phaseEdges: [] })!
    expect(statsOf(t).hasStats.value).toBe(false)
  })

  it("counts both legs of a two-legged tie as two matches", () => {
    const cup = createPhase("knockout", { name: "Cup", teamCount: 4, isFinal: true })
    if (cup.config.kind === "knockout") {
      cup.config.knockout.roundLegModes = { semifinal: "double" }
    }
    const t = createCustomTournament("Cup", TEAMS.slice(0, 4), { phases: [cup], phaseEdges: [] })!
    const tie = t.phases![0].rounds![0].matches[0]
    tie.result = { home: 2, away: 1 }
    tie.leg2Result = { home: 0, away: 3 }

    const { topScorers } = statsOf(t)
    // Leg 1 at home (2-1), leg 2 away (3-0 in their favour): two matches, five
    // goals for, one against.
    expect(topScorers.value.find((s) => s.teamId === tie.homeId)).toMatchObject({
      played: 2,
      gf: 5,
      ga: 1,
    })
    expect(topScorers.value.find((s) => s.teamId === tie.awayId)).toMatchObject({
      played: 2,
      gf: 1,
      ga: 5,
    })
  })

  it("counts the third-place match, which the container walk used to miss", () => {
    const t = createTournament("Cup", TEAMS.slice(0, 4), 1, false) as Tournament
    t.hasThirdPlace = true
    t.thirdPlaceMatch = { id: "tp", homeId: "t3", awayId: "t4", result: { home: 4, away: 0 } }

    const { topScorers } = statsOf(t)
    expect(topScorers.value.find((s) => s.teamId === "t3")).toMatchObject({
      gf: 4,
      ga: 0,
      played: 1,
    })
  })

  it("leaves byes out of the count", () => {
    const phase = createPhase("knockout", { name: "Cup", teamCount: 6 })
    buildPhase(
      phase,
      TEAMS.slice(0, 6).map((x) => x.id),
      TEAMS
    )
    const t = createCustomTournament("Cup", TEAMS.slice(0, 6), {
      phases: [{ ...phase, isFinal: true }],
      phaseEdges: [],
    })!
    // The built bracket auto-resolves its two byes to 1-0, and those are not
    // matches anybody played.
    expect(statsOf(t).hasStats.value).toBe(false)
  })

  it("sorts by goals scored, then by goals conceded", () => {
    const table = createPhase("league", { name: "Table", teamCount: 8, isFinal: true })
    const t = createCustomTournament("Custom", TEAMS, { phases: [table], phaseEdges: [] })!
    const matches = t.phases![0].league!.matchdays.flatMap((md) => md.matches)
    matches[0].result = { home: 5, away: 0 }
    matches[1].result = { home: 5, away: 3 }

    const { topScorers, bestDefense } = statsOf(t)
    expect(topScorers.value[0].gf).toBe(5)
    // Level on goals scored, so the tighter defence leads.
    expect(topScorers.value[0].ga).toBeLessThanOrEqual(topScorers.value[1].ga)
    expect(bestDefense.value[0].ga).toBe(0)
  })
})
