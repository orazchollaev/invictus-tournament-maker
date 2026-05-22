import type { Ref } from "vue"
import type { Tournament } from "../types"
import type { Team } from "@/modules/teams/types"
import { uid, updateThirdPlaceSlots, simulateMatch, simulatePenaltyShootout } from "@/engine"

export function useThirdPlaceActions(tournaments: Ref<Tournament[]>, getTeams: () => Team[]) {
  function toggleThirdPlace(tournamentId: string) {
    const t = tournaments.value.find((t) => t.id === tournamentId)
    if (!t || t.rounds.length < 2) return
    if (t.hasThirdPlace) {
      t.hasThirdPlace = false
      t.thirdPlaceMatch = undefined
    } else {
      t.hasThirdPlace = true
      t.thirdPlaceMatch = { id: uid(), homeId: null, awayId: null, result: null }
      updateThirdPlaceSlots(t)
    }
  }

  function setThirdPlaceResult(
    tournamentId: string,
    home: number,
    away: number,
    penHome?: number,
    penAway?: number
  ) {
    const t = tournaments.value.find((t) => t.id === tournamentId)
    if (!t?.thirdPlaceMatch) return
    t.thirdPlaceMatch.result = {
      home,
      away,
      ...(penHome !== undefined && penAway !== undefined ? { penHome, penAway } : {}),
    }
  }

  function simulateThirdPlace(tournamentId: string) {
    const t = tournaments.value.find((t) => t.id === tournamentId)
    if (!t?.thirdPlaceMatch) return
    const m = t.thirdPlaceMatch
    if (!m.homeId || !m.awayId || m.result) return
    const allTeams = getTeams()
    const result = simulateMatch(m, allTeams)
    if (result.home === result.away) {
      const pen = simulatePenaltyShootout(m, allTeams)
      setThirdPlaceResult(tournamentId, result.home, result.away, pen.penHome, pen.penAway)
    } else {
      setThirdPlaceResult(tournamentId, result.home, result.away)
    }
  }

  return { toggleThirdPlace, setThirdPlaceResult, simulateThirdPlace }
}
