// modules/tournament/store/bracket.ts
//
// A thin adapter: find the tournament, hand its bracket to engine/knockoutOps,
// write back the winner. The rules themselves (downstream invalidation,
// aggregate over two legs, the third-place tie) live in the engine so the
// custom format's per-phase brackets run the exact same code — see
// engine/knockoutOps.ts.
import type { Ref } from "vue"
import type { Tournament } from "../types"
import type { Team } from "@/modules/teams/types"
import {
  clearKnockoutLeg2,
  clearKnockoutResult,
  commitKnockoutResult,
  hasTieFrom,
  setKnockoutLeg2,
  simulateKnockoutAll,
  simulateKnockoutLeg1,
  simulateKnockoutLeg2,
  simulateKnockoutRound,
  simulateKnockoutTie,
  tournamentAdjustments,
} from "@/engine"

export function useBracketActions(
  tournaments: Ref<Tournament[]>,
  getTeams: () => Team[],
  simulateThirdPlace: (tournamentId: string) => void
) {
  function getT(tournamentId: string) {
    return tournaments.value.find((t) => t.id === tournamentId)
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
    const t = getT(tournamentId)
    if (!t) return
    t.winnerId = commitKnockoutResult(
      t,
      roundIdx,
      matchIdx,
      {
        home,
        away,
        ...(penHome !== undefined && penAway !== undefined ? { penHome, penAway } : {}),
      },
      getTeams()
    )
  }

  function clearResult(tournamentId: string, roundIdx: number, matchIdx: number) {
    const t = getT(tournamentId)
    if (!t) return
    t.winnerId = clearKnockoutResult(t, roundIdx, matchIdx, getTeams())
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
    const t = getT(tournamentId)
    if (!t) return
    t.winnerId = setKnockoutLeg2(
      t,
      roundIdx,
      matchIdx,
      {
        home,
        away,
        ...(penHome !== undefined && penAway !== undefined ? { penHome, penAway } : {}),
      },
      getTeams()
    )
  }

  function clearLeg2Result(tournamentId: string, roundIdx: number, matchIdx: number) {
    const t = getT(tournamentId)
    if (!t) return
    t.winnerId = clearKnockoutLeg2(t, roundIdx, matchIdx, getTeams())
  }

  function simulateLeg1(tournamentId: string, ri: number, mi: number) {
    const t = getT(tournamentId)
    if (!t) return
    t.winnerId = simulateKnockoutLeg1(t, ri, mi, getTeams(), tournamentAdjustments(t))
  }

  function simulateLeg2(tournamentId: string, ri: number, mi: number) {
    const t = getT(tournamentId)
    if (!t) return
    t.winnerId = simulateKnockoutLeg2(t, ri, mi, getTeams(), tournamentAdjustments(t))
  }

  function simulateBracketMatch(tournamentId: string, ri: number, mi: number) {
    const t = getT(tournamentId)
    if (!t) return
    t.winnerId = simulateKnockoutTie(t, ri, mi, getTeams(), tournamentAdjustments(t))
  }

  function simulateRound(tournamentId: string, roundIdx: number) {
    const t = getT(tournamentId)
    if (!t) return
    t.winnerId = simulateKnockoutRound(t, roundIdx, getTeams(), tournamentAdjustments(t))
  }

  function simulateAll(tournamentId: string) {
    const t = getT(tournamentId)
    if (!t) return
    t.winnerId = simulateKnockoutAll(t, getTeams(), {
      adjustments: () => tournamentAdjustments(t),
      stopAfterRound: (next) => hasTieFrom(t, next, t.manager?.teamId),
      onFinished: () => simulateThirdPlace(tournamentId),
    })
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
