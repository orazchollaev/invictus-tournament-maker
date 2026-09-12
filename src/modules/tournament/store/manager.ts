import type { Ref } from "vue"
import type { ManagerState, Tournament } from "../types"
import type { Formation, PlayStyle, Team } from "@/modules/teams/types"
import { DEFAULT_FORMATION, DEFAULT_STYLE, teamFormation } from "@/engine"
import { makeWithTournament } from "./helpers"

/**
 * Taking charge of a side, and the instructions it plays to.
 *
 * The set-up starts as whatever the club's own coach uses, so a user who
 * never opens the tactics sheet still plays the way the team was built to
 * play. From then on it is his.
 */
export function useManagerActions(tournaments: Ref<Tournament[]>, getTeams: () => Team[]) {
  const withTournament = makeWithTournament(tournaments)

  function setManagerTeam(tournamentId: string, teamId: string | null) {
    withTournament(tournamentId, (t) => {
      if (!teamId) {
        delete t.manager
        return
      }
      if (!t.teamIds.includes(teamId)) return

      const team = getTeams().find((tm) => tm.id === teamId)
      const manager: ManagerState = {
        teamId,
        formation: team ? teamFormation(team) : DEFAULT_FORMATION,
        style: team?.coach?.style ?? DEFAULT_STYLE,
        startedAt: Date.now(),
      }
      t.manager = manager
    })
  }

  function setManagerTactics(
    tournamentId: string,
    tactics: { formation?: Formation; style?: PlayStyle }
  ) {
    withTournament(tournamentId, (t) => {
      if (!t.manager) return
      if (tactics.formation) t.manager.formation = tactics.formation
      if (tactics.style) t.manager.style = tactics.style
    })
  }

  return { setManagerTeam, setManagerTactics }
}
