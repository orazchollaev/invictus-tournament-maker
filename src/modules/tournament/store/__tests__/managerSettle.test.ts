// store/__tests__/managerSettle.test.ts
//
// Regression tests for the auto-settle that runs once a knockout stage has
// been seeded. It exists to hand a *managed* side its next tie (or, once that
// side is out of the running, to play the fresh stage out), so it must only
// fire when the tournament actually has a manager: with manager mode off, a
// bracket seeded but left unsimulated is the user waiting on the draw
// ceremony, and auto-playing it robs them of every round before they see it.
//
// These go through the composed store, not the raw slices — the settle is
// wired by withManagerBracketSettle around the seeding actions, so calling
// the slices directly would bypass the exact behaviour under test. Group
// results are entered match by match (the manual path) rather than via the
// bulk group actions, which are manager-blocked while a group fixture is
// outstanding — that guard is covered by the manager tests.
import { beforeEach, describe, expect, it } from "vitest"
import { createPinia, setActivePinia } from "pinia"
import { makeTeams } from "@/engine/__tests__/helpers"
import { useTeamsStore } from "@/modules/teams/store"
import { useTournamentStore } from "../index"
import { hasPendingManagedFixture } from "@/modules/tournament/utils/managerFixtures"

const TEAMS = 12

function setup() {
  useTeamsStore().teams = makeTeams(TEAMS)
  return useTournamentStore()
}

function playGroups(
  store: ReturnType<typeof useTournamentStore>,
  id: string,
  score: (gi: number, homeId: string, awayId: string) => [number, number]
) {
  const t = store.tournaments.find((x) => x.id === id)!
  t.groups!.forEach((g, gi) => {
    g.matches.forEach((m, mi) => {
      const [home, away] = score(gi, m.homeId, m.awayId)
      store.setGroupResult(id, gi, mi, home, away)
    })
  })
}

/**
 * A group+bracket cup whose group stage has been played and whose knockout
 * draw has been drawn — the state the user sits in right after the draw
 * ceremony. The managed team is group 0's first-listed side; `managedResult`
 * decides its score line in every group match it plays.
 */
function cupWithManager(
  store: ReturnType<typeof useTournamentStore>,
  managedResult: (managedHome: boolean) => [number, number]
) {
  const teamIds = useTeamsStore().teams.map((t) => t.id)
  const id = store.create("Cup", teamIds, false, undefined, 4, 2)!
  const t = store.tournaments.find((x) => x.id === id)!
  const managedId = t.groups![0].teamIds[0]

  store.setManagerTeam(id, managedId)
  playGroups(store, id, (gi, homeId, awayId) => {
    if (gi !== 0) return [1, 0]
    if (homeId === managedId) return managedResult(true)
    if (awayId === managedId) return managedResult(false).reverse() as [number, number]
    return [1, 0]
  })

  store.advanceToBracket(id)
  expect(t.groupsDone).toBe(true)
  expect(t.rounds[0].matches.every((m) => m.homeId && m.awayId)).toBe(true)
  return { id, t, managedId }
}

describe("the knockout auto-settle after the draw", () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it("leaves the draw untouched when manager mode is off", () => {
    const store = setup()
    const id = store.create(
      "Cup",
      useTeamsStore().teams.map((t) => t.id),
      false,
      undefined,
      4,
      2
    )!
    const t = store.tournaments.find((x) => x.id === id)!
    playGroups(store, id, () => [1, 0])

    store.advanceToBracket(id)

    expect(t.manager).toBeUndefined()
    expect(t.groupsDone).toBe(true)
    expect(t.rounds[0].matches.every((m) => m.homeId && m.awayId)).toBe(true)
    expect(t.rounds[0].matches.every((m) => !m.result)).toBe(true)
    expect(t.winnerId).toBeNull()
  })

  it("waits for the manager whose side qualified, then cascades once he plays", () => {
    const store = setup()
    // The managed side wins both of its group matches: group winner, qualified.
    const { id, t, managedId } = cupWithManager(store, () => [2, 0])

    expect(t.manager?.teamId).toBe(managedId)
    expect(hasPendingManagedFixture(t)).toBe(true)
    // Still in the cup, so the settle must not play a thing — the draw sits
    // there until the manager plays his own tie.
    expect(t.rounds[0].matches.every((m) => !m.result)).toBe(true)

    // He plays it (any score — the entered one is kept), and the rest of the
    // round plays itself out around him, nothing further.
    const mi = t.rounds[0].matches.findIndex(
      (m) => m.homeId === managedId || m.awayId === managedId
    )
    const match = t.rounds[0].matches[mi]
    store.setFixtureResult(
      id,
      {
        homeId: match.homeId,
        awayId: match.awayId,
        result: null,
        match,
        source: { kind: "knockout", roundIdx: 0, roundName: t.rounds[0].name, leg: 1 },
        isDoubleLeg: false,
      },
      2,
      1
    )

    expect(t.rounds[0].matches.every((m) => !!m.result)).toBe(true)
    expect(t.rounds[1].matches.every((m) => !m.result)).toBe(true)
    expect(t.winnerId).toBeNull()
  })

  it("plays the whole thing out for a manager whose side was eliminated", () => {
    const store = setup()
    // The managed side loses both of its group matches: last place, out.
    // Scores are read from the managed side's perspective, so a loss is
    // [0, 2] home or away alike.
    const { t, managedId } = cupWithManager(store, () => [0, 2])

    expect(t.manager?.teamId).toBe(managedId)
    expect(hasPendingManagedFixture(t)).toBe(false)
    expect(t.rounds.every((r) => r.matches.every((m) => !!m.result))).toBe(true)
    expect(t.winnerId).not.toBeNull()
  })
})
