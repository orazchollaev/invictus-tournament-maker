import type { Ref } from "vue"
import type { Tournament } from "../types"
import type { Team } from "@/modules/teams/types"
import {
  setLeagueMatchResult,
  clearLeagueMatchResult,
  clearTierMatchResult,
  simulateLeagueMatch,
  simulateLeagueMatchday,
  simulateAllLeague,
  allLeagueDone,
  getLeagueWinner,
  setTierMatchResult,
  simulateTierMatch,
  simulateTierMatchday,
  simulateAllTier,
  simulateAllTiers,
  allTiersDone,
  getTiersWinner,
  getLeaguePlayoffData,
  syncPromotionPlayoffs,
} from "@/engine"
import { adjustedTeams } from "./helpers"

export function useLeagueActions(tournaments: Ref<Tournament[]>, getTeams: () => Team[]) {
  function getT(id: string) {
    return tournaments.value.find((t) => t.id === id)
  }

  // ── Single-tier ──────────────────────────────────────────────────

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
    if (allLeagueDone(t) && !getLeaguePlayoffData(t)?.enabled) t.winnerId = getLeagueWinner(t)
  }

  function clearLeagueResult(tournamentId: string, matchdayIdx: number, matchIdx: number) {
    const t = getT(tournamentId)
    if (!t) return
    clearLeagueMatchResult(t, matchdayIdx, matchIdx)
  }

  function simLeagueMatch(tournamentId: string, matchdayIdx: number, matchIdx: number) {
    const t = getT(tournamentId)
    if (!t) return
    simulateLeagueMatch(t, matchdayIdx, matchIdx, adjustedTeams(getTeams(), t))
    if (allLeagueDone(t) && !getLeaguePlayoffData(t)?.enabled) t.winnerId = getLeagueWinner(t)
  }

  function simLeagueMatchday(tournamentId: string, matchdayIdx: number) {
    const t = getT(tournamentId)
    if (!t) return
    simulateLeagueMatchday(t, matchdayIdx, adjustedTeams(getTeams(), t))
    if (allLeagueDone(t) && !getLeaguePlayoffData(t)?.enabled) t.winnerId = getLeagueWinner(t)
  }

  function simAllLeague(tournamentId: string) {
    const t = getT(tournamentId)
    if (!t) return
    simulateAllLeague(t, adjustedTeams(getTeams(), t))
    if (allLeagueDone(t) && !getLeaguePlayoffData(t)?.enabled) t.winnerId = getLeagueWinner(t)
  }

  // ── Multi-tier ───────────────────────────────────────────────────

  /**
   * After any division result: redraw whatever promotion play-off the change
   * affects, then crown the champion once every division is done.
   */
  function afterTierChange(t: Tournament) {
    syncPromotionPlayoffs(t, adjustedTeams(getTeams(), t))
    if (allTiersDone(t) && !getLeaguePlayoffData(t)?.enabled) t.winnerId = getTiersWinner(t)
  }

  function setTierResult(
    tournamentId: string,
    tierIdx: number,
    matchdayIdx: number,
    matchIdx: number,
    home: number,
    away: number
  ) {
    const t = getT(tournamentId)
    if (!t) return
    setTierMatchResult(t, tierIdx, matchdayIdx, matchIdx, home, away)
    afterTierChange(t)
  }

  function clearTierResult(
    tournamentId: string,
    tierIdx: number,
    matchdayIdx: number,
    matchIdx: number
  ) {
    const t = getT(tournamentId)
    if (!t) return
    clearTierMatchResult(t, tierIdx, matchdayIdx, matchIdx)
    syncPromotionPlayoffs(t, adjustedTeams(getTeams(), t))
  }

  function simTierMatch(
    tournamentId: string,
    tierIdx: number,
    matchdayIdx: number,
    matchIdx: number
  ) {
    const t = getT(tournamentId)
    if (!t) return
    simulateTierMatch(t, tierIdx, matchdayIdx, matchIdx, adjustedTeams(getTeams(), t))
    afterTierChange(t)
  }

  function simTierMatchday(tournamentId: string, tierIdx: number, matchdayIdx: number) {
    const t = getT(tournamentId)
    if (!t) return
    simulateTierMatchday(t, tierIdx, matchdayIdx, adjustedTeams(getTeams(), t))
    afterTierChange(t)
  }

  function simAllTierAction(tournamentId: string, tierIdx: number) {
    const t = getT(tournamentId)
    if (!t) return
    simulateAllTier(t, tierIdx, adjustedTeams(getTeams(), t))
    afterTierChange(t)
  }

  function simAllTiersAction(tournamentId: string) {
    const t = getT(tournamentId)
    if (!t) return
    simulateAllTiers(t, adjustedTeams(getTeams(), t))
    afterTierChange(t)
  }

  return {
    setLeagueResult,
    clearLeagueResult,
    clearTierResult,
    simLeagueMatch,
    simLeagueMatchday,
    simAllLeague,
    setTierResult,
    simTierMatch,
    simTierMatchday,
    simAllTier: simAllTierAction,
    simAllTiers: simAllTiersAction,
  }
}
