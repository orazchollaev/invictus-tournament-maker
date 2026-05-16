import { defineStore } from "pinia"
import { ref } from "vue"
import type { Tournament } from "./types"
import { createTournament, propagateWinners, simulateMatch, getWinnerId } from "@/engine/logic"
import { useTeamsStore } from "../teams/store"

export const useTournamentStore = defineStore("tournament", () => {
  const tournaments = ref<Tournament[]>([])
  const active = ref<string | null>(null)

  function getTeams() {
    return useTeamsStore().teams
  }

  function create(name: string, teamIds: string[]) {
    const allTeams = getTeams()
    const selected = allTeams.filter((t) => teamIds.includes(t.id))
    const t = createTournament(name, selected)
    tournaments.value.push(t)
    active.value = t.id
    return t.id
  }

  function setResult(
    tournamentId: string,
    roundIdx: number,
    matchIdx: number,
    home: number,
    away: number
  ) {
    const t = tournaments.value.find((t) => t.id === tournamentId)
    if (!t) return
    const match = t.rounds[roundIdx].matches[matchIdx]
    match.result = { home, away }
    // Clear downstream slots that will now change
    clearDownstream(t, roundIdx, matchIdx)
    propagateWinners(t.rounds, getTeams())
    // Check if tournament is over
    const final = t.rounds[t.rounds.length - 1].matches[0]
    t.winnerId = getWinnerId(final)
  }

  function clearDownstream(t: Tournament, fromRound: number, _fromMatch: number) {
    for (let r = fromRound + 1; r < t.rounds.length; r++) {
      t.rounds[r].matches.forEach((m) => {
        m.homeId = null
        m.awayId = null
        m.result = null
      })
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
          match.result = simulateMatch(match, allTeams)
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
        match.result = simulateMatch(match, allTeams)
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

    for (const round of t.rounds) {
      for (const match of round.matches) {
        match.result = null
      }
    }

    t.winnerId = null
  }

  return {
    tournaments,
    active,
    create,
    setResult,
    simulateAll,
    simulateRound,
    remove,
    getById,
    resetResults,
  }
})
