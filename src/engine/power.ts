// engine/power.ts
//
// Single choke point the rest of the engine reads team strength through.
// By default it's just `team.power`, but the app can install a resolver
// (see settings/store.ts's `usePlayerPower` watcher) that blends in the
// squad's average player power instead — without every simulation/seeding
// call site needing to know players exist at all.
import type { Team } from "../modules/teams/types"

let _resolver: ((team: Team) => number) | null = null

export function setPowerResolver(resolver: ((team: Team) => number) | null) {
  _resolver = resolver
}

export function resolvePower(team: Team | null | undefined): number {
  if (!team) return 50
  return _resolver ? _resolver(team) : team.power
}
