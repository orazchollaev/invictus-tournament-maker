import { describe, expect, it } from "vitest"
import { ref } from "vue"
import type { Team } from "@/modules/teams/types"
import type { Tournament } from "@/modules/tournament/types"
import { makeTeams } from "@/engine/__tests__/helpers"
import { useCrudActions } from "@/modules/tournament/store/crud"
import { useThirdPlaceActions } from "@/modules/tournament/store/third-place"
import { useBracketActions } from "@/modules/tournament/store/bracket"
import { useGroupActions } from "@/modules/tournament/store/groups"
import { useLeagueActions } from "@/modules/tournament/store/league"
import {
  hasPendingManagedFixture,
  isManagedMatch,
  legOf,
  managedSideOf,
  nextManagedFixture,
  pendingManagedFixtures,
} from "../managerFixtures"

function setup(teams: Team[] = makeTeams(8)) {
  const tournaments = ref<Tournament[]>([])
  const active = ref<string | null>(null)
  const getTeams = () => teams
  const crud = useCrudActions(tournaments, active, getTeams)
  const third = useThirdPlaceActions(tournaments, getTeams)
  const bracket = useBracketActions(tournaments, getTeams, third.simulateThirdPlace)
  const groups = useGroupActions(tournaments, getTeams)
  const league = useLeagueActions(tournaments, getTeams)
  const ids = teams.map((t) => t.id)
  return { tournaments, crud, bracket, groups, league, teams, ids }
}

function manage(t: Tournament, teamId: string) {
  t.manager = { teamId, formation: "4-4-2", style: "balanced", startedAt: 0 }
}

describe("without a manager", () => {
  it("has nothing pending and nothing to play next", () => {
    const { crud, tournaments, ids } = setup()
    crud.create("Cup", ids)
    const t = tournaments.value[0]
    expect(pendingManagedFixtures(t)).toEqual([])
    expect(nextManagedFixture(t)).toBeNull()
    expect(hasPendingManagedFixture(t)).toBe(false)
    expect(isManagedMatch(t, t.rounds[0].matches[0].id)).toBe(false)
  })
})

describe("a knockout bracket", () => {
  it("finds the managed team's own tie", () => {
    const { crud, tournaments, ids } = setup()
    crud.create("Cup", ids)
    const t = tournaments.value[0]
    manage(t, "t1")

    const entry = nextManagedFixture(t)!
    expect(entry).not.toBeNull()
    expect([entry.homeId, entry.awayId]).toContain("t1")
    expect(entry.source.kind).toBe("knockout")
    expect(isManagedMatch(t, entry.match.id, legOf(entry))).toBe(true)
  })

  it("says which end of the pitch the managed team is at", () => {
    const { crud, tournaments, ids } = setup()
    crud.create("Cup", ids)
    const t = tournaments.value[0]
    manage(t, "t1")

    const entry = nextManagedFixture(t)!
    const side = managedSideOf(t, entry)
    expect(side).not.toBeNull()
    expect(entry[side === "home" ? "homeId" : "awayId"]).toBe("t1")
  })

  it("waits for an opponent before offering the next round", () => {
    const { crud, bracket, tournaments, ids } = setup()
    const id = crud.create("Cup", ids)!
    const t = tournaments.value[0]
    manage(t, "t1")

    const first = nextManagedFixture(t)!
    const matchIdx = t.rounds[0].matches.findIndex((m) => m.id === first.match.id)
    bracket.setResult(id, 0, matchIdx, first.homeId === "t1" ? 3 : 0, first.homeId === "t1" ? 0 : 3)

    // Through, but the semi-final slot opposite is still empty — there is no
    // fixture to manage until somebody fills it.
    expect(hasPendingManagedFixture(t)).toBe(false)

    t.rounds[0].matches.forEach((_, i) => {
      if (i !== matchIdx) bracket.setResult(id, 0, i, 2, 0)
    })

    const second = nextManagedFixture(t)!
    expect(second.match.id).not.toBe(first.match.id)
    expect(second.source).toMatchObject({ kind: "knockout", roundIdx: 1 })
  })

  it("ignores a bye", () => {
    // Six teams in a bracket of eight leaves two slots empty.
    const { crud, tournaments } = setup()
    crud.create("Cup", ["t1", "t2", "t3", "t4", "t5", "t6"])
    const t = tournaments.value[0]
    for (const teamId of ["t1", "t2", "t3", "t4", "t5", "t6"]) {
      manage(t, teamId)
      const entry = nextManagedFixture(t)
      if (entry) {
        expect(entry.homeId).not.toBeNull()
        expect(entry.awayId).not.toBeNull()
      }
    }
  })

  it("sees the second leg of a two-legged tie as its own fixture", () => {
    const { crud, bracket, tournaments, ids } = setup()
    const id = crud.create("Cup", ids)!
    const t = tournaments.value[0]
    t.rounds[0].matches.forEach((m) => (m.leg2Result = null))
    manage(t, "t1")

    const leg1 = nextManagedFixture(t)!
    const matchIdx = t.rounds[0].matches.findIndex((m) => m.id === leg1.match.id)
    bracket.setResult(id, 0, matchIdx, 1, 1)

    const leg2 = nextManagedFixture(t)!
    expect(leg2.match.id).toBe(leg1.match.id)
    expect(legOf(leg2)).toBe(2)
    // The fixture is reversed for the return.
    expect(leg2.homeId).toBe(leg1.awayId)
  })
})

