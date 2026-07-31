// modules/tournament/store.ts
//
// Composition root. It owns the two pieces of state and wires the action
// slices together; the slices own the rules. Nothing here should grow a
// third responsibility -- if an action needs more than dispatching across
// slices, it belongs in a slice.
import { defineStore } from "pinia"
import { ref } from "vue"
import type { Tournament, Tiebreaker, LegMode } from "./types"
import {
  createMultiTierLeague,
  getLeaguePlayoffData,
  canStartLeaguePlayoff,
  seedLeaguePlayoffBracket,
} from "@/engine"
import { useTeamsStore } from "../teams/store"
import { makeWithTournament, assertNoSliceCollisions } from "./store/helpers"
import { useCrudActions } from "./store/crud"
import { useBracketActions } from "./store/bracket"
import { useThirdPlaceActions } from "./store/third-place"
import { useGroupActions } from "./store/groups"
import { useDrawActions } from "./store/draw"
import { useLeagueActions } from "./store/league"
import { useLeaguePlayoffActions } from "./store/leaguePlayoff"
import { useScoringActions } from "./store/scoring"

export const useTournamentStore = defineStore("tournament", () => {
  const tournaments = ref<Tournament[]>([])
  const active = ref<string | null>(null)

  function getTeams() {
    return useTeamsStore().teams
  }

  const withTournament = makeWithTournament(tournaments)

  const thirdPlace = useThirdPlaceActions(tournaments, getTeams)
  const crud = useCrudActions(tournaments, active, getTeams)
  const bracket = useBracketActions(tournaments, getTeams, thirdPlace.simulateThirdPlace)
  const groups = useGroupActions(tournaments, getTeams)
  const draw = useDrawActions(tournaments, getTeams)
  const leagueActions = useLeagueActions(tournaments, getTeams)
  const leaguePlayoff = useLeaguePlayoffActions(tournaments, getTeams)
  const scoring = useScoringActions(tournaments)

  if (import.meta.env.DEV) {
    assertNoSliceCollisions({
      crud,
      bracket,
      thirdPlace,
      groups,
      draw,
      leagueActions,
      leaguePlayoff,
      scoring,
    })
  }

  function createMultiTierLeagueTournament(
    name: string,
    tierDefs: Array<{ name: string; teamIds: string[] }>,
    legMode: LegMode = "single",
    promotionCount = 1,
    tiebreaker?: Tiebreaker,
    winPoints?: number,
    drawPoints?: number,
    lossPoints?: number
  ): string {
    const allTeams = useTeamsStore().teams
    const season =
      tournaments.value
        .filter((t) => t.name === name)
        .reduce((max, t) => Math.max(max, t.season), 0) + 1
    const resolvedTiers = tierDefs.map((td) => ({
      name: td.name,
      teams: allTeams.filter((t) => td.teamIds.includes(t.id)),
    }))
    const newT = createMultiTierLeague(name, resolvedTiers, season, legMode, promotionCount)
    if (tiebreaker) newT.tiebreaker = tiebreaker
    if (winPoints !== undefined) newT.winPoints = winPoints
    if (drawPoints !== undefined) newT.drawPoints = drawPoints
    if (lossPoints !== undefined) newT.lossPoints = lossPoints
    tournaments.value.push(newT)
    active.value = newT.id
    return newT.id
  }

  /** One "Simulate All" plays out the whole structure, whatever it is. */
  function simulateTournament(tournamentId: string) {
    withTournament(tournamentId, (t) => {
      if (t.format === "league") {
        if (t.tiers?.length) {
          leagueActions.simAllTiers(tournamentId)
        } else {
          leagueActions.simAllLeague(tournamentId)
        }
        // Auto-seed the playoff bracket once the season is done (like
        // group -> bracket), then play it out.
        const data = getLeaguePlayoffData(t)
        if (data?.enabled && !data.started && canStartLeaguePlayoff(t)) {
          seedLeaguePlayoffBracket(t, getTeams(), data.seedMode)
        }
        if (t.rounds.length && getLeaguePlayoffData(t)?.started) {
          bracket.simulateAll(tournamentId)
        }
        return
      }

      if (t.format === "group+bracket") {
        groups.simAllGroups(tournamentId)
        // Only seed the bracket if it hasn't been seeded yet — re-seeding
        // would rebuild rounds and wipe knockout matches already played.
        if (!t.groupsDone) groups.advanceToBracket(tournamentId)
      }

      bracket.simulateAll(tournamentId)
    })
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
    ...leaguePlayoff,
    ...scoring,
    createMultiTierLeagueTournament,
    simulateTournament,
  }
})
