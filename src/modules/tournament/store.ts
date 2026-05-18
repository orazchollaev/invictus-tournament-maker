import { defineStore } from "pinia"
import { ref } from "vue"
import type { Tournament } from "./types"
import {
  createTournament,
  propagateWinners,
  simulateMatch,
  simulatePenaltyShootout,
  getWinnerId,
} from "@/engine/logic"
import { useTeamsStore } from "../teams/store"

export const useTournamentStore = defineStore("tournament", () => {
  const tournaments = ref<Tournament[]>([])
  const active = ref<string | null>(null)

  function getTeams() {
    return useTeamsStore().teams
  }

  function create(name: string, teamIds: string[], seeded = false, orderedIds?: string[]) {
    const allTeams = getTeams()
    const selected = allTeams.filter((t) => teamIds.includes(t.id))
    const season =
      tournaments.value
        .filter((t) => t.name === name)
        .reduce((max, t) => Math.max(max, t.season), 0) + 1
    const ordered = orderedIds
      ? orderedIds.map((id) => allTeams.find((t) => t.id === id)).filter(Boolean)
      : undefined
    const t = createTournament(name, selected, season, seeded, ordered as any)
    tournaments.value.push(t)
    active.value = t.id
    return t.id
  }

  function newSeason(id: string, seeded = false, orderedIds?: string[]): string | undefined {
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
    const newT = createTournament(t.name, selected, season, seeded, ordered as any)
    tournaments.value.push(newT)
    active.value = newT.id
    return newT.id
  }

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
    // Clear downstream slots that will now change
    clearDownstream(t, roundIdx, matchIdx)
    propagateWinners(t.rounds, getTeams())
    // Check if tournament is over
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

  function simulateAll(tournamentId: string) {
    const t = tournaments.value.find((t) => t.id === tournamentId)
    if (!t) return
    const allTeams = getTeams()
    for (let r = 0; r < t.rounds.length; r++) {
      propagateWinners(t.rounds, allTeams)
      t.rounds[r].matches.forEach((match, _mi) => {
        if (!match.result && match.homeId && match.awayId) {
          const result = simulateMatch(match, allTeams)
          if (result.home === result.away) {
            match.result = { ...result, ...simulatePenaltyShootout(match, allTeams) }
          } else {
            match.result = result
          }
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
        if (result.home === result.away) {
          match.result = { ...result, ...simulatePenaltyShootout(match, allTeams) }
        } else {
          match.result = result
        }
      }
    })
    propagateWinners(t.rounds, allTeams)
    const final = t.rounds[t.rounds.length - 1].matches[0]
    t.winnerId = getWinnerId(final)
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

    for (let r = 0; r < t.rounds.length; r++) {
      const round = t.rounds[r]

      for (const match of round.matches) {
        // 🟢 First round: only reset score
        if (r === 0) {
          match.result = null
        }
        // 🔴 Later rounds: reset everything (they depend on winners)
        else {
          match.result = null
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
    remove,
    getById,
    resetResults,
  }
})
