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
      if (m.leg2Result !== undefined) m.leg2Result = null
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
    // Editing leg 1 of a double-leg match resets leg 2
    if (match.leg2Result !== undefined) {
      match.leg2Result = null
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

  function setLeg2Result(
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
    if (match.leg2Result === undefined) return // not a double-leg match
    match.leg2Result = {
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

  function simulateDoubleLegMatch(t: Tournament, ri: number, mi: number, allTeams: Team[]) {
    const match = t.rounds[ri].matches[mi]
    if (!match.homeId || !match.awayId) return
    if (!match.result) {
      match.result = simulateMatch(match, allTeams)
    }
    if (match.leg2Result === null) {
      // Leg 2: awayId plays at home
      const leg2Sim = { id: match.id, homeId: match.awayId, awayId: match.homeId }
      const r2 = simulateMatch(leg2Sim as any, allTeams)
      const aggHome = match.result.home + r2.away
      const aggAway = match.result.away + r2.home
      if (aggHome !== aggAway) {
        match.leg2Result = r2
      } else {
        // Aggregate tied → penalty. penHome = awayId pens, penAway = homeId pens
        const pen = simulatePenaltyShootout(leg2Sim as any, allTeams)
        match.leg2Result = { ...r2, penHome: pen.penHome, penAway: pen.penAway }
      }
    }
  }

  function simulateLeg1(tournamentId: string, ri: number, mi: number) {
    const t = tournaments.value.find((t) => t.id === tournamentId)
    if (!t) return
    const match = t.rounds[ri].matches[mi]
    if (!match.homeId || !match.awayId) return
    if (match.leg2Result === undefined) return
    const allTeams = getTeams()
    match.result = simulateMatch(match, allTeams)
    match.leg2Result = null
    clearDownstream(t, ri, mi)
    if (t.thirdPlaceMatch && ri === t.rounds.length - 2) t.thirdPlaceMatch.result = null
    propagateWinners(t.rounds, allTeams)
    updateThirdPlaceSlots(t)
    t.winnerId = getWinnerId(t.rounds[t.rounds.length - 1].matches[0])
  }

  function simulateLeg2(tournamentId: string, ri: number, mi: number) {
    const t = tournaments.value.find((t) => t.id === tournamentId)
    if (!t) return
    const match = t.rounds[ri].matches[mi]
    if (!match.homeId || !match.awayId || !match.result) return
    if (match.leg2Result === undefined) return
    const allTeams = getTeams()
    const leg2Sim = { id: match.id, homeId: match.awayId, awayId: match.homeId }
    const r2 = simulateMatch(leg2Sim as any, allTeams)
    const aggHome = match.result.home + r2.away
    const aggAway = match.result.away + r2.home
    if (aggHome !== aggAway) {
      match.leg2Result = r2
    } else {
      const pen = simulatePenaltyShootout(leg2Sim as any, allTeams)
      match.leg2Result = { ...r2, penHome: pen.penHome, penAway: pen.penAway }
    }
    propagateWinners(t.rounds, allTeams)
    updateThirdPlaceSlots(t)
    t.winnerId = getWinnerId(t.rounds[t.rounds.length - 1].matches[0])
  }

  function simulateBracketMatch(tournamentId: string, ri: number, mi: number) {
    const t = tournaments.value.find((t) => t.id === tournamentId)
    if (!t) return
    const match = t.rounds[ri].matches[mi]
    if (!match.homeId || !match.awayId) return
    const allTeams = getTeams()

    if (match.leg2Result !== undefined) {
      simulateDoubleLegMatch(t, ri, mi, allTeams)
      propagateWinners(t.rounds, allTeams)
      updateThirdPlaceSlots(t)
      const final = t.rounds[t.rounds.length - 1].matches[0]
      t.winnerId = getWinnerId(final)
    } else {
      const result = simulateMatch(match, allTeams)
      if (result.home === result.away) {
        const pen = simulatePenaltyShootout(match, allTeams)
        setResult(tournamentId, ri, mi, result.home, result.away, pen.penHome, pen.penAway)
      } else {
        setResult(tournamentId, ri, mi, result.home, result.away)
      }
    }
  }

  function simulateRound(tournamentId: string, roundIdx: number) {
    const t = tournaments.value.find((t) => t.id === tournamentId)
    if (!t) return
    const allTeams = getTeams()
    propagateWinners(t.rounds, allTeams)
    t.rounds[roundIdx].matches.forEach((match, mi) => {
      if (!match.result && match.homeId && match.awayId) {
        if (match.leg2Result !== undefined) {
          simulateDoubleLegMatch(t, roundIdx, mi, allTeams)
        } else {
          const result = simulateMatch(match, allTeams)
          match.result =
            result.home === result.away
              ? { ...result, ...simulatePenaltyShootout(match, allTeams) }
              : result
        }
      } else if (match.result && match.leg2Result === null && match.homeId && match.awayId) {
        // Leg 1 done, simulate leg 2
        simulateDoubleLegMatch(t, roundIdx, mi, allTeams)
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
      t.rounds[r].matches.forEach((match, mi) => {
        if (!match.homeId || !match.awayId) return
        if (match.leg2Result !== undefined) {
          simulateDoubleLegMatch(t, r, mi, allTeams)
        } else if (!match.result) {
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

  return {
    setResult,
    setLeg2Result,
    simulateLeg1,
    simulateLeg2,
    simulateBracketMatch,
    simulateRound,
    simulateAll,
  }
}
