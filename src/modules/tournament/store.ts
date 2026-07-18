// modules/tournament/store.ts
import { defineStore } from "pinia"
import { ref } from "vue"
import type { Tournament, Tiebreaker, LegMode } from "./types"
import {
  recalcStandings,
  recalcLeagueStandings,
  createMultiTierLeague,
  allLeagueDone,
  getLeagueWinner,
  allTiersDone,
  getTiersWinner,
  getLeaguePlayoffData,
  canStartLeaguePlayoff,
  seedLeaguePlayoffBracket,
} from "@/engine"
import { useTeamsStore } from "../teams/store"
import { useCrudActions } from "./store/crud"
import { useBracketActions } from "./store/bracket"
import { useThirdPlaceActions } from "./store/third-place"
import { useGroupActions } from "./store/groups"
import { useDrawActions } from "./store/draw"
import { useLeagueActions } from "./store/league"
import { useLeaguePlayoffActions } from "./store/leaguePlayoff"

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
  const leaguePlayoff = useLeaguePlayoffActions(tournaments, getTeams)

  function setTiebreaker(tournamentId: string, tiebreaker: Tiebreaker) {
    const t = tournaments.value.find((t) => t.id === tournamentId)
    if (!t) return
    t.tiebreaker = tiebreaker
    const winPts = t.winPoints ?? 3
    const drawPts = t.drawPoints ?? 1
    const lossPts = t.lossPoints ?? 0
    if (t.format === "league") {
      if (t.tiers?.length) {
        t.tiers.forEach((tier) =>
          recalcLeagueStandings(
            tier.league,
            tiebreaker,
            winPts,
            drawPts,
            lossPts,
            t.teamPointAdjustments
          )
        )
      } else if (t.league) {
        recalcLeagueStandings(
          t.league,
          tiebreaker,
          winPts,
          drawPts,
          lossPts,
          t.teamPointAdjustments
        )
      }
    } else if (t.groups) {
      t.groups.forEach((g) =>
        recalcStandings(g, tiebreaker, winPts, drawPts, lossPts, t.teamPointAdjustments)
      )
    }
  }

  function setPointsConfig(
    tournamentId: string,
    winPoints: number,
    drawPoints: number,
    lossPoints: number
  ) {
    const t = tournaments.value.find((t) => t.id === tournamentId)
    if (!t) return
    t.winPoints = winPoints
    t.drawPoints = drawPoints
    t.lossPoints = lossPoints
    if (t.format === "league") {
      if (t.tiers?.length) {
        t.tiers.forEach((tier) =>
          recalcLeagueStandings(
            tier.league,
            t.tiebreaker,
            winPoints,
            drawPoints,
            lossPoints,
            t.teamPointAdjustments
          )
        )
        if (allTiersDone(t) && !getLeaguePlayoffData(t)?.enabled) t.winnerId = getTiersWinner(t)
      } else if (t.league) {
        recalcLeagueStandings(
          t.league,
          t.tiebreaker,
          winPoints,
          drawPoints,
          lossPoints,
          t.teamPointAdjustments
        )
        if (allLeagueDone(t) && !getLeaguePlayoffData(t)?.enabled) t.winnerId = getLeagueWinner(t)
      }
    } else if (t.groups) {
      t.groups.forEach((g) =>
        recalcStandings(g, t.tiebreaker, winPoints, drawPoints, lossPoints, t.teamPointAdjustments)
      )
    }
  }

  function setTeamPointAdjustment(tournamentId: string, teamId: string, value: number) {
    const t = tournaments.value.find((t) => t.id === tournamentId)
    if (!t) return
    if (!t.teamPointAdjustments) t.teamPointAdjustments = {}
    if (value === 0) {
      delete t.teamPointAdjustments[teamId]
    } else {
      t.teamPointAdjustments[teamId] = value
    }
    const winPts = t.winPoints ?? 3
    const drawPts = t.drawPoints ?? 1
    const lossPts = t.lossPoints ?? 0
    if (t.format === "league") {
      if (t.tiers?.length) {
        t.tiers.forEach((tier) =>
          recalcLeagueStandings(
            tier.league,
            t.tiebreaker,
            winPts,
            drawPts,
            lossPts,
            t.teamPointAdjustments
          )
        )
      } else if (t.league) {
        recalcLeagueStandings(
          t.league,
          t.tiebreaker,
          winPts,
          drawPts,
          lossPts,
          t.teamPointAdjustments
        )
      }
    } else if (t.groups) {
      t.groups.forEach((g) =>
        recalcStandings(g, t.tiebreaker, winPts, drawPts, lossPts, t.teamPointAdjustments)
      )
    }
  }

  function setTeamPowerAdjustment(tournamentId: string, teamId: string, value: number) {
    const t = tournaments.value.find((t) => t.id === tournamentId)
    if (!t) return
    if (!t.teamPowerAdjustments) t.teamPowerAdjustments = {}
    if (value === 0) {
      delete t.teamPowerAdjustments[teamId]
    } else {
      t.teamPowerAdjustments[teamId] = value
    }
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

  function simulateTournament(tournamentId: string) {
    const t = tournaments.value.find((t) => t.id === tournamentId)
    if (!t) return
    if (t.format === "league") {
      if (t.tiers?.length) {
        leagueActions.simAllTiers(tournamentId)
      } else {
        leagueActions.simAllLeague(tournamentId)
      }
      // Auto-seed the playoff bracket once the season is done (like group→bracket),
      // then play it out — so one "Simulate All" runs the whole structure.
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
      // Only seed the bracket if it hasn't been seeded yet — re-seeding would
      // rebuild rounds and wipe any knockout matches already played.
      if (!t.groupsDone) groups.advanceToBracket(tournamentId)
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
    ...leaguePlayoff,
    simulateTournament,
    setTiebreaker,
    setPointsConfig,
    createMultiTierLeagueTournament,
    setTeamPointAdjustment,
    setTeamPowerAdjustment,
  }
})
