import { toRaw } from "vue"
import { useTournamentStore } from "@/modules/tournament/store"
import type { Tournament } from "../types"

/**
 * For a computed that walks a whole tournament: hands back the plain object
 * behind the reactive one, and subscribes the computed to the tournament's
 * revision instead of to every field it reads.
 *
 * Through the proxies, a walk over every match of a big league paid a get trap
 * per property and left the computed subscribed to tens of thousands of
 * fields. Every change goes through a store action, and every action bumps the
 * revision (see `mutate` in the store), so this one number says the same thing.
 */
export function useRawTournament() {
  const store = useTournamentStore()
  return function rawOf<T extends Tournament | undefined>(t: T): T {
    if (!t) return t
    store.revision(t.id)
    return toRaw(t) as T
  }
}
