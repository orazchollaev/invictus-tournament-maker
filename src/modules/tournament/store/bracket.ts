import type { Ref } from "vue"
import type { Tournament } from "../types"
import type { Team } from "@/modules/teams/types"
import {
  propagateWinners,
  getWinnerId,
  updateThirdPlaceSlots,
  simulateMatch,
  simulatePenaltyShootout,
  tournamentFormAdjustments,
} from "@/engine"

export function useBracketActions(
  tournaments: Ref<Tournament[]>,
  getTeams: () => Team[],
  simulateThirdPlace: (tournamentId: string) => void
) {
  /**
   * A semi-final changing invalidates the third-place tie. Both legs go, not
   * just leg 1 — otherwise a double-legged third-place match keeps a stale
   * second leg played by the old pair of losers.
   */
  function clearThirdPlace(t: Tournament) {
    const m = t.thirdPlaceMatch
    if (!m) return
    m.result = null
    if (m.leg2Result !== undefined) m.leg2Result = null
  }

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
    if (roundIdx === t.rounds.length - 2) clearThirdPlace(t)
    propagateWinners(t.rounds, getTeams())
    updateThirdPlaceSlots(t)
    const final = t.rounds[t.rounds.length - 1].matches[0]
    t.winnerId = getWinnerId(final)
  }

  /**
   * Back to unplayed. Leg 1 owns the tie, so clearing it drops leg 2 as well —
   * the same rule `setResult` already applies when leg 1 is re-entered.
   */
  function clearResult(tournamentId: string, roundIdx: number, matchIdx: number) {
    const t = tournaments.value.find((t) => t.id === tournamentId)
    if (!t) return
    const match = t.rounds[roundIdx].matches[matchIdx]
    match.result = null
    if (match.leg2Result !== undefined) match.leg2Result = null
    clearDownstream(t, roundIdx, matchIdx)
    if (roundIdx === t.rounds.length - 2) clearThirdPlace(t)
    propagateWinners(t.rounds, getTeams())
    updateThirdPlaceSlots(t)
    const final = t.rounds[t.rounds.length - 1].matches[0]
    t.winnerId = getWinnerId(final)
  }

  function clearLeg2Result(tournamentId: string, roundIdx: number, matchIdx: number) {
    const t = tournaments.value.find((t) => t.id === tournamentId)
    if (!t) return
    const match = t.rounds[roundIdx].matches[matchIdx]
    if (match.leg2Result === undefined) return
    match.leg2Result = null
    clearDownstream(t, roundIdx, matchIdx)
    if (roundIdx === t.rounds.length - 2) clearThirdPlace(t)
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
    if (roundIdx === t.rounds.length - 2) clearThirdPlace(t)
    propagateWinners(t.rounds, getTeams())
    updateThirdPlaceSlots(t)
    const final = t.rounds[t.rounds.length - 1].matches[0]
    t.winnerId = getWinnerId(final)
  }

  function simulateDoubleLegMatch(
    t: Tournament,
    ri: number,
    mi: number,
    allTeams: Team[],
    form?: Map<string, number>
  ) {
    const match = t.rounds[ri].matches[mi]
    if (!match.homeId || !match.awayId) return
    if (!match.result) {
      match.result = simulateMatch(match, allTeams, form)
    }
    if (match.leg2Result === null) {
      // Leg 2: awayId plays at home
      const leg2Sim = { id: match.id, homeId: match.awayId, awayId: match.homeId }
      const r2 = simulateMatch(leg2Sim as any, allTeams, form)
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
    match.result = simulateMatch(match, allTeams, tournamentFormAdjustments(t))
    match.leg2Result = null
    clearDownstream(t, ri, mi)
    if (ri === t.rounds.length - 2) clearThirdPlace(t)
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
    const r2 = simulateMatch(leg2Sim as any, allTeams, tournamentFormAdjustments(t))
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

    const form = tournamentFormAdjustments(t)

    if (match.leg2Result !== undefined) {
      simulateDoubleLegMatch(t, ri, mi, allTeams, form)
      propagateWinners(t.rounds, allTeams)
      updateThirdPlaceSlots(t)
      const final = t.rounds[t.rounds.length - 1].matches[0]
      t.winnerId = getWinnerId(final)
    } else {
      const result = simulateMatch(match, allTeams, form)
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
    const form = tournamentFormAdjustments(t)
    propagateWinners(t.rounds, allTeams)
    t.rounds[roundIdx].matches.forEach((match, mi) => {
      if (!match.result && match.homeId && match.awayId) {
        if (match.leg2Result !== undefined) {
          simulateDoubleLegMatch(t, roundIdx, mi, allTeams, form)
        } else {
          const result = simulateMatch(match, allTeams, form)
          match.result =
            result.home === result.away
              ? { ...result, ...simulatePenaltyShootout(match, allTeams) }
              : result
        }
      } else if (match.result && match.leg2Result === null && match.homeId && match.awayId) {
        // Leg 1 done, simulate leg 2
        simulateDoubleLegMatch(t, roundIdx, mi, allTeams, form)
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
      // Recomputed per round so a run of wins earlier in the bracket feeds into
      // the next round, the way it does matchday by matchday in a league.
      const form = tournamentFormAdjustments(t)
      propagateWinners(t.rounds, allTeams)
      t.rounds[r].matches.forEach((match, mi) => {
        if (!match.homeId || !match.awayId) return
        if (match.leg2Result !== undefined) {
          simulateDoubleLegMatch(t, r, mi, allTeams, form)
        } else if (!match.result) {
          const result = simulateMatch(match, allTeams, form)
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
    clearResult,
    clearLeg2Result,
    simulateLeg1,
    simulateLeg2,
    simulateBracketMatch,
    simulateRound,
    simulateAll,
  }
}
