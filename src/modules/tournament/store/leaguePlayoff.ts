import type { Ref } from "vue"
import type { Tournament, LeaguePlayoffSeedMode } from "../types"
import type { Team } from "@/modules/teams/types"
import {
  getLeaguePlayoffData,
  setLeaguePlayoffData,
  canStartLeaguePlayoff,
  startLeaguePlayIn as engineStartLeaguePlayIn,
  setLeaguePlayInResult as engineSetLeaguePlayInResult,
  seedLeaguePlayoffBracket,
} from "@/engine"

export function useLeaguePlayoffActions(tournaments: Ref<Tournament[]>, getTeams: () => Team[]) {
  function getT(id: string) {
    return tournaments.value.find((t) => t.id === id)
  }

  function changeLeaguePlayoffSettings(
    tournamentId: string,
    settings: {
      enabled: boolean
      directCount: number
      playInTeamCount: number
      seedMode: LeaguePlayoffSeedMode
    }
  ) {
    const t = getT(tournamentId)
    if (!t) return
    const existing = getLeaguePlayoffData(t)
    if (existing?.started) return

    const teamCount = (t.tiers?.length ? t.tiers[0].teamIds.length : t.teamIds.length) || 1
    const directCount = Math.max(2, Math.min(teamCount, Math.round(settings.directCount)))
    const maxPlayIn = Math.max(0, teamCount - directCount)
    const playInTeamCount = Math.max(
      0,
      Math.min(maxPlayIn, Math.floor(settings.playInTeamCount / 2) * 2)
    )

    setLeaguePlayoffData(t, {
      enabled: settings.enabled,
      directCount,
      playInTeamCount,
      seedMode: settings.seedMode,
      started: false,
    })
  }

  function startLeaguePlayIn(tournamentId: string, mode: LeaguePlayoffSeedMode) {
    const t = getT(tournamentId)
    if (!t) return
    engineStartLeaguePlayIn(t, getTeams(), mode)
  }

  function setLeaguePlayInResult(
    tournamentId: string,
    matchIdx: number,
    home: number,
    away: number
  ) {
    const t = getT(tournamentId)
    if (!t) return
    engineSetLeaguePlayInResult(t, matchIdx, home, away)
  }

  function startLeaguePlayoffBracket(
    tournamentId: string,
    mode: LeaguePlayoffSeedMode,
    orderedTeamIds?: string[]
  ) {
    const t = getT(tournamentId)
    if (!t) return
    seedLeaguePlayoffBracket(t, getTeams(), mode, orderedTeamIds)
  }

  function canStartPlayoff(tournamentId: string): boolean {
    const t = getT(tournamentId)
    if (!t) return false
    return canStartLeaguePlayoff(t)
  }

  return {
    changeLeaguePlayoffSettings,
    startLeaguePlayIn,
    setLeaguePlayInResult,
    startLeaguePlayoffBracket,
    canStartPlayoff,
  }
}
