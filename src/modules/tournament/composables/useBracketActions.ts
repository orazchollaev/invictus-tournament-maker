import { useTournamentStore } from "../store"

/**
 * The store calls every bracket view needs, as a listener bag.
 *
 * Bind it with `v-bind="actions"` instead of re-declaring a dozen identical
 * `@set-result="…"` lines on each bracket, fixture list and fullscreen copy.
 *
 * `phaseId` is what makes the bracket views work for the custom format without
 * any of them knowing about phases: a custom tournament's knockouts live inside
 * a phase, so the same events have to reach the phase actions instead of the
 * tournament's own. This is the one seam every bracket write goes through, so
 * it is the only place that has to choose.
 */
export function useBracketActions(tournamentId: () => string, phaseId?: () => string | undefined) {
  const store = useTournamentStore()
  const phase = () => phaseId?.()

  return {
    onSetResult: (ri: number, mi: number, h: number, a: number, ph?: number, pa?: number) => {
      const p = phase()
      if (p) store.setPhaseBracketResult(tournamentId(), p, ri, mi, h, a, ph, pa)
      else store.setResult(tournamentId(), ri, mi, h, a, ph, pa)
    },
    onSetLeg2Result: (ri: number, mi: number, h: number, a: number, ph?: number, pa?: number) => {
      const p = phase()
      if (p) store.setPhaseBracketLeg2Result(tournamentId(), p, ri, mi, h, a, ph, pa)
      else store.setLeg2Result(tournamentId(), ri, mi, h, a, ph, pa)
    },
    onSimMatch: (ri: number, mi: number) => {
      const p = phase()
      if (p) store.simPhaseBracketMatch(tournamentId(), p, ri, mi)
      else store.simulateBracketMatch(tournamentId(), ri, mi)
    },
    onSimLeg1: (ri: number, mi: number) => {
      const p = phase()
      if (p) store.simPhaseBracketLeg1(tournamentId(), p, ri, mi)
      else store.simulateLeg1(tournamentId(), ri, mi)
    },
    onSimLeg2: (ri: number, mi: number) => {
      const p = phase()
      if (p) store.simPhaseBracketLeg2(tournamentId(), p, ri, mi)
      else store.simulateLeg2(tournamentId(), ri, mi)
    },
    onSetThirdPlaceResult: (h: number, a: number, ph?: number, pa?: number) => {
      const p = phase()
      if (p) store.setPhaseThirdPlaceResult(tournamentId(), p, h, a, ph, pa)
      else store.setThirdPlaceResult(tournamentId(), h, a, ph, pa)
    },
    onSetThirdPlaceLeg2Result: (h: number, a: number, ph?: number, pa?: number) => {
      const p = phase()
      if (p) store.setPhaseThirdPlaceLeg2Result(tournamentId(), p, h, a, ph, pa)
      else store.setThirdPlaceLeg2Result(tournamentId(), h, a, ph, pa)
    },
    onSimThirdPlaceLeg1: () => {
      const p = phase()
      if (p) store.simPhaseThirdPlaceLeg1(tournamentId(), p)
      else store.simulateThirdPlaceLeg1(tournamentId())
    },
    onSimThirdPlaceLeg2: () => {
      const p = phase()
      if (p) store.simPhaseThirdPlaceLeg2(tournamentId(), p)
      else store.simulateThirdPlaceLeg2(tournamentId())
    },
    // simulateThirdPlace already no-ops once the match (both legs, for
    // double-leg) is fully played — a finished 3rd place match must stay put.
    onSimThirdPlace: () => {
      const p = phase()
      if (p) store.simPhaseThirdPlace(tournamentId(), p)
      else store.simulateThirdPlace(tournamentId())
    },
    onClearResult: (ri: number, mi: number) => {
      const p = phase()
      if (p) store.clearPhaseBracketResult(tournamentId(), p, ri, mi)
      else store.clearResult(tournamentId(), ri, mi)
    },
    onClearLeg2Result: (ri: number, mi: number) => {
      const p = phase()
      if (p) store.clearPhaseBracketLeg2Result(tournamentId(), p, ri, mi)
      else store.clearLeg2Result(tournamentId(), ri, mi)
    },
    onClearThirdPlaceResult: () => {
      const p = phase()
      if (p) store.clearPhaseThirdPlaceResult(tournamentId(), p)
      else store.clearThirdPlaceResult(tournamentId())
    },
    onClearThirdPlaceLeg2Result: () => {
      const p = phase()
      if (p) store.clearPhaseThirdPlaceLeg2Result(tournamentId(), p)
      else store.clearThirdPlaceLeg2Result(tournamentId())
    },
  }
}
