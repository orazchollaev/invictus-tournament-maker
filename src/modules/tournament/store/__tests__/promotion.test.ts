import { describe, it, expect } from "vitest"
import { ref } from "vue"
import type { Tournament } from "@/modules/tournament/types"
import { makeTeams } from "@/engine/__tests__/helpers"
import { computeSeasonMoves, createMultiTierLeague, promotionPlayoffOf } from "@/engine"
import { useCrudActions } from "../crud"
import { useLeagueActions } from "../league"
import { usePhasesActions } from "../phases"

function setup() {
  const teams = makeTeams(12)
  const t = createMultiTierLeague(
    "Pyramid",
    [
      { name: "Div 1", teams: teams.slice(0, 6) },
      { name: "Div 2", teams: teams.slice(6) },
    ],
    1,
    "single",
    1,
    4
  )
  const tournaments = ref<Tournament[]>([t])
  const active = ref<string | null>(t.id)
  const getTeams = () => teams
  return {
    id: t.id,
    t: () => tournaments.value[0],
    crud: useCrudActions(tournaments, active, getTeams),
    league: useLeagueActions(tournaments, getTeams),
    phases: usePhasesActions(tournaments, getTeams),
  }
}

describe("multi-tier promotion play-off through the store", () => {
  it("is drawn when the lower division ends and holds the season open", () => {
    const { id, t, crud, league, phases } = setup()

    league.simAllTiers(id)
    const playoff = promotionPlayoffOf(t(), 1)
    expect(playoff).toBeDefined()
    expect(playoff!.teamIds).toHaveLength(4)
    // Champion is known, but the season is not over until the play-off is.
    expect(t().winnerId).not.toBeNull()
    expect(crud.isTournamentFinished(id)).toBe(false)

    phases.simAllPhaseBracket(id, playoff!.id)
    expect(crud.isTournamentFinished(id)).toBe(true)
    // A phase result must not overwrite the league's own champion.
    expect(t().winnerId).toBe(t().tiers![0].league.standings[0].teamId)
  })

  it("carries the play-off setting into the next season and swaps two teams", () => {
    const { id, t, crud, league, phases } = setup()
    league.simAllTiers(id)
    phases.simAllPhaseBracket(id, promotionPlayoffOf(t(), 1)!.id)

    const moves = computeSeasonMoves(t())
    // One direct place plus the play-off winner each way.
    expect(moves.promoted.size).toBe(2)
    expect(moves.relegated.size).toBe(2)
    const nextIds = crud.newMultiTierSeason(id, moves.nextTierTeamIds)
    expect(nextIds).toBeDefined()
    expect(crud.getById(nextIds!)?.promotionPlayoffSize).toBe(4)
    expect(crud.getById(nextIds!)?.phases).toBeUndefined()
  })

  it("clears play-offs when results are reset", () => {
    const { id, t, crud, league } = setup()
    league.simAllTiers(id)
    expect(t().phases?.length).toBe(1)
    crud.resetResults(id)
    expect(t().phases).toBeUndefined()
  })
})
