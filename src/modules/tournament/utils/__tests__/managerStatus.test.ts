import { describe, expect, it } from "vitest"
import { ref } from "vue"
import type { Team } from "@/modules/teams/types"
import type { Tournament } from "@/modules/tournament/types"
import { makeTeams } from "@/engine/__tests__/helpers"
import { useCrudActions } from "@/modules/tournament/store/crud"
import { useThirdPlaceActions } from "@/modules/tournament/store/third-place"
import { useBracketActions } from "@/modules/tournament/store/bracket"
import { useLeagueActions } from "@/modules/tournament/store/league"
import { useGroupActions } from "@/modules/tournament/store/groups"
import { nextManagedFixture } from "../managerFixtures"
import { managerStatus } from "../managerStatus"

function setup(teams: Team[] = makeTeams(8)) {
  const tournaments = ref<Tournament[]>([])
  const active = ref<string | null>(null)
  const getTeams = () => teams
  const crud = useCrudActions(tournaments, active, getTeams)
  const third = useThirdPlaceActions(tournaments, getTeams)
  const bracket = useBracketActions(tournaments, getTeams, third.simulateThirdPlace)
  const league = useLeagueActions(tournaments, getTeams)
  const groups = useGroupActions(tournaments, getTeams)
  const ids = teams.map((t) => t.id)
  return { tournaments, crud, bracket, league, groups, ids }
}

function manage(t: Tournament, teamId: string) {
  t.manager = { teamId, formation: "4-4-2", style: "balanced", startedAt: 0 }
}

/** Plays the managed side's next knockout tie, won or lost. */
function playOwnTie(
  bracket: ReturnType<typeof setup>["bracket"],
  id: string,
  t: Tournament,
  win: boolean
) {
  const entry = nextManagedFixture(t)!
  const src = entry.source as { roundIdx: number }
  const mi = t.rounds[src.roundIdx].matches.findIndex((m) => m.id === entry.match.id)
  const home = entry.homeId === t.manager!.teamId
  const [h, a] = home === win ? [3, 0] : [0, 3]
  bracket.setResult(id, src.roundIdx, mi, h, a)
}

describe("managerStatus", () => {
  it("is null without a manager", () => {
    const { crud, tournaments, ids } = setup()
    crud.create("Cup", ids)
    expect(managerStatus(tournaments.value[0])).toBeNull()
  })

  it("puts a league side at its table position", () => {
    const { crud, tournaments, ids } = setup()
    crud.createLeagueTournament("Liga", ids, "single")
    const t = tournaments.value[0]
    manage(t, "t3")
    const status = managerStatus(t)
    expect(status).toMatchObject({ kind: "table", total: 8 })
    const pos = t.league!.standings.findIndex((s) => s.teamId === "t3") + 1
    expect(status).toMatchObject({ position: pos })
  })

  it("names the knockout round the side is playing in", () => {
    const { crud, tournaments, ids } = setup()
    crud.create("Cup", ids)
    const t = tournaments.value[0]
    manage(t, "t1")
    expect(managerStatus(t)).toEqual({
      kind: "knockout",
      stage: t.rounds[0].name,
      state: "alive",
    })
  })

  it("moves on to the next round after a win", () => {
    const { crud, bracket, tournaments, ids } = setup()
    const id = crud.create("Cup", ids)!
    const t = tournaments.value[0]
    manage(t, "t1")
    playOwnTie(bracket, id, t, true)
    expect(managerStatus(t)).toEqual({
      kind: "knockout",
      stage: t.rounds[1].name,
      state: "alive",
    })
  })

  it("says where the side went out", () => {
    const { crud, bracket, tournaments, ids } = setup()
    const id = crud.create("Cup", ids)!
    const t = tournaments.value[0]
    manage(t, "t1")
    playOwnTie(bracket, id, t, false)
    expect(managerStatus(t)).toEqual({
      kind: "knockout",
      stage: t.rounds[0].name,
      state: "out",
    })
  })

  it("crowns a winner", () => {
    const { crud, tournaments, ids } = setup()
    crud.create("Cup", ids)
    const t = tournaments.value[0]
    manage(t, "t1")
    t.winnerId = "t1"
    expect(managerStatus(t)).toEqual({ kind: "champion" })
  })

  it("marks a finished group as through or out while the bracket waits on its draw", () => {
    const { crud, groups, tournaments, ids } = setup()
    const id = crud.create("Cup", ids, false, undefined, 2)!
    const t = tournaments.value[0]
    groups.simAllGroups(id)
    const [group] = t.groups!
    const top = group.standings[0].teamId
    const bottom = group.standings[group.standings.length - 1].teamId

    manage(t, top)
    expect(managerStatus(t)).toMatchObject({ kind: "table", position: 1, state: "qualified" })
    manage(t, bottom)
    expect(managerStatus(t)).toMatchObject({ kind: "table", state: "out" })
  })

  it("leaves a group still in play without a verdict", () => {
    const { crud, tournaments, ids } = setup()
    crud.create("Cup", ids, false, undefined, 2)
    const t = tournaments.value[0]
    manage(t, "t1")
    const status = managerStatus(t)
    expect(status).toMatchObject({ kind: "table" })
    expect(status && "state" in status ? status.state : undefined).toBeUndefined()
  })
})
