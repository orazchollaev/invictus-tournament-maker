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
    onSimThirdPlace: () => store.simulateThirdPlace(tournamentId()),
  }
}
