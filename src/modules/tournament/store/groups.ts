import type { Ref } from "vue"
import type { Tournament } from "../types"
import type { Team } from "@/modules/teams/types"
import {
  setGroupMatchResult,
  simulateGroupMatch,
  simulateGroup,
  simulateGroupWeek,
  simulateAllGroups,
  simulateWeek,
  allGroupsDone,
  seedBracketFromGroups,
} from "@/engine"

function adjustedTeams(teams: Team[], t: Tournament): Team[] {
  const adj = t.teamPowerAdjustments
  if (!adj || Object.keys(adj).length === 0) return teams
  return teams.map((team) => {
    const delta = adj[team.id] ?? 0
    return delta === 0 ? team : { ...team, power: Math.max(1, Math.min(100, team.power + delta)) }
  })
}

export function useGroupActions(tournaments: Ref<Tournament[]>, getTeams: () => Team[]) {
  function setGroupResult(
    tournamentId: string,
    groupIdx: number,
    matchIdx: number,
    home: number,
    away: number
  ) {
    const t = tournaments.value.find((t) => t.id === tournamentId)
    if (!t) return
    setGroupMatchResult(t, groupIdx, matchIdx, home, away)
  }

  function simGroupMatch(tournamentId: string, groupIdx: number, matchIdx: number) {
    const t = tournaments.value.find((t) => t.id === tournamentId)
    if (!t) return
    simulateGroupMatch(t, groupIdx, matchIdx, adjustedTeams(getTeams(), t))
  }

  function simGroup(tournamentId: string, groupIdx: number) {
    const t = tournaments.value.find((t) => t.id === tournamentId)
    if (!t) return
    simulateGroup(t, groupIdx, adjustedTeams(getTeams(), t))
  }

  function simAllGroups(tournamentId: string) {
    const t = tournaments.value.find((t) => t.id === tournamentId)
    if (!t) return
    simulateAllGroups(t, adjustedTeams(getTeams(), t))
  }

  function simGroupWeek(tournamentId: string, groupIdx: number): number {
    const t = tournaments.value.find((t) => t.id === tournamentId)
    if (!t) return -1
    return simulateGroupWeek(t, groupIdx, adjustedTeams(getTeams(), t))
  }

  function simWeek(tournamentId: string): number {
    const t = tournaments.value.find((t) => t.id === tournamentId)
    if (!t) return -1
    return simulateWeek(t, adjustedTeams(getTeams(), t))
  }

  function advanceToBracket(tournamentId: string) {
    const t = tournaments.value.find((t) => t.id === tournamentId)
    if (!t || !t.groups) return
    if (!allGroupsDone(t)) return
    seedBracketFromGroups(t, getTeams(), t.playoffSeedMode ?? "cross")
  }

  function advanceToBracketManual(tournamentId: string, orderedIds: string[]) {
    const t = tournaments.value.find((t) => t.id === tournamentId)
    if (!t || !t.groups) return
    if (!allGroupsDone(t)) return
    seedBracketFromGroups(t, getTeams(), "manual", orderedIds)
  }

  function isGroupsDone(tournamentId: string): boolean {
    const t = tournaments.value.find((t) => t.id === tournamentId)
    if (!t) return false
    return allGroupsDone(t)
  }

  return {
    setGroupResult,
    simGroupMatch,
    simGroup,
    simGroupWeek,
    simAllGroups,
    simWeek,
    advanceToBracket,
    advanceToBracketManual,
    isGroupsDone,
  }
}
