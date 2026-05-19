// modules/tournament/store.ts
import { defineStore } from "pinia"
import { ref } from "vue"
import type { Tournament } from "./types"
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
} from "@/engine/logic"
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
    seedBracketFromGroups(t, getTeams())
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
  }
})
