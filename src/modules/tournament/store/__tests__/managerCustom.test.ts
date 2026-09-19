// store/__tests__/managerCustom.test.ts
//
// Manager mode against the custom format. These go through the composed store
// rather than the slices, because the behaviour under test *is* the wrapping:
// withManagerGuard blocks the bulk phase actions while the user owes a
// fixture, and withManagerBracketSettle plays a freshly advanced phase out
// around them. Calling the slices directly would bypass both.
import { beforeEach, describe, expect, it } from "vitest"
import { createPinia, setActivePinia } from "pinia"
import { makeTeams } from "@/engine/__tests__/helpers"
import { createPhase, createPhaseEdge, isPhaseComplete } from "@/engine"
import type { Tournament, TournamentPhase } from "@/modules/tournament/types"
import { useTeamsStore } from "@/modules/teams/store"
import { useTournamentStore } from "../index"
import {
  hasPendingManagedFixture,
  managedSideOf,
  nextManagedFixture,
} from "@/modules/tournament/utils/managerFixtures"

const TEAMS = 8

type Store = ReturnType<typeof useTournamentStore>

function graph() {
  const table = createPhase("league", { name: "Group Stage", teamCount: TEAMS })
  const cup = createPhase("knockout", { name: "Cup", teamCount: 4, isFinal: true })
  return {
    table,
    cup,
    phases: [table, cup],
    phaseEdges: [createPhaseEdge(table.id, cup.id, 1, 4)],
  }
}

function setup() {
  useTeamsStore().teams = makeTeams(TEAMS)
  const store = useTournamentStore()
  const g = graph()
  const teamIds = useTeamsStore().teams.map((t) => t.id)
  const id = store.createCustom("Custom", teamIds, {
    phases: g.phases,
    phaseEdges: g.phaseEdges,
  })!
  return { store, id, g, teamIds }
}

function tournamentOf(store: Store, id: string): Tournament {
  return store.tournaments.find((t) => t.id === id)!
}

function phaseOf(store: Store, id: string, phaseId: string): TournamentPhase {
  return tournamentOf(store, id).phases!.find((p) => p.id === phaseId)!
}

/** Takes charge of whichever side plays in the very first fixture. */
function manage(store: Store, id: string, phaseId: string): string {
  const teamId = phaseOf(store, id, phaseId).league!.matchdays[0].matches[0].homeId
  store.setManagerTeam(id, teamId)
  return teamId
}

/**
 * Plays the managed team's next fixture through the generic dispatch, with the
 * score given from *their* point of view.
 *
 * The entry's home/away is whichever way round the fixture was drawn, so a
 * flat "2-0" would be a win in half the ties and a defeat in the other half —
 * which is exactly how a test like this goes quietly flaky.
 */
function playOwnFixture(store: Store, id: string, scored = 1, conceded = 0) {
  const t = tournamentOf(store, id)
  const entry = nextManagedFixture(t)
  expect(entry).toBeDefined()
  const side = managedSideOf(t, entry!)
  const [home, away] = side === "away" ? [conceded, scored] : [scored, conceded]
  store.setFixtureResult(id, entry!, home, away)
  return entry!
}

beforeEach(() => {
  setActivePinia(createPinia())
})

describe("the manager guard", () => {
  it("blocks bulk phase simulation while the managed side owes a fixture", () => {
    const { store, id, g } = setup()
    manage(store, id, g.table.id)

    store.simAllPhaseLeague(id, g.table.id)

    const phase = phaseOf(store, id, g.table.id)
    expect(phase.league!.matchdays[0].matches.every((m) => m.result === null)).toBe(true)
  })

  it("blocks the whole-graph simulation too", () => {
    const { store, id, g } = setup()
    manage(store, id, g.table.id)

    store.simulateCustomTournament(id)
    expect(tournamentOf(store, id).winnerId).toBeNull()

    store.simulateTournament(id)
    expect(tournamentOf(store, id).winnerId).toBeNull()
  })

  it("lets bulk simulation through once the managed side has nothing outstanding", () => {
    const { store, id, g } = setup()
    manage(store, id, g.table.id)

    // Play every one of the manager's own fixtures, one at a time. Each one
    // auto-plays the rest of its matchday around them.
    while (hasPendingManagedFixture(tournamentOf(store, id))) playOwnFixture(store, id)

    expect(isPhaseComplete(phaseOf(store, id, g.table.id))).toBe(true)
  })

  it("does not block a tournament with no manager", () => {
    const { store, id, g } = setup()
    store.simAllPhaseLeague(id, g.table.id)
    expect(isPhaseComplete(phaseOf(store, id, g.table.id))).toBe(true)
  })
})

