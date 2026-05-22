// modules/tournament/store.ts
import { defineStore } from "pinia"
import { ref } from "vue"
import type { Tournament } from "./types"
import { useTeamsStore } from "../teams/store"
import { useCrudActions } from "./store/crud"
import { useBracketActions } from "./store/bracket"
import { useThirdPlaceActions } from "./store/third-place"
import { useGroupActions } from "./store/groups"
import { useDrawActions } from "./store/draw"

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

  return {
    tournaments,
    active,
    ...crud,
    ...bracket,
    ...thirdPlace,
    ...groups,
    ...draw,
  }
})
