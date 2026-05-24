import type { Ref } from "vue"
import type { Tournament, PlayoffSeedMode, LegMode } from "../types"
import type { Team } from "@/modules/teams/types"
import { createTournament } from "@/engine"

export function useDrawActions(tournaments: Ref<Tournament[]>, getTeams: () => Team[]) {
  function hasAnyResults(tournamentId: string): boolean {
    const t = tournaments.value.find((t) => t.id === tournamentId)
    if (!t) return false
    if (t.groups) {
      for (const g of t.groups) {
        if (g.matches.some((m) => m.result !== null)) return true
      }
    }
    for (const round of t.rounds) {
      for (const match of round.matches) {
        if (match.result && match.homeId && match.awayId) return true
      }
    }
    return false
  }

  function rebuildDraw(
    t: Tournament,
    seeded = false,
    orderedIds?: string[],
    groupCount?: number,
    qualifiersPerGroup?: number
  ) {
    const allTeams = getTeams()
    const selected = allTeams.filter((tm) => t.teamIds.includes(tm.id))
    const resolvedGroupCount =
      t.format === "group+bracket"
        ? Math.min(groupCount ?? t.groups?.length ?? 2, Math.floor(selected.length / 2))
        : undefined
    const resolvedQpg =
      t.format === "group+bracket" ? (qualifiersPerGroup ?? t.qualifiersPerGroup ?? 2) : undefined
    const ordered = orderedIds
      ? (orderedIds.map((id) => allTeams.find((tm) => tm.id === id)).filter(Boolean) as Team[])
      : undefined
    const fresh = createTournament(
      t.name,
      selected,
      t.season,
      seeded,
      ordered,
      resolvedGroupCount,
      resolvedQpg,
      t.groupLegMode ?? "single",
      t.knockoutLegMode ?? "single",
      t.finalLegMode ?? "single"
    )
    t.rounds = fresh.rounds
    t.winnerId = null
    if (fresh.groups) {
      t.groups = fresh.groups
      t.groupsDone = false
      t.qualifiersPerGroup = fresh.qualifiersPerGroup
    }
  }

  function setLegMode(tournamentId: string, stage: "group" | "knockout" | "final", mode: LegMode) {
    const t = tournaments.value.find((t) => t.id === tournamentId)
    if (!t || hasAnyResults(tournamentId)) return
    if (stage === "group") t.groupLegMode = mode
    else if (stage === "knockout") t.knockoutLegMode = mode
    else t.finalLegMode = mode
    rebuildDraw(t)
  }

  function changeGroupCount(tournamentId: string, count: number) {
    const t = tournaments.value.find((t) => t.id === tournamentId)
    if (!t || t.format !== "group+bracket" || hasAnyResults(tournamentId)) return
    const max = Math.floor(t.teamIds.length / 2)
    const clamped = Math.max(2, Math.min(count, max))
    const minGroupSize = Math.floor(t.teamIds.length / clamped)
    const clampedQpg = Math.max(1, Math.min(t.qualifiersPerGroup ?? 2, minGroupSize))
    rebuildDraw(t, false, undefined, clamped, clampedQpg)
  }

  function changeQualifiersPerGroup(tournamentId: string, qpg: number) {
    const t = tournaments.value.find((t) => t.id === tournamentId)
    if (!t || t.format !== "group+bracket" || hasAnyResults(tournamentId)) return
    const gc = t.groups?.length ?? 2
    const minGroupSize = Math.floor(t.teamIds.length / gc)
    const clamped = Math.max(1, Math.min(qpg, minGroupSize))
    rebuildDraw(t, false, undefined, gc, clamped)
  }

  function addTeamToTournament(tournamentId: string, teamId: string) {
    const t = tournaments.value.find((t) => t.id === tournamentId)
    if (!t || hasAnyResults(tournamentId)) return
    if (t.teamIds.includes(teamId)) return
    t.teamIds = [...t.teamIds, teamId]
    rebuildDraw(t)
  }

  function removeTeamFromTournament(tournamentId: string, teamId: string) {
    const t = tournaments.value.find((t) => t.id === tournamentId)
    if (!t || hasAnyResults(tournamentId)) return
    if (t.teamIds.length <= 2) return
    t.teamIds = t.teamIds.filter((id) => id !== teamId)
    rebuildDraw(t)
  }

  function redrawTournament(tournamentId: string, seeded = false, orderedIds?: string[]) {
    const t = tournaments.value.find((t) => t.id === tournamentId)
    if (!t || hasAnyResults(tournamentId)) return
    rebuildDraw(t, seeded, orderedIds)
  }

  function setPlayoffSeedMode(tournamentId: string, mode: PlayoffSeedMode) {
    const t = tournaments.value.find((t) => t.id === tournamentId)
    if (!t) return
    t.playoffSeedMode = mode
  }

  return {
    hasAnyResults,
    setLegMode,
    changeGroupCount,
    changeQualifiersPerGroup,
    addTeamToTournament,
    removeTeamFromTournament,
    redrawTournament,
    setPlayoffSeedMode,
  }
}
