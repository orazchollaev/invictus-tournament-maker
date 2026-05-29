// modules/tournament/store.ts
import { defineStore } from "pinia"
import { ref } from "vue"
import type { Tournament, Tiebreaker } from "./types"
import { recalcStandings, recalcLeagueStandings } from "@/engine"
import { useTeamsStore } from "../teams/store"
import { useCrudActions } from "./store/crud"
import { useBracketActions } from "./store/bracket"
import { useThirdPlaceActions } from "./store/third-place"
import { useGroupActions } from "./store/groups"
import { useDrawActions } from "./store/draw"
import { useLeagueActions } from "./store/league"

export const useTournamentStore = defineStore("tournament", () => {
  const tournaments = ref<Tournament[]>([])
  const active = ref<string | null>(null)

  function getTeams() {
    return useTeamsStore().teams
  }

  const thirdPlace = useThirdPlaceActions(tournaments, getTeams)
  const crud = useCrudActions(tournaments, active, getTeams)
  const bracket = useBracketActions(tournaments, getTeams, thirdPlace.simulateThirdPlace)
  const groups = useGroupActions(tournaments, getTeams)
  const draw = useDrawActions(tournaments, getTeams)
  const leagueActions = useLeagueActions(tournaments, getTeams)

  function setTiebreaker(tournamentId: string, tiebreaker: Tiebreaker) {
    const t = tournaments.value.find((t) => t.id === tournamentId)
    if (!t) return
    t.tiebreaker = tiebreaker
    if (t.format === "league" && t.league) {
      recalcLeagueStandings(t.league, tiebreaker)
    } else if (t.groups) {
      t.groups.forEach((g) => recalcStandings(g, tiebreaker))
    }
  }

  function simulateTournament(tournamentId: string) {
    const t = tournaments.value.find((t) => t.id === tournamentId)
    if (!t) return
    if (t.format === "league") {
      leagueActions.simAllLeague(tournamentId)
      return
    }
    if (t.format === "group+bracket") {
      groups.simAllGroups(tournamentId)
      groups.advanceToBracket(tournamentId)
    }
    bracket.simulateAll(tournamentId)
  }

  return {
    tournaments,
    active,
    ...crud,
    ...bracket,
    ...thirdPlace,
    ...groups,
    ...draw,
    ...leagueActions,
    simulateTournament,
    setTiebreaker,
  }
})
