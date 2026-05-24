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
    simulateGroupMatch(t, groupIdx, matchIdx, getTeams())
  }

  function simGroup(tournamentId: string, groupIdx: number) {
    const t = tournaments.value.find((t) => t.id === tournamentId)
    if (!t) return
    simulateGroup(t, groupIdx, getTeams())
  }

  function simAllGroups(tournamentId: string) {
    const t = tournaments.value.find((t) => t.id === tournamentId)
    if (!t) return
    simulateAllGroups(t, getTeams())
  }

  function simGroupWeek(tournamentId: string, groupIdx: number): number {
    const t = tournaments.value.find((t) => t.id === tournamentId)
    if (!t) return -1
    return simulateGroupWeek(t, groupIdx, getTeams())
  }

  function simWeek(tournamentId: string): number {
    const t = tournaments.value.find((t) => t.id === tournamentId)
    if (!t) return -1
    return simulateWeek(t, getTeams())
  }

  function advanceToBracket(tournamentId: string) {
    const t = tournaments.value.find((t) => t.id === tournamentId)
    if (!t || !t.groups) return
    if (!allGroupsDone(t)) return
    seedBracketFromGroups(t, getTeams(), t.playoffSeedMode ?? "cross")
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
    isGroupsDone,
  }
}
