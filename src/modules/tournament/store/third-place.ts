import type { Ref } from "vue"
import type { LegMode, Match, MatchResult, Tournament } from "../types"
import type { Team } from "@/modules/teams/types"
import {
  uid,
  updateThirdPlaceSlots,
  simulateMatch,
  decideKnockoutResult,
  applyThirdPlaceLegMode,
  tournamentFormAdjustments,
} from "@/engine"

export function useThirdPlaceActions(tournaments: Ref<Tournament[]>, getTeams: () => Team[]) {
  function getT(tournamentId: string) {
    return tournaments.value.find((t) => t.id === tournamentId)
  }

  function toggleThirdPlace(tournamentId: string) {
    const t = tournaments.value.find((t) => t.id === tournamentId)
    if (!t || t.rounds.length < 2) return
    if (t.hasThirdPlace) {
      t.hasThirdPlace = false
      t.thirdPlaceMatch = undefined
    } else {
      t.hasThirdPlace = true
      t.thirdPlaceMatch = { id: uid(), homeId: null, awayId: null, result: null }
      applyThirdPlaceLegMode(t.thirdPlaceMatch, t)
      updateThirdPlaceSlots(t)
    }
  }

  function setThirdPlaceLegMode(tournamentId: string, mode: LegMode) {
    const t = tournaments.value.find((t) => t.id === tournamentId)
    if (!t) return
    if (t.thirdPlaceMatch?.result || t.thirdPlaceMatch?.leg2Result) return
    t.thirdPlaceLegMode = mode
    applyThirdPlaceLegMode(t.thirdPlaceMatch, t)
    if (mode !== "double" && t.thirdPlaceMatch) t.thirdPlaceMatch.leg2Result = undefined
  }

  /** Mirrors `commitResult` in the bracket slice — see the note there on why. */
  function commitThirdPlaceResult(t: Tournament, result: MatchResult) {
    if (!t.thirdPlaceMatch) return
    t.thirdPlaceMatch.result = result
    // Editing leg 1 of a double-leg match resets leg 2 (mirrors bracket setResult)
    if (t.thirdPlaceMatch.leg2Result !== undefined) t.thirdPlaceMatch.leg2Result = null
  }

  function setThirdPlaceResult(
    tournamentId: string,
    home: number,
    away: number,
    penHome?: number,
    penAway?: number
  ) {
    const t = getT(tournamentId)
    if (!t?.thirdPlaceMatch) return
    commitThirdPlaceResult(t, {
      home,
      away,
      ...(penHome !== undefined && penAway !== undefined ? { penHome, penAway } : {}),
    })
  }

  function setThirdPlaceLeg2Result(
    tournamentId: string,
    home: number,
    away: number,
    penHome?: number,
    penAway?: number
  ) {
    const t = getT(tournamentId)
    if (!t?.thirdPlaceMatch) return
    if (t.thirdPlaceMatch.leg2Result === undefined) return // not a double-leg match
    t.thirdPlaceMatch.leg2Result = {
      home,
      away,
      ...(penHome !== undefined && penAway !== undefined ? { penHome, penAway } : {}),
    }
  }

  function clearThirdPlaceResult(tournamentId: string) {
    const t = getT(tournamentId)
    if (!t?.thirdPlaceMatch) return
    t.thirdPlaceMatch.result = null
    // Leg 1 owns the tie, so clearing it drops leg 2 as well (mirrors bracket clearResult)
    if (t.thirdPlaceMatch.leg2Result !== undefined) t.thirdPlaceMatch.leg2Result = null
  }

  function clearThirdPlaceLeg2Result(tournamentId: string) {
    const t = getT(tournamentId)
    if (!t?.thirdPlaceMatch || t.thirdPlaceMatch.leg2Result === undefined) return
    t.thirdPlaceMatch.leg2Result = null
  }

  function simulateThirdPlaceLeg1(tournamentId: string) {
    const t = getT(tournamentId)
    if (!t?.thirdPlaceMatch) return
    const m = t.thirdPlaceMatch
    if (!m.homeId || !m.awayId || m.leg2Result === undefined) return
    m.result = simulateMatch(m, getTeams(), tournamentFormAdjustments(t))
    m.leg2Result = null
  }

  function simulateThirdPlaceLeg2(tournamentId: string) {
    const t = getT(tournamentId)
    if (!t?.thirdPlaceMatch) return
    const m = t.thirdPlaceMatch
    if (!m.homeId || !m.awayId || !m.result || m.leg2Result === undefined) return
    m.leg2Result = decideLeg2(m, getTeams(), tournamentFormAdjustments(t))
  }

  /** Leg 2 reverses the fixture and settles the tie on aggregate. */
  function decideLeg2(m: Match, allTeams: Team[], form?: Map<string, number>): MatchResult {
    const leg2Sim = { id: m.id, homeId: m.awayId, awayId: m.homeId }
    return decideKnockoutResult(leg2Sim as never, allTeams, {
      form,
      aggregateOffset: { home: m.result!.away, away: m.result!.home },
    }).result
  }

  function simulateThirdPlace(tournamentId: string) {
    const t = getT(tournamentId)
    if (!t?.thirdPlaceMatch) return
    const m = t.thirdPlaceMatch
    if (!m.homeId || !m.awayId) return
    if (m.leg2Result !== undefined) {
      // Double-leg: play whichever leg is still pending.
      if (!m.result) simulateThirdPlaceLeg1(tournamentId)
      if (m.leg2Result === null) simulateThirdPlaceLeg2(tournamentId)
      return
    }
    if (m.result) return
    const decision = decideKnockoutResult(m, getTeams(), { form: tournamentFormAdjustments(t) })
    commitThirdPlaceResult(t, decision.result)
  }

  return {
    toggleThirdPlace,
    setThirdPlaceLegMode,
    setThirdPlaceResult,
    setThirdPlaceLeg2Result,
    clearThirdPlaceResult,
    clearThirdPlaceLeg2Result,
    simulateThirdPlace,
    simulateThirdPlaceLeg1,
    simulateThirdPlaceLeg2,
  }
}
