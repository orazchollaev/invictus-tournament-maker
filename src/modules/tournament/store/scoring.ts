import type { Ref } from "vue"
import type { Tournament, Tiebreaker } from "../types"
import {
  recalcStandings,
  recalcLeagueStandings,
  allLeagueDone,
  getLeagueWinner,
  allTiersDone,
  isLeagueLike,
  getTiersWinner,
  getLeaguePlayoffData,
} from "@/engine"
import { makeWithTournament } from "./helpers"

/**
 * Recompute every standings table in a tournament, then refresh the
 * champion.
 *
 * This cascade was copy-pasted into three actions, and only one of them
 * (setPointsConfig) also refreshed `winnerId`. So changing the tiebreaker
 * or a points adjustment could reorder a finished table and leave the old
 * champion recorded. One function, one behaviour.
 */
export function recalcAllStandings(t: Tournament) {
  const winPts = t.winPoints ?? 3
  const drawPts = t.drawPoints ?? 1
  const lossPts = t.lossPoints ?? 0
  const adj = t.teamPointAdjustments

  if (isLeagueLike(t)) {
    if (t.tiers?.length) {
      t.tiers.forEach((tier) =>
        recalcLeagueStandings(tier.league, t.tiebreaker, winPts, drawPts, lossPts, adj)
      )
      if (allTiersDone(t) && !getLeaguePlayoffData(t)?.enabled) {
        t.winnerId = getTiersWinner(t)
      }
    } else if (t.league) {
      recalcLeagueStandings(t.league, t.tiebreaker, winPts, drawPts, lossPts, adj)
      if (allLeagueDone(t) && !getLeaguePlayoffData(t)?.enabled) {
        t.winnerId = getLeagueWinner(t)
      }
    }
  } else if (t.groups) {
    t.groups.forEach((g) => recalcStandings(g, t.tiebreaker, winPts, drawPts, lossPts, adj))
  }
}

export function useScoringActions(tournaments: Ref<Tournament[]>) {
  const withTournament = makeWithTournament(tournaments)

  function setTiebreaker(tournamentId: string, tiebreaker: Tiebreaker) {
    withTournament(tournamentId, (t) => {
      t.tiebreaker = tiebreaker
      recalcAllStandings(t)
    })
  }

  function setPointsConfig(
    tournamentId: string,
    winPoints: number,
    drawPoints: number,
    lossPoints: number
  ) {
    withTournament(tournamentId, (t) => {
      t.winPoints = winPoints
      t.drawPoints = drawPoints
      t.lossPoints = lossPoints
      recalcAllStandings(t)
    })
  }

  function setTeamPointAdjustment(tournamentId: string, teamId: string, value: number) {
    withTournament(tournamentId, (t) => {
      if (!t.teamPointAdjustments) t.teamPointAdjustments = {}
      if (value === 0) {
        delete t.teamPointAdjustments[teamId]
      } else {
        t.teamPointAdjustments[teamId] = value
      }
      recalcAllStandings(t)
    })
  }

  /** Power deltas feed simulation, not standings — nothing to recalc. */
  function setTeamPowerAdjustment(tournamentId: string, teamId: string, value: number) {
    withTournament(tournamentId, (t) => {
      if (!t.teamPowerAdjustments) t.teamPowerAdjustments = {}
      if (value === 0) {
        delete t.teamPowerAdjustments[teamId]
      } else {
        t.teamPowerAdjustments[teamId] = value
      }
    })
  }

  return { setTiebreaker, setPointsConfig, setTeamPointAdjustment, setTeamPowerAdjustment }
}
