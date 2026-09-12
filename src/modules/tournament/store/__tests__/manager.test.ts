import { describe, expect, it } from "vitest"
import { ref } from "vue"
import type { Team } from "@/modules/teams/types"
import type { Tournament } from "@/modules/tournament/types"
import { makeTeams } from "@/engine/__tests__/helpers"
import { DEFAULT_FORMATION, DEFAULT_STYLE } from "@/engine"
import { useCrudActions } from "../crud"
import { useManagerActions } from "../manager"
import { useLeagueActions } from "../league"
import { hasPendingManagedFixture } from "@/modules/tournament/utils/managerFixtures"

function setup(teams: Team[] = makeTeams(8)) {
  const tournaments = ref<Tournament[]>([])
  const active = ref<string | null>(null)
  const getTeams = () => teams
  const crud = useCrudActions(tournaments, active, getTeams)
  const manager = useManagerActions(tournaments, getTeams)
  const league = useLeagueActions(tournaments, getTeams)
  const ids = teams.map((t) => t.id)
  return { tournaments, crud, manager, league, teams, ids }
}

function coached(): Team[] {
  const teams = makeTeams(8)
  teams[0].coach = { name: "Boss", formation: "3-5-2", style: "attacking", power: 80 }
  return teams
}

describe("setManagerTeam", () => {
  it("takes charge, seeded from the club's own coach", () => {
    const { crud, manager, tournaments, ids } = setup(coached())
    const id = crud.create("Cup", ids)!
    manager.setManagerTeam(id, "t1")

    expect(tournaments.value[0].manager).toMatchObject({
      teamId: "t1",
      formation: "3-5-2",
      style: "attacking",
    })
  })

  it("falls back to the engine defaults for a club with no coach", () => {
    const { crud, manager, tournaments, ids } = setup()
    const id = crud.create("Cup", ids)!
    manager.setManagerTeam(id, "t2")

    expect(tournaments.value[0].manager).toMatchObject({
      teamId: "t2",
      formation: DEFAULT_FORMATION,
      style: DEFAULT_STYLE,
    })
  })

  it("refuses a team that is not in this tournament", () => {
    const { crud, manager, tournaments } = setup()
    const id = crud.create("Cup", ["t1", "t2", "t3", "t4"])!
    manager.setManagerTeam(id, "t8")
    expect(tournaments.value[0].manager).toBeUndefined()
  })

  it("stands down on null", () => {
    const { crud, manager, tournaments, ids } = setup()
    const id = crud.create("Cup", ids)!
    manager.setManagerTeam(id, "t1")
    manager.setManagerTeam(id, null)
    expect(tournaments.value[0].manager).toBeUndefined()
  })

  it("does nothing for a tournament that does not exist", () => {
    const { manager, tournaments } = setup()
    expect(() => manager.setManagerTeam("nope", "t1")).not.toThrow()
    expect(tournaments.value).toHaveLength(0)
  })
})

describe("setManagerTactics", () => {
  it("changes only what it is given", () => {
    const { crud, manager, tournaments, ids } = setup(coached())
    const id = crud.create("Cup", ids)!
    manager.setManagerTeam(id, "t1")

    manager.setManagerTactics(id, { style: "defensive" })
    expect(tournaments.value[0].manager).toMatchObject({
      formation: "3-5-2",
      style: "defensive",
    })

    manager.setManagerTactics(id, { formation: "5-4-1" })
    expect(tournaments.value[0].manager).toMatchObject({
      formation: "5-4-1",
      style: "defensive",
    })
  })

  it("does nothing when nobody is managing", () => {
    const { crud, manager, tournaments, ids } = setup()
    const id = crud.create("Cup", ids)!
    manager.setManagerTactics(id, { style: "attacking" })
    expect(tournaments.value[0].manager).toBeUndefined()
  })
})

describe("a new season", () => {
  it("keeps the user in charge of the same club", () => {
    const { crud, manager, league, tournaments, ids } = setup()
    const id = crud.createLeagueTournament("Liga", ids, "single")!
    manager.setManagerTeam(id, "t4")
    league.simAllLeague(id)

    const nextId = crud.newSeason(id)!
    const next = tournaments.value.find((t) => t.id === nextId)!
    expect(next.manager?.teamId).toBe("t4")
  })

  it("carries the tactics the user was actually using, not the coach's", () => {
    const { crud, manager, league, tournaments, ids } = setup(coached())
    const id = crud.createLeagueTournament("Liga", ids, "single")!
    manager.setManagerTeam(id, "t1")
    manager.setManagerTactics(id, { formation: "4-2-3-1", style: "defensive" })
    league.simAllLeague(id)

    const nextId = crud.newSeason(id)!
    const next = tournaments.value.find((t) => t.id === nextId)!
    expect(next.manager).toMatchObject({ formation: "4-2-3-1", style: "defensive" })
  })

  it("stands the user down when his club is no longer in the competition", () => {
    const { crud, manager, league, tournaments, ids } = setup()
    const id = crud.createLeagueTournament("Liga", ids, "single")!
    manager.setManagerTeam(id, "t8")
    league.simAllLeague(id)

    // Relegated: the next season is played without him.
    const nextId = crud.newSeason(id, false, undefined, undefined, undefined, undefined, [
      "t1",
      "t2",
      "t3",
      "t4",
      "t5",
      "t6",
      "t7",
    ])!
    const next = tournaments.value.find((t) => t.id === nextId)!
    expect(next.manager).toBeUndefined()
  })
})

describe("the bulk-simulation guard", () => {
  it("blocks while the managed team has a fixture outstanding", () => {
    const { crud, manager, tournaments, ids } = setup()
    const id = crud.createLeagueTournament("Liga", ids, "single")!
    manager.setManagerTeam(id, "t4")

    const t = tournaments.value[0]
    expect(hasPendingManagedFixture(t)).toBe(true)
  })

  it("releases once the whole season has been played", () => {
    const { crud, manager, league, tournaments, ids } = setup()
    const id = crud.createLeagueTournament("Liga", ids, "single")!
    manager.setManagerTeam(id, "t4")
    league.simAllLeague(id)

    expect(hasPendingManagedFixture(tournaments.value[0])).toBe(false)
  })

  it("never blocks a tournament nobody is managing", () => {
    const { crud, tournaments, ids } = setup()
    crud.createLeagueTournament("Liga", ids, "single")
    expect(hasPendingManagedFixture(tournaments.value[0])).toBe(false)
  })
})
