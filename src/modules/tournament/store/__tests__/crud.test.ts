import { describe, it, expect } from "vitest"
import { ref } from "vue"
import type { Team } from "@/modules/teams/types"
import type { Tournament } from "@/modules/tournament/types"
import { makeTeams } from "@/engine/__tests__/helpers"
import { useCrudActions } from "../crud"
import { useBracketActions } from "../bracket"
import { useThirdPlaceActions } from "../third-place"

function setup(teams: Team[] = makeTeams(8)) {
  const tournaments = ref<Tournament[]>([])
  const active = ref<string | null>(null)
  const crud = useCrudActions(tournaments, active, () => teams)
  const third = useThirdPlaceActions(tournaments, () => teams)
  const bracket = useBracketActions(tournaments, () => teams, third.simulateThirdPlace)
  const ids = teams.map((t) => t.id)
  return { tournaments, active, crud, bracket, third, teams, ids }
}

describe("create", () => {
  it("selects the tournament it just made", () => {
    const { crud, active, tournaments } = setup()
    const id = crud.create("Cup", ["t1", "t2", "t3", "t4"])
    expect(active.value).toBe(id)
    expect(tournaments.value).toHaveLength(1)
  })

  it("only enters the teams that were picked", () => {
    const { crud, tournaments } = setup()
    crud.create("Cup", ["t1", "t2", "t3", "t4"])
    expect(tournaments.value[0].teamIds).toHaveLength(4)
  })

  /** Reusing a name starts the next season of it, not a second season 1. */
  it("numbers seasons per name", () => {
    const { crud, tournaments, ids } = setup()
    crud.create("Cup", ids)
    crud.create("Cup", ids)
    crud.create("Other", ids)

    expect(tournaments.value.map((t) => `${t.name} ${t.season}`)).toEqual([
      "Cup 1",
      "Cup 2",
      "Other 1",
    ])
  })

  it("records how the bracket was drawn", () => {
    const { crud, tournaments, ids } = setup()
    crud.create("Random", ids)
    crud.create("Seeded", ids, true)
    crud.create("Manual", ids, false, ids)

    expect(tournaments.value.map((t) => t.drawType)).toEqual(["random", "seeded", "manual"])
  })
})

describe("renameTournament, remove and getById", () => {
  it("finds a tournament by id and forgets it on remove", () => {
    const { crud, ids } = setup()
    const id = crud.create("Cup", ids)

    crud.renameTournament(id, "Renamed")
    expect(crud.getById(id)?.name).toBe("Renamed")

    crud.remove(id)
    expect(crud.getById(id)).toBeUndefined()
  })

  it("ignores an id it does not have", () => {
    const { crud, tournaments, ids } = setup()
    crud.create("Cup", ids)
    const before = JSON.stringify(tournaments.value)

    crud.renameTournament("nope", "x")
    crud.remove("nope")
    crud.resetResults("nope")

    expect(JSON.stringify(tournaments.value)).toBe(before)
    expect(crud.isTournamentFinished("nope")).toBe(false)
  })
})

describe("resetResults", () => {
  it("returns a played bracket to unplayed and drops the champion", () => {
    const { crud, bracket, ids } = setup()
    const id = crud.create("Cup", ids)
    const t = crud.getById(id)!

    for (let m = 0; m < t.rounds[0].matches.length; m++) bracket.setResult(id, 0, m, 2, 0)
    bracket.setResult(id, 1, 0, 1, 0)
    bracket.setResult(id, 1, 1, 1, 0)
    bracket.setResult(id, 2, 0, 1, 0)
    expect(t.winnerId).not.toBeNull()
    expect(crud.isTournamentFinished(id)).toBe(true)

    crud.resetResults(id)
    expect(t.winnerId).toBeNull()
    expect(t.rounds.flatMap((r) => r.matches).every((m) => m.result === null)).toBe(true)
    expect(crud.isTournamentFinished(id)).toBe(false)
  })

  /**
   * Round one is the seeding, so it keeps its pairings; every later round is
   * filled by results and has to empty out again.
   */
  it("keeps the first-round pairings and empties the later rounds", () => {
    const { crud, bracket, ids } = setup()
    const id = crud.create("Cup", ids)
    const t = crud.getById(id)!
    for (let m = 0; m < t.rounds[0].matches.length; m++) bracket.setResult(id, 0, m, 2, 0)

    crud.resetResults(id)
    expect(t.rounds[0].matches.every((m) => m.homeId && m.awayId)).toBe(true)
    expect(t.rounds[1].matches.every((m) => m.homeId === null && m.awayId === null)).toBe(true)
  })

  it("empties the third-place match too", () => {
    const { crud, bracket, third, ids } = setup()
    const id = crud.create("Cup", ids)
    const t = crud.getById(id)!
    for (let m = 0; m < t.rounds[0].matches.length; m++) bracket.setResult(id, 0, m, 2, 0)
    third.toggleThirdPlace(id)
    bracket.setResult(id, 1, 0, 1, 0)
    bracket.setResult(id, 1, 1, 1, 0)
    third.setThirdPlaceResult(id, 3, 0)
    expect(t.thirdPlaceMatch!.result).not.toBeNull()

    crud.resetResults(id)
    expect(t.thirdPlaceMatch!.result).toBeNull()
    expect(t.thirdPlaceMatch!.homeId).toBeNull()
  })
})

describe("createLeagueTournament", () => {
  it("builds a league with a full round robin and no bracket", () => {
    const { crud, ids } = setup()
    const id = crud.createLeagueTournament("League", ids.slice(0, 4))
    const t = crud.getById(id)!

    expect(t.league).toBeDefined()
    expect(t.rounds).toHaveLength(0)
    const played = t.league!.matchdays.flatMap((md) => md.matches)
    expect(played).toHaveLength(6) // 4 teams, single round robin
  })

  it("resets a played league without leaving a stale table", () => {
    const { crud, ids } = setup()
    const id = crud.createLeagueTournament("League", ids.slice(0, 4))
    const t = crud.getById(id)!
    for (const md of t.league!.matchdays) {
      for (const m of md.matches) m.result = { home: 2, away: 0 }
    }

    crud.resetResults(id)
    expect(t.league!.matchdays.flatMap((md) => md.matches).every((m) => m.result === null)).toBe(
      true
    )
    expect(t.league!.standings.every((s) => s.played === 0 && s.pts === 0)).toBe(true)
    expect(t.winnerId).toBeNull()
  })
})
