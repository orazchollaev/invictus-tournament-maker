import type { Ref } from "vue"
import type { Tournament, LegMode, PlayoffSeedMode, DrawType, Tiebreaker } from "../types"
import type { Team } from "@/modules/teams/types"
import {
  createTournament,
  createLeague,
  uid,
  updateThirdPlaceSlots,
  recalcStandings,
  recalcLeagueStandings,
} from "@/engine"

function deriveDrawType(seeded: boolean, orderedIds?: string[]): DrawType {
  if (orderedIds) return "manual"
  return seeded ? "seeded" : "random"
}

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
    qualifiersPerGroup?: number,
    wildcardCount?: number,
    groupLegMode: LegMode = "single",
    knockoutLegMode: LegMode = "single",
    finalLegMode: LegMode = "single",
    tiebreaker?: Tiebreaker
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
      qualifiersPerGroup,
      wildcardCount ?? 0,
      groupLegMode,
      knockoutLegMode,
      finalLegMode
    )
    t.drawType = deriveDrawType(seeded, orderedIds)
    if (tiebreaker) t.tiebreaker = tiebreaker
    tournaments.value.push(t)
    active.value = t.id
    return t.id
  }

  function createLeagueTournament(
    name: string,
    teamIds: string[],
    legMode: LegMode = "single",
    tiebreaker?: Tiebreaker
  ): string {
    const allTeams = getTeams()
    const selected = allTeams.filter((t) => teamIds.includes(t.id))
    const season =
      tournaments.value
        .filter((t) => t.name === name)
        .reduce((max, t) => Math.max(max, t.season), 0) + 1
    const t = createLeague(name, selected, season, legMode)
    if (tiebreaker) t.tiebreaker = tiebreaker
    tournaments.value.push(t)
    active.value = t.id
    return t.id
  }

  function newSeason(
    id: string,
    seeded = false,
    orderedIds?: string[],
    groupCount?: number,
    withThirdPlace?: boolean,
    playoffSeedMode?: PlayoffSeedMode
  ): string | undefined {
    const t = tournaments.value.find((t) => t.id === id)
    if (!t || !t.winnerId) return
    const allTeams = getTeams()
    const selected = allTeams.filter((tm) => t.teamIds.includes(tm.id))
    const season =
      tournaments.value
        .filter((tr) => tr.name === t.name)
        .reduce((max, tr) => Math.max(max, tr.season), 0) + 1

    // League new season
    if (t.format === "league") {
      const newT = createLeague(t.name, selected, season, t.league?.legMode ?? "single")
      tournaments.value.push(newT)
      active.value = newT.id
      return newT.id
    }

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
      effectiveQpg,
      t.wildcardCount ?? 0,
      t.groupLegMode ?? "single",
      t.knockoutLegMode ?? "single",
      t.finalLegMode ?? "single"
    )
    newT.drawType = deriveDrawType(seeded, orderedIds)
    if (playoffSeedMode) newT.playoffSeedMode = playoffSeedMode
    else if (t.playoffSeedMode) newT.playoffSeedMode = t.playoffSeedMode
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
    if (t.format === "league" && t.league) {
      for (const matchday of t.league.matchdays) {
        matchday.matches.forEach((m) => (m.result = null))
      }
      recalcLeagueStandings(t.league, t.tiebreaker)
      t.winnerId = null
      return
    }
    if (t.groups) {
      for (const group of t.groups) {
        group.matches.forEach((m) => (m.result = null))
        recalcStandings(group, t.tiebreaker)
      }
      t.groupsDone = false
    }
    for (let r = 0; r < t.rounds.length; r++) {
      for (const match of t.rounds[r].matches) {
        match.result = null
        if (match.leg2Result !== undefined) match.leg2Result = null
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
    if (t.format === "league") return !!t.winnerId
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
        if (match.leg2Result !== undefined && match.leg2Result === null) return false
      }
    }
    if (t.thirdPlaceMatch) {
      const m = t.thirdPlaceMatch
      if (m.homeId && m.awayId && !m.result) return false
    }
    return true && !!t.winnerId
  }

  return {
    create,
    createLeagueTournament,
    newSeason,
    remove,
    getById,
    resetResults,
    isTournamentFinished,
  }
}