describe("a league season", () => {
  it("walks the matchdays in order", () => {
    const { crud, tournaments, ids } = setup()
    crud.createLeagueTournament("Liga", ids, "single")
    const t = tournaments.value[0]
    manage(t, "t3")

    const pending = pendingManagedFixtures(t)
    // Seven opponents, once each.
    expect(pending).toHaveLength(7)
    expect(pending.every((e) => e.homeId === "t3" || e.awayId === "t3")).toBe(true)
    expect(nextManagedFixture(t)!.match.id).toBe(pending[0].match.id)
  })

  it("empties as the season is played out", () => {
    const { crud, league, tournaments, ids } = setup()
    const id = crud.createLeagueTournament("Liga", ids, "single")!
    const t = tournaments.value[0]
    manage(t, "t3")

    league.simAllLeague(id)
    expect(pendingManagedFixtures(t)).toEqual([])
    expect(nextManagedFixture(t)).toBeNull()
    expect(hasPendingManagedFixture(t)).toBe(false)
  })
})

describe("a group stage", () => {
  it("finds the managed team's group matches", () => {
    const { crud, tournaments, ids } = setup()
    crud.create("Cup", ids, false, undefined, 2)
    const t = tournaments.value[0]
    expect(t.groups?.length).toBe(2)
    manage(t, "t1")

    const pending = pendingManagedFixtures(t)
    expect(pending.length).toBeGreaterThan(0)
    expect(pending[0].source.kind).toBe("group")
  })

  it("is clear once the group is done and the bracket has not been seeded", () => {
    const { crud, groups, tournaments, ids } = setup()
    const id = crud.create("Cup", ids, false, undefined, 2)!
    const t = tournaments.value[0]
    manage(t, "t1")

    groups.simAllGroups(id)
    expect(hasPendingManagedFixture(t)).toBe(false)
  })
})

describe("isManagedMatch", () => {
  it("is false for a match the managed team is not in", () => {
    const { crud, tournaments, ids } = setup()
    crud.create("Cup", ids)
    const t = tournaments.value[0]
    manage(t, "t1")

    const mine = nextManagedFixture(t)!
    const other = t.rounds[0].matches.find((m) => m.id !== mine.match.id)!
    expect(isManagedMatch(t, other.id)).toBe(false)
  })

  it("is false for an id that is not in this tournament at all", () => {
    const { crud, tournaments, ids } = setup()
    crud.create("Cup", ids)
    const t = tournaments.value[0]
    manage(t, "t1")
    expect(isManagedMatch(t, "nope")).toBe(false)
  })
})
