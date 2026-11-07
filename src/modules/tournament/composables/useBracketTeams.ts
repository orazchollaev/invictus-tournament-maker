import { computed, inject, provide, type ComputedRef, type InjectionKey } from "vue"
import type { Team } from "@/modules/teams/types"

type TeamIndex = ComputedRef<Map<string, Team>>

const KEY: InjectionKey<TeamIndex> = Symbol("bracketTeams")

function index(teams: Team[]): Map<string, Team> {
  return new Map(teams.map((t) => [t.id, t]))
}

/**
 * Builds the bracket's team lookup once, for every card and connector below.
 * A bracket has a card per match and each needs both its teams: searching the
 * whole team list for each of them, on every render, is what a big bracket
 * spent its time on.
 */
export function provideBracketTeams(teams: () => Team[]): TeamIndex {
  const byId = computed(() => index(teams()))
  provide(KEY, byId)
  return byId
}

/** The lookup provided above; a bracket rendered on its own builds its own. */
export function useBracketTeams(teams: () => Team[]): TeamIndex {
  return inject(KEY, null) ?? computed(() => index(teams()))
}
