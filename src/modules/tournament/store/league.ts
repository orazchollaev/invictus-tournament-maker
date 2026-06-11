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
  setTierMatchResult,
  simulateTierMatch,
  simulateTierMatchday,
  simulateAllTier,
  simulateAllTiers,
  allTiersDone,
  getTiersWinner,
} from "@/engine"

function adjustedTeams(teams: Team[], t: Tournament): Team[] {
  const adj = t.teamPowerAdjustments
  if (!adj || Object.keys(adj).length === 0) return teams
  return teams.map((team) => {
    const delta = adj[team.id] ?? 0
    return delta === 0 ? team : { ...team, power: Math.max(1, Math.min(100, team.power + delta)) }
  })
}

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
    if (allLeagueDone(t)) t.winnerId = getLeagueWinner(t)
  }

  function simLeagueMatch(tournamentId: string, matchdayIdx: number, matchIdx: number) {
    const t = getT(tournamentId)
    if (!t) return
    simulateLeagueMatch(t, matchdayIdx, matchIdx, adjustedTeams(getTeams(), t))
    if (allLeagueDone(t)) t.winnerId = getLeagueWinner(t)
  }

  function simLeagueMatchday(tournamentId: string, matchdayIdx: number) {
    const t = getT(tournamentId)
    if (!t) return
    simulateLeagueMatchday(t, matchdayIdx, adjustedTeams(getTeams(), t))
    if (allLeagueDone(t)) t.winnerId = getLeagueWinner(t)
  }

  function simAllLeague(tournamentId: string) {
    const t = getT(tournamentId)
    if (!t) return
    simulateAllLeague(t, adjustedTeams(getTeams(), t))
    if (allLeagueDone(t)) t.winnerId = getLeagueWinner(t)
  }

  // ── Multi-tier ───────────────────────────────────────────────────

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
    if (allTiersDone(t)) t.winnerId = getTiersWinner(t)
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
    if (allTiersDone(t)) t.winnerId = getTiersWinner(t)
  }

  function simTierMatchday(tournamentId: string, tierIdx: number, matchdayIdx: number) {
    const t = getT(tournamentId)
    if (!t) return
    simulateTierMatchday(t, tierIdx, matchdayIdx, adjustedTeams(getTeams(), t))
    if (allTiersDone(t)) t.winnerId = getTiersWinner(t)
  }

  function simAllTierAction(tournamentId: string, tierIdx: number) {
    const t = getT(tournamentId)
    if (!t) return
    simulateAllTier(t, tierIdx, adjustedTeams(getTeams(), t))
    if (allTiersDone(t)) t.winnerId = getTiersWinner(t)
  }

  function simAllTiersAction(tournamentId: string) {
    const t = getT(tournamentId)
    if (!t) return
    simulateAllTiers(t, adjustedTeams(getTeams(), t))
    if (allTiersDone(t)) t.winnerId = getTiersWinner(t)
  }

  return {
    setLeagueResult,
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
