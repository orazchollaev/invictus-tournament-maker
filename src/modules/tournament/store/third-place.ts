import type { Ref } from "vue"
import type { LegMode, Tournament } from "../types"
import type { Team } from "@/modules/teams/types"
import {
  uid,
  updateThirdPlaceSlots,
  simulateMatch,
  simulatePenaltyShootout,
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

  function setThirdPlaceResult(
    tournamentId: string,
    home: number,
    away: number,
    penHome?: number,
    penAway?: number
  ) {
    const t = getT(tournamentId)
    if (!t?.thirdPlaceMatch) return
    t.thirdPlaceMatch.result = {
      home,
      away,
      ...(penHome !== undefined && penAway !== undefined ? { penHome, penAway } : {}),
    }
    // Editing leg 1 of a double-leg match resets leg 2 (mirrors bracket setResult)
    if (t.thirdPlaceMatch.leg2Result !== undefined) t.thirdPlaceMatch.leg2Result = null
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
    const allTeams = getTeams()
    // Leg 2: awayId plays at home
    const leg2Sim = { id: m.id, homeId: m.awayId, awayId: m.homeId }
    const r2 = simulateMatch(leg2Sim as any, allTeams, tournamentFormAdjustments(t))
    const aggHome = m.result.home + r2.away
    const aggAway = m.result.away + r2.home
    if (aggHome !== aggAway) {
      m.leg2Result = r2
    } else {
      // Aggregate tied → penalty. penHome = awayId pens, penAway = homeId pens
      const pen = simulatePenaltyShootout(leg2Sim as any, allTeams)
      m.leg2Result = { ...r2, penHome: pen.penHome, penAway: pen.penAway }
    }
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
    const allTeams = getTeams()
    const result = simulateMatch(m, allTeams, tournamentFormAdjustments(t))
    if (result.home === result.away) {
      const pen = simulatePenaltyShootout(m, allTeams)
      setThirdPlaceResult(tournamentId, result.home, result.away, pen.penHome, pen.penAway)
    } else {
      setThirdPlaceResult(tournamentId, result.home, result.away)
    }
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
