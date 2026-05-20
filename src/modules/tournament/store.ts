// modules/tournament/store.ts
import { defineStore } from "pinia"
import { ref } from "vue"
import type { Tournament, PlayoffSeedMode } from "./types"
import {
  createTournament,
  propagateWinners,
  simulateMatch,
  simulatePenaltyShootout,
  getWinnerId,
  setGroupMatchResult,
  simulateGroupMatch,
  simulateGroup,
  simulateAllGroups,
  allGroupsDone,
  seedBracketFromGroups,
  recalcStandings,
} from "@/engine"
import { useTeamsStore } from "../teams/store"

export const useTournamentStore = defineStore("tournament", () => {
  const tournaments = ref<Tournament[]>([])
  const active = ref<string | null>(null)

  function getTeams() {
    return useTeamsStore().teams
  }

  // ─── Create ────────────────────────────────────────────────────
  function create(
    name: string,
    teamIds: string[],
    seeded = false,
    orderedIds?: string[],
    groupCount?: number
  ) {
    const allTeams = getTeams()
    const selected = allTeams.filter((t) => teamIds.includes(t.id))
    const season =
      tournaments.value
        .filter((t) => t.name === name)
        .reduce((max, t) => Math.max(max, t.season), 0) + 1
    const ordered = orderedIds
      ? orderedIds.map((id) => allTeams.find((t) => t.id === id)).filter(Boolean)
      : undefined
    const t = createTournament(name, selected, season, seeded, ordered as any, groupCount)
    tournaments.value.push(t)
    active.value = t.id
    return t.id
  }

  // ─── New season ────────────────────────────────────────────────
  function newSeason(
    id: string,
    seeded = false,
    orderedIds?: string[],
    groupCount?: number
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
      ? orderedIds.map((oid) => allTeams.find((tm) => tm.id === oid)).filter(Boolean)
      : undefined
    const effectiveGroupCount =
      groupCount ?? (t.format === "group+bracket" ? t.groups?.length : undefined)
    const newT = createTournament(
      t.name,
      selected,
      season,
      seeded,
      ordered as any,
      effectiveGroupCount
    )
    tournaments.value.push(newT)
    active.value = newT.id
    return newT.id
  }

  // ─── Bracket result ────────────────────────────────────────────
  function setResult(
    tournamentId: string,
    roundIdx: number,
    matchIdx: number,
    home: number,
    away: number,
    penHome?: number,
    penAway?: number
  ) {
    const t = tournaments.value.find((t) => t.id === tournamentId)
    if (!t) return
    const match = t.rounds[roundIdx].matches[matchIdx]
    match.result = {
      home,
      away,
      ...(penHome !== undefined && penAway !== undefined ? { penHome, penAway } : {}),
    }
    clearDownstream(t, roundIdx, matchIdx)
    propagateWinners(t.rounds, getTeams())
    const final = t.rounds[t.rounds.length - 1].matches[0]
    t.winnerId = getWinnerId(final)
  }

  function clearDownstream(t: Tournament, fromRound: number, fromMatch: number) {
    let matchIdx = fromMatch
    for (let r = fromRound + 1; r < t.rounds.length; r++) {
      matchIdx = Math.floor(matchIdx / 2)
      const m = t.rounds[r].matches[matchIdx]
      m.homeId = null
      m.awayId = null
      m.result = null
    }
  }

  // ─── Bracket simulation ────────────────────────────────────────
  function simulateAll(tournamentId: string) {
    const t = tournaments.value.find((t) => t.id === tournamentId)
    if (!t) return
    const allTeams = getTeams()
    for (let r = 0; r < t.rounds.length; r++) {
      propagateWinners(t.rounds, allTeams)
      t.rounds[r].matches.forEach((match) => {
        if (!match.result && match.homeId && match.awayId) {
          const result = simulateMatch(match, allTeams)
          match.result =
            result.home === result.away
              ? { ...result, ...simulatePenaltyShootout(match, allTeams) }
              : result
        }
      })
    }
    propagateWinners(t.rounds, allTeams)
    const final = t.rounds[t.rounds.length - 1].matches[0]
    t.winnerId = getWinnerId(final)
  }

  function simulateRound(tournamentId: string, roundIdx: number) {
    const t = tournaments.value.find((t) => t.id === tournamentId)
    if (!t) return
    const allTeams = getTeams()
    propagateWinners(t.rounds, allTeams)
    t.rounds[roundIdx].matches.forEach((match) => {
      if (!match.result && match.homeId && match.awayId) {
        const result = simulateMatch(match, allTeams)
        match.result =
          result.home === result.away
            ? { ...result, ...simulatePenaltyShootout(match, allTeams) }
            : result
      }
    })
    propagateWinners(t.rounds, allTeams)
    const final = t.rounds[t.rounds.length - 1].matches[0]
    t.winnerId = getWinnerId(final)
  }

  // ─── Group stage actions ───────────────────────────────────────
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

  // ─── Misc ──────────────────────────────────────────────────────
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

    // Reset group stage
    if (t.groups) {
      for (const group of t.groups) {
        group.matches.forEach((m) => (m.result = null))
        recalcStandings(group)
      }
      t.groupsDone = false
    }

    // Reset bracket
    for (let r = 0; r < t.rounds.length; r++) {
      for (const match of t.rounds[r].matches) {
        match.result = null
        if (r > 0 || t.format === "group+bracket") {
          match.homeId = null
          match.awayId = null
        }
      }
    }

    t.winnerId = null
  }

  // ─── Settings actions ──────────────────────────────────────────

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
        // Exclude auto-resolved byes (one side is null)
        if (match.result && match.homeId && match.awayId) return true
      }
    }
    return false
  }

  function rebuildDraw(t: Tournament, seeded = false, orderedIds?: string[]) {
    const allTeams = getTeams()
    const selected = allTeams.filter((tm) => t.teamIds.includes(tm.id))
    const groupCount =
      t.format === "group+bracket"
        ? Math.min(t.groups?.length ?? 2, Math.floor(selected.length / 2))
        : undefined
    const ordered = orderedIds
      ? (orderedIds.map((id) => allTeams.find((tm) => tm.id === id)).filter(Boolean) as any)
      : undefined
    const fresh = createTournament(t.name, selected, t.season, seeded, ordered, groupCount)
    t.rounds = fresh.rounds
    t.winnerId = null
    if (fresh.groups) {
      t.groups = fresh.groups
      t.groupsDone = false
    }
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
    tournaments,
    active,
    create,
    newSeason,
    setResult,
    simulateAll,
    simulateRound,
    setGroupResult,
    simGroupMatch,
    simGroup,
    simAllGroups,
    advanceToBracket,
    isGroupsDone,
    remove,
    getById,
    resetResults,
    hasAnyResults,
    addTeamToTournament,
    removeTeamFromTournament,
    redrawTournament,
    setPlayoffSeedMode,
  }
})
