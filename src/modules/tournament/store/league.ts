import type { Ref } from "vue"
import type { Tournament } from "../types"
import type { Team } from "@/modules/teams/types"
import {
  setLeagueMatchResult,
  simulateLeagueMatch,
  simulateLeagueMatchday,
  simulateAllLeague,
  allLeagueDone,
  getLeagueWinner,
} from "@/engine"

export function useLeagueActions(tournaments: Ref<Tournament[]>, getTeams: () => Team[]) {
  function getT(id: string) {
    return tournaments.value.find((t) => t.id === id)
  }

  function setLeagueResult(
    tournamentId: string,
    matchdayIdx: number,
    matchIdx: number,
    home: number,
    away: number
  ) {
    const t = getT(tournamentId)
    if (!t) return
    setLeagueMatchResult(t, matchdayIdx, matchIdx, home, away)
    if (allLeagueDone(t)) t.winnerId = getLeagueWinner(t)
  }

  function simLeagueMatch(tournamentId: string, matchdayIdx: number, matchIdx: number) {
    const t = getT(tournamentId)
    if (!t) return
    simulateLeagueMatch(t, matchdayIdx, matchIdx, getTeams())
    if (allLeagueDone(t)) t.winnerId = getLeagueWinner(t)
  }

  function simLeagueMatchday(tournamentId: string, matchdayIdx: number) {
    const t = getT(tournamentId)
    if (!t) return
    simulateLeagueMatchday(t, matchdayIdx, getTeams())
    if (allLeagueDone(t)) t.winnerId = getLeagueWinner(t)
  }

  function simAllLeague(tournamentId: string) {
    const t = getT(tournamentId)
    if (!t) return
    simulateAllLeague(t, getTeams())
    if (allLeagueDone(t)) t.winnerId = getLeagueWinner(t)
  }

  return { setLeagueResult, simLeagueMatch, simLeagueMatchday, simAllLeague }
}