describe("playing the manager's own phase fixture", () => {
  it("routes the result into the right phase and finishes that matchday", () => {
    const { store, id, g } = setup()
    manage(store, id, g.table.id)

    const entry = playOwnFixture(store, id, 3, 1)
    expect(entry.source.phaseId).toBe(g.table.id)
    const scoredSide = managedSideOf(tournamentOf(store, id), entry)

    const phase = phaseOf(store, id, g.table.id)
    const matchday = phase.league!.matchdays[0]
    expect(matchday.matches.every((m) => m.result !== null)).toBe(true)
    // The manager's own score is the one they entered, not a simulated one.
    const own = matchday.matches.find((m) => m.id === entry.match.id)!
    expect(own.result).toMatchObject(
      scoredSide === "away" ? { home: 1, away: 3 } : { home: 3, away: 1 }
    )
  })

  it("updates the phase table from the manager's result", () => {
    const { store, id, g } = setup()
    const teamId = manage(store, id, g.table.id)
    playOwnFixture(store, id, 3, 0)

    const row = phaseOf(store, id, g.table.id).league!.standings.find((r) => r.teamId === teamId)!
    expect(row.pts).toBe(3)
    expect(row.gf).toBe(3)
  })

  it("stops at the phase boundary rather than drawing the next phase", () => {
    const { store, id, g } = setup()
    manage(store, id, g.table.id)
    while (hasPendingManagedFixture(tournamentOf(store, id))) playOwnFixture(store, id)

    // The table is finished, but the cup is a draw the user has to press for.
    expect(isPhaseComplete(phaseOf(store, id, g.table.id))).toBe(true)
    expect(phaseOf(store, id, g.cup.id).status).toBe("pending")
    expect(phaseOf(store, id, g.cup.id).rounds).toBeUndefined()
  })
})

describe("advancing into a phase with a manager", () => {
  function finishTable(store: Store, id: string, g: ReturnType<typeof graph>) {
    while (hasPendingManagedFixture(tournamentOf(store, id))) playOwnFixture(store, id)
    expect(isPhaseComplete(phaseOf(store, id, g.table.id))).toBe(true)
  }

  it("hands the manager their next tie rather than playing it for them", () => {
    const { store, id, g } = setup()
    const teamId = manage(store, id, g.table.id)
    // Win every match, so the managed side is certain to qualify.
    while (hasPendingManagedFixture(tournamentOf(store, id))) playOwnFixture(store, id, 5, 0)

    store.advancePhase(id, g.cup.id)

    const cup = phaseOf(store, id, g.cup.id)
    expect(cup.status).toBe("active")
    expect(cup.teamIds).toContain(teamId)
    // Their own tie is still theirs to play.
    const own = cup.rounds![0].matches.find((m) => m.homeId === teamId || m.awayId === teamId)!
    expect(own.result).toBeNull()
    expect(hasPendingManagedFixture(tournamentOf(store, id))).toBe(true)
  })

  it("plays the new phase out when the managed side did not qualify", () => {
    const { store, id, g } = setup()
    // Lose every match: bottom of the table, so the top four leave them behind.
    manage(store, id, g.table.id)
    while (hasPendingManagedFixture(tournamentOf(store, id))) playOwnFixture(store, id, 0, 4)
    finishTable(store, id, g)

    store.advancePhase(id, g.cup.id)

    const cup = phaseOf(store, id, g.cup.id)
    expect(isPhaseComplete(cup)).toBe(true)
    expect(tournamentOf(store, id).winnerId).toBeTruthy()
    expect(store.isTournamentFinished(id)).toBe(true)
  })

  it("does not auto-settle a tournament with no manager", () => {
    const { store, id, g } = setup()
    store.simAllPhaseLeague(id, g.table.id)
    store.advancePhase(id, g.cup.id)

    // The draw has just happened; nothing should have been played yet.
    const cup = phaseOf(store, id, g.cup.id)
    expect(cup.status).toBe("active")
    expect(cup.rounds!.every((r) => r.matches.every((m) => m.result === null))).toBe(true)
  })

  it("lets the manager play their cup tie and settles the round around it", () => {
    const { store, id, g } = setup()
    const teamId = manage(store, id, g.table.id)
    while (hasPendingManagedFixture(tournamentOf(store, id))) playOwnFixture(store, id, 5, 0)
    store.advancePhase(id, g.cup.id)

    playOwnFixture(store, id, 2, 0)

    const cup = phaseOf(store, id, g.cup.id)
    // The other semifinal played itself; the final now waits on the manager.
    expect(cup.rounds![0].matches.every((m) => m.result !== null)).toBe(true)
    const final = cup.rounds![1].matches[0]
    expect(final.homeId === teamId || final.awayId === teamId).toBe(true)
    expect(final.result).toBeNull()
  })

  it("carries the whole graph to a winner once the manager plays every tie", () => {
    const { store, id, g } = setup()
    manage(store, id, g.table.id)
    while (hasPendingManagedFixture(tournamentOf(store, id))) playOwnFixture(store, id, 5, 0)
    store.advancePhase(id, g.cup.id)
    while (hasPendingManagedFixture(tournamentOf(store, id))) playOwnFixture(store, id, 2, 0)

    const t = tournamentOf(store, id)
    expect(isPhaseComplete(phaseOf(store, id, g.cup.id))).toBe(true)
    expect(t.winnerId).toBeTruthy()
    expect(store.isTournamentFinished(id)).toBe(true)
  })
})

describe("manager fixtures inside phases", () => {
  it("finds the managed side's next fixture without knowing about phases", () => {
    const { store, id, g } = setup()
    const teamId = manage(store, id, g.table.id)
    const entry = nextManagedFixture(tournamentOf(store, id))
    expect(entry?.homeId === teamId || entry?.awayId === teamId).toBe(true)
    expect(entry?.source.phaseId).toBe(g.table.id)
  })

  it("reports nothing pending once every phase is played", () => {
    const { store, id } = setup()
    store.simulateTournament(id)
    expect(hasPendingManagedFixture(tournamentOf(store, id))).toBe(false)
  })
})
