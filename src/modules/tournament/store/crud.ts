import type { Ref } from "vue"
import type { Tournament } from "../types"
import type { Team } from "@/modules/teams/types"
import { createTournament, uid, updateThirdPlaceSlots, recalcStandings } from "@/engine"

export function useCrudActions(
  tournaments: Ref<Tournament[]>,
  active: Ref<string | null>,
  getTeams: () => Team[]
) {
  function create(
    name: string,
    teamIds: string[],
    seeded = false,
    orderedIds?: string[],
    groupCount?: number,
    qualifiersPerGroup?: number
  ): string {
    const allTeams = getTeams()
    const selected = allTeams.filter((t) => teamIds.includes(t.id))
    const season =
      tournaments.value
        .filter((t) => t.name === name)
        .reduce((max, t) => Math.max(max, t.season), 0) + 1
    const ordered = orderedIds
      ? (orderedIds.map((id) => allTeams.find((t) => t.id === id)).filter(Boolean) as Team[])
      : undefined
    const t = createTournament(
      name,
      selected,
      season,
      seeded,
      ordered,
      groupCount,
      qualifiersPerGroup
    )
    tournaments.value.push(t)
    active.value = t.id
    return t.id
  }

  function newSeason(
    id: string,
    seeded = false,
    orderedIds?: string[],
    groupCount?: number,
    withThirdPlace?: boolean
  ): string | undefined {
    const t = tournaments.value.find((t) => t.id === id)
    if (!t || !t.winnerId) return
    const allTeams = getTeams()
    const selected = allTeams.filter((tm) => t.teamIds.includes(tm.id))
    const season =
      tournaments.value
        .filter((tr) => tr.name === t.name)
        .reduce((max, tr) => Math.max(max, tr.season), 0) + 1
    const ordered = orderedIds
      ? (orderedIds.map((oid) => allTeams.find((tm) => tm.id === oid)).filter(Boolean) as Team[])
      : undefined
    const effectiveGroupCount =
      groupCount ?? (t.format === "group+bracket" ? t.groups?.length : undefined)
    const effectiveQpg = t.format === "group+bracket" ? (t.qualifiersPerGroup ?? 2) : undefined
    const newT = createTournament(
      t.name,
      selected,
      season,
      seeded,
      ordered,
      effectiveGroupCount,
      effectiveQpg
    )
    if (t.playoffSeedMode) newT.playoffSeedMode = t.playoffSeedMode
    if (withThirdPlace && newT.rounds.length >= 2) {
      newT.hasThirdPlace = true
      newT.thirdPlaceMatch = { id: uid(), homeId: null, awayId: null, result: null }
      updateThirdPlaceSlots(newT)
    }
    tournaments.value.push(newT)
    active.value = newT.id
    return newT.id
  }

  function remove(id: string) {
    tournaments.value = tournaments.value.filter((t) => t.id !== id)
    if (active.value === id) active.value = tournaments.value[0]?.id ?? null
  }

  function getById(id: string) {
    return tournaments.value.find((t) => t.id === id)
  }

  function resetResults(tournamentId: string) {
    const t = tournaments.value.find((t) => t.id === tournamentId)
    if (!t) return
    if (t.groups) {
      for (const group of t.groups) {
        group.matches.forEach((m) => (m.result = null))
        recalcStandings(group)
      }
      t.groupsDone = false
    }
    for (let r = 0; r < t.rounds.length; r++) {
      for (const match of t.rounds[r].matches) {
        match.result = null
        if (r > 0 || t.format === "group+bracket") {
          match.homeId = null
          match.awayId = null
        }
      }
    }
    if (t.thirdPlaceMatch) {
      t.thirdPlaceMatch.homeId = null
      t.thirdPlaceMatch.awayId = null
      t.thirdPlaceMatch.result = null
    }
    t.winnerId = null
  }

  function isTournamentFinished(tournamentId: string): boolean {
    const t = tournaments.value.find((t) => t.id === tournamentId)
    if (!t) return false
    if (t.groups) {
      for (const group of t.groups) {
        for (const match of group.matches) {
          if (!match.result) return false
        }
      }
    }
    for (const round of t.rounds) {
      for (const match of round.matches) {
        if (!match.homeId || !match.awayId) continue
        if (!match.result) return false
      }
    }
    if (t.thirdPlaceMatch) {
      const m = t.thirdPlaceMatch
      if (m.homeId && m.awayId && !m.result) return false
    }
    return true
  }

  return { create, newSeason, remove, getById, resetResults, isTournamentFinished }
}
