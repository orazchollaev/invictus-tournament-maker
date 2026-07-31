import type { Ref } from "vue"
import type { Tournament } from "../types"
import type { Team } from "@/modules/teams/types"

/**
 * `find the tournament, bail if it's gone` — the opening two lines of
 * almost every store action.
 */
export function makeWithTournament(tournaments: Ref<Tournament[]>) {
  return function withTournament<T>(id: string, fn: (t: Tournament) => T): T | undefined {
    const t = tournaments.value.find((x) => x.id === id)
    return t ? fn(t) : undefined
  }
}

/**
 * The store returns `{ ...crud, ...bracket, ... }`. A spread silently
 * lets a later slice shadow an earlier one, so two slices exporting the
 * same action name would half-work in a way that's miserable to trace.
 * Fail loudly in dev instead.
 */
export function assertNoSliceCollisions(slices: Record<string, object>) {
  const seen = new Map<string, string>()
  const clashes: string[] = []

  for (const [sliceName, slice] of Object.entries(slices)) {
    for (const key of Object.keys(slice)) {
      const owner = seen.get(key)
      if (owner) clashes.push(`"${key}" is exported by both ${owner} and ${sliceName}`)
      else seen.set(key, sliceName)
    }
  }

  if (clashes.length) {
    throw new Error(`Tournament store slices collide:\n  ${clashes.join("\n  ")}`)
  }
}

/**
 * Apply a tournament's per-team power deltas. Simulation reads power
 * through this so a tournament-local handicap never mutates the team
 * record itself. Was duplicated verbatim in the groups and league slices.
 */
export function adjustedTeams(teams: Team[], t: Tournament): Team[] {
  const adj = t.teamPowerAdjustments
  if (!adj || Object.keys(adj).length === 0) return teams
  return teams.map((team) => {
    const delta = adj[team.id] ?? 0
    return delta === 0 ? team : { ...team, power: Math.max(1, Math.min(100, team.power + delta)) }
  })
}
