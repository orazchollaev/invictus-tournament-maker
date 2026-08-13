import { useTournamentStore } from "../store"

/**
 * The seven store calls every bracket view needs, as a listener bag.
 *
 * Bind it with `v-bind="actions"` instead of re-declaring seven identical
 * `@set-result="…"` lines on each bracket, fixture list and fullscreen copy.
 */
export function useBracketActions(tournamentId: () => string) {
  const store = useTournamentStore()

  return {
    onSetResult: (ri: number, mi: number, h: number, a: number, ph?: number, pa?: number) =>
      store.setResult(tournamentId(), ri, mi, h, a, ph, pa),
    onSetLeg2Result: (ri: number, mi: number, h: number, a: number, ph?: number, pa?: number) =>
      store.setLeg2Result(tournamentId(), ri, mi, h, a, ph, pa),
    onSimMatch: (ri: number, mi: number) => store.simulateBracketMatch(tournamentId(), ri, mi),
    onSimLeg1: (ri: number, mi: number) => store.simulateLeg1(tournamentId(), ri, mi),
    onSimLeg2: (ri: number, mi: number) => store.simulateLeg2(tournamentId(), ri, mi),
    onSetThirdPlaceResult: (h: number, a: number, ph?: number, pa?: number) =>
      store.setThirdPlaceResult(tournamentId(), h, a, ph, pa),
    onSetThirdPlaceLeg2Result: (h: number, a: number, ph?: number, pa?: number) =>
      store.setThirdPlaceLeg2Result(tournamentId(), h, a, ph, pa),
    onSimThirdPlaceLeg1: () => store.simulateThirdPlaceLeg1(tournamentId()),
    onSimThirdPlaceLeg2: () => store.simulateThirdPlaceLeg2(tournamentId()),
    // simulateThirdPlace already no-ops once the match (both legs, for
    // double-leg) is fully played — a finished 3rd place match must stay put.
    onSimThirdPlace: () => store.simulateThirdPlace(tournamentId()),
    onClearResult: (ri: number, mi: number) => store.clearResult(tournamentId(), ri, mi),
    onClearLeg2Result: (ri: number, mi: number) => store.clearLeg2Result(tournamentId(), ri, mi),
    onClearThirdPlaceResult: () => store.clearThirdPlaceResult(tournamentId()),
    onClearThirdPlaceLeg2Result: () => store.clearThirdPlaceLeg2Result(tournamentId()),
  }
}
