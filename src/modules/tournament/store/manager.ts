import type { Ref } from "vue"
import type { ManagerLineupSlot, ManagerState, Tournament } from "../types"
import type { Formation, PlayStyle, Team } from "@/modules/teams/types"
import type { Player } from "@/modules/players/types"
import { DEFAULT_FORMATION, DEFAULT_STYLE, playedMatches, teamFormation } from "@/engine"
import { bestStartingXI, reconcileLineupSlots } from "../utils/managerLineup"
import { makeWithTournament } from "./helpers"

/**
 * Taking charge of a side, and the instructions it plays to.
 *
 * The set-up starts as whatever the club's own coach uses, so a user who
 * never opens the tactics sheet still plays the way the team was built to
 * play. From then on it is his.
 */
export function useManagerActions(
  tournaments: Ref<Tournament[]>,
  getTeams: () => Team[],
  getPlayers: () => Player[]
) {
  const withTournament = makeWithTournament(tournaments)

  function setManagerTeam(tournamentId: string, teamId: string | null) {
    withTournament(tournamentId, (t) => {
      if (!teamId) {
        delete t.manager
        return
      }
      if (!t.teamIds.includes(teamId)) return
      // Taking a job is only on offer before the season has played a match —
      // switching sides mid-season would leave results on the books for
      // matches the user never actually played.
      if (!t.manager && playedMatches(t).length > 0) return

      const team = getTeams().find((tm) => tm.id === teamId)
      const formation = team ? teamFormation(team) : DEFAULT_FORMATION
      const squad = getPlayers().filter((p) => p.teamId === teamId)
      const manager: ManagerState = {
        teamId,
        formation,
        style: team?.coach?.style ?? DEFAULT_STYLE,
        startedAt: Date.now(),
        // Best eleven he already has, so taking the job hands him a side
        // ready to play rather than an empty sheet he must fill first.
        lineup: bestStartingXI(squad, formation),
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
      if (tactics.formation) {
        t.manager.formation = tactics.formation
        // The old picks are reshaped onto the new formation right away —
        // never left to silently overflow it once the match kicks off.
        t.manager.lineup = reconcileLineupSlots(t.manager.lineup ?? [], tactics.formation)
      }
      if (tactics.style) t.manager.style = tactics.style
    })
  }

  function setManagerLineup(tournamentId: string, slots: ManagerLineupSlot[]) {
    withTournament(tournamentId, (t) => {
      if (!t.manager) return
      t.manager.lineup = slots
    })
  }

  return { setManagerTeam, setManagerTactics, setManagerLineup }
}
