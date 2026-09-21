// modules/tournament/utils/simulationCache.ts
//
// Where a Monte Carlo run is parked between the settings page that starts it
// and the results page that draws it. In memory only, and deliberately so: a
// run is cheap to repeat and worth nothing once its tournament has moved on,
// so there is nothing here worth writing to disk. `SimulationResultsPage`
// already renders an empty state with a way back when there is no entry.
//
// What it does have to get right is not handing back a result that has stopped
// describing the tournament. A run answers "how does this finish from here" —
// play one more match and every number in it is about a position that no
// longer exists. So each entry carries a fingerprint of the state it was
// computed from and is dropped the moment that stops matching.
import type { MonteCarloResult } from "@/engine/monteCarlo"
import type { Tournament } from "../types"
import { playedMatches } from "@/engine"

/** Runs kept at once. A result is a few hundred KB, and nobody compares more
 *  than a couple of tournaments in one sitting. */
const MAX_ENTRIES = 3

interface Entry {
  result: MonteCarloResult
  fingerprint: string
}

const _cache = new Map<string, Entry>()

/**
 * What the run was computed from, cheaply.
 *
 * Every input that moves the odds shows up here: a match played, a team added
 * or dropped, a winner declared, a new season started. It does not have to be
 * a hash of the whole record — it only has to change whenever the answer
 * would, and a false miss just means the user re-runs a simulation.
 */
function fingerprintOf(t: Tournament): string {
  return [t.season, t.teamIds.length, playedMatches(t).length, t.winnerId ?? ""].join("|")
}

export function cacheSimResult(tournamentId: string, tournament: Tournament, result: MonteCarloResult) {
  // Re-inserting moves the key to the end of the Map's iteration order, which
  // is what makes the eviction below least-recently-used rather than arbitrary.
  _cache.delete(tournamentId)
  _cache.set(tournamentId, { result, fingerprint: fingerprintOf(tournament) })

  while (_cache.size > MAX_ENTRIES) {
    const oldest = _cache.keys().next()
    if (oldest.done) break
    _cache.delete(oldest.value)
  }
}

/** The stored run, or undefined when there is none or it has gone stale. */
export function getCachedSimResult(
  tournamentId: string,
  tournament: Tournament | undefined
): MonteCarloResult | undefined {
  const entry = _cache.get(tournamentId)
  if (!entry) return undefined
  if (!tournament) return undefined
  if (entry.fingerprint !== fingerprintOf(tournament)) {
    _cache.delete(tournamentId)
    return undefined
  }
  return entry.result
}

/** Called when a tournament is deleted — nothing else would ever free it. */
export function dropSimResult(tournamentId: string) {
  _cache.delete(tournamentId)
}
