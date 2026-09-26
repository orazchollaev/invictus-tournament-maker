import { computed, inject, provide, type ComputedRef, type InjectionKey } from "vue"

/**
 * The team the user manages on the current page, handed down to every team
 * badge and match card below it — dozens of components, several layers deep,
 * none of which otherwise know which tournament they belong to.
 */
const MANAGED_TEAM_KEY: InjectionKey<ComputedRef<string | null>> = Symbol("managedTeam")

export function provideManagedTeam(getter: () => string | null | undefined) {
  provide(
    MANAGED_TEAM_KEY,
    computed(() => getter() ?? null)
  )
}

/** Null outside a managed tournament, so every other page is unaffected. */
export function useManagedTeamId(): ComputedRef<string | null> {
  return inject(
    MANAGED_TEAM_KEY,
    computed(() => null),
    false
  )
}
