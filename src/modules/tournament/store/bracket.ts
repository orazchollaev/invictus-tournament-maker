import type { Ref } from "vue"
import type { Tournament } from "../types"
import type { Team } from "@/modules/teams/types"
import {
  propagateWinners,
  getWinnerId,
  updateThirdPlaceSlots,
  simulateMatch,
  simulatePenaltyShootout,
} from "@/engine"

export function useBracketActions(
  tournaments: Ref<Tournament[]>,
  getTeams: () => Team[],
  simulateThirdPlace: (tournamentId: string) => void
) {
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
    if (t.thirdPlaceMatch && roundIdx === t.rounds.length - 2) {
      t.thirdPlaceMatch.result = null
    }
    propagateWinners(t.rounds, getTeams())
    updateThirdPlaceSlots(t)
    const final = t.rounds[t.rounds.length - 1].matches[0]
    t.winnerId = getWinnerId(final)
  }

  function simulateBracketMatch(tournamentId: string, ri: number, mi: number) {
    const t = tournaments.value.find((t) => t.id === tournamentId)
    if (!t) return
    const match = t.rounds[ri].matches[mi]
    if (!match.homeId || !match.awayId) return
    const allTeams = getTeams()
    const result = simulateMatch(match, allTeams)
    if (result.home === result.away) {
      const pen = simulatePenaltyShootout(match, allTeams)
      setResult(tournamentId, ri, mi, result.home, result.away, pen.penHome, pen.penAway)
    } else {
      setResult(tournamentId, ri, mi, result.home, result.away)
    }
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
    updateThirdPlaceSlots(t)
    const final = t.rounds[t.rounds.length - 1].matches[0]
    t.winnerId = getWinnerId(final)
  }

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
    updateThirdPlaceSlots(t)
    simulateThirdPlace(tournamentId)
    const final = t.rounds[t.rounds.length - 1].matches[0]
    t.winnerId = getWinnerId(final)
  }

  return { setResult, simulateBracketMatch, simulateRound, simulateAll }
}
