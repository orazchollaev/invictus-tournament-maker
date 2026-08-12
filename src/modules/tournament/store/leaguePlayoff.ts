import type { Ref } from "vue"
import type { Tournament, LeaguePlayoffSeedMode, LegMode } from "../types"
import type { Team } from "@/modules/teams/types"
import {
  getLeaguePlayoffData,
  setLeaguePlayoffData,
  canStartLeaguePlayoff,
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
      qualifierCount: number
      seedMode: LeaguePlayoffSeedMode
    }
  ) {
    const t = getT(tournamentId)
    if (!t) return
    const existing = getLeaguePlayoffData(t)
    if (existing?.started) return

    const teamCount = (t.tiers?.length ? t.tiers[0].teamIds.length : t.teamIds.length) || 1
    const qualifierCount = Math.max(2, Math.min(teamCount, Math.round(settings.qualifierCount)))

    setLeaguePlayoffData(t, {
      enabled: settings.enabled,
      qualifierCount,
      seedMode: settings.seedMode,
      started: false,
    })
  }

  // Playoff bracket leg modes live on the tournament itself (same fields the
  // bracket/group formats use) but must never trigger draw.ts's rebuildDraw —
  // that wipes league standings. Locked once the bracket is seeded.
  function setLeaguePlayoffLegModes(
    tournamentId: string,
    knockoutLegMode: LegMode,
    finalLegMode: LegMode
  ) {
    const t = getT(tournamentId)
    if (!t) return
    const existing = getLeaguePlayoffData(t)
    if (existing?.started) return
    t.knockoutLegMode = knockoutLegMode
    t.finalLegMode = finalLegMode
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
    setLeaguePlayoffLegModes,
    startLeaguePlayoffBracket,
    canStartPlayoff,
  }
}
