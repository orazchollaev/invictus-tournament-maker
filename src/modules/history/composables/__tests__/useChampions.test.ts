// modules/history/composables/__tests__/useChampions.test.ts
//
// History read the title match straight out of `t.rounds`, which a custom
// tournament leaves empty — so a finished custom season showed a champion with
// no runner-up and no score. The title now comes from whichever phase the user
// marked as the final, and these lock that down for both shapes it can take.
import { beforeEach, describe, expect, it } from "vitest"
import { computed } from "vue"
import { createPinia, setActivePinia } from "pinia"
import type { Tournament } from "@/modules/tournament/types"
import { makeTeams } from "@/engine/__tests__/helpers"
import {
  createCustomTournament,
  createPhase,
  phaseStandingIds,
  simulateKnockoutAll,
} from "@/engine"
import { useTeamsStore } from "@/modules/teams/store"
import { useChampions } from "../useChampions"

const TEAMS = makeTeams(8)

beforeEach(() => {
  setActivePinia(createPinia())
  useTeamsStore().teams = TEAMS
})

function champsOf(seasons: Tournament[]) {
  return useChampions(computed(() => seasons))
}

/** A custom tournament whose final phase is a knockout, played to a winner. */
function cupFinal(): Tournament {
  const cup = createPhase("knockout", { name: "Cup", teamCount: 4, isFinal: true })
  const t = createCustomTournament("Custom", TEAMS.slice(0, 4), {
    phases: [cup],
    phaseEdges: [],
  })!
  const phase = t.phases![0]
  simulateKnockoutAll({ rounds: phase.rounds! }, TEAMS, {})
  t.winnerId = phaseStandingIds(phase)[0]
  return t
}

/** A custom tournament decided by a table rather than by a final. */
function tableFinal(): Tournament {
  const table = createPhase("league", { name: "Table", teamCount: 8, isFinal: true })
  const t = createCustomTournament("Custom", TEAMS, { phases: [table], phaseEdges: [] })!
  const phase = t.phases![0]
  const byId = new Map(TEAMS.map((x) => [x.id, x]))
  for (const md of phase.league!.matchdays) {
    for (const m of md.matches) {
      const home = byId.get(m.homeId)!
      const away = byId.get(m.awayId)!
      m.result = home.power > away.power ? { home: 1, away: 0 } : { home: 0, away: 1 }
    }
  }
  // Standings are recalculated by the store in the app; do it by hand here.
  phase.league!.standings.sort((a, b) => b.pts - a.pts)
  t.winnerId = "t1"
  return t
}

describe("useChampions with a custom format", () => {
  it("names the runner-up from the final phase's knockout final", () => {
    const t = cupFinal()
    const phase = t.phases![0]
    const final = phase.rounds![phase.rounds!.length - 1].matches[0]
    const loser = final.homeId === t.winnerId ? final.awayId : final.homeId

    const { finals } = champsOf([t])
    expect(finals.value).toHaveLength(1)
    const teamName = (id: string | null) => TEAMS.find((x) => x.id === id)?.name
    expect(finals.value[0].champName).toBe(teamName(t.winnerId))
    expect(finals.value[0].runnerName).toBe(teamName(loser))
    // A real final was played, so there is a real score to show.
    expect(finals.value[0].score).not.toBe("?")
  })

  it("counts the champion as a finalist when a final was played", () => {
    const t = cupFinal()
    const { champions } = champsOf([t])
    const champ = champions.value.find((c) => c.teamId === t.winnerId)!
    expect(champ.wins).toBe(1)
    expect(champ.finals).toBe(1)
  })

  it("names the runner-up from the table when no final was played", () => {
    const t = tableFinal()
    const { finals, champions } = champsOf([t])
    expect(finals.value[0].champName).toBe("Team 1")
    expect(finals.value[0].runnerName).toBe("Team 2")
    // No final, so no score and no finalist appearance for the champion.
    expect(finals.value[0].score).toBe("?")
    expect(champions.value.find((c) => c.teamId === "t1")!.finals).toBe(0)
  })

  it("tallies several seasons of the same series", () => {
    const { champions } = champsOf([tableFinal(), tableFinal()])
    const champ = champions.value.find((c) => c.teamId === "t1")!
    expect(champ.wins).toBe(2)
    // Second place twice, never a winner.
    expect(champions.value.find((c) => c.teamId === "t2")).toMatchObject({ wins: 0, finals: 2 })
  })

  it("ignores a season with no winner yet", () => {
    const table = createPhase("league", { name: "Table", teamCount: 8, isFinal: true })
    const unfinished = createCustomTournament("Custom", TEAMS, {
      phases: [table],
      phaseEdges: [],
    })!
    expect(champsOf([unfinished]).champions.value).toEqual([])
  })
})
