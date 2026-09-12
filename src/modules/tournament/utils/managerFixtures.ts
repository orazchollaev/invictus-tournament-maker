// modules/tournament/utils/managerFixtures.ts
//
// Finding the managed team's next match, whatever shape the competition is.
//
// Every container — groups, league matchdays, division tiers, knockout legs,
// the third-place match — is walked by `allMatches` in engine/matchIterator.ts,
// in container order. That order is also fixture order within each container,
// which is all "next" has to mean here: the first fixture of the managed
// team's that has not been played yet.
import type { Match, Tournament } from "../types"
import { allMatches, isBye, type MatchEntry } from "@/engine"

/** The leg a match entry belongs to — 1 for anything that is not a second leg. */
export function legOf(entry: MatchEntry): 1 | 2 {
  return "leg" in entry.source ? entry.source.leg : 1
}

/**
 * Every match in the tournament, plus the return legs still to be played.
 *
 * `allMatches` only yields a second leg once it has a score — it walks results,
 * and an unplayed leg has none. That is fine for history and standings, and
 * wrong here: an unplayed return leg is exactly the fixture the manager has to
 * be handed, and exactly the one a bulk simulation would otherwise play for
 * him. So the pending ones are synthesised, in the same reversed home/away
 * frame the iterator uses once they exist, right behind their first leg.
 */
function allFixtures(t: Tournament): MatchEntry[] {
  const out: MatchEntry[] = []
  for (const entry of allMatches(t)) {
    out.push(entry)
    if (legOf(entry) !== 1 || !("leg" in entry.source)) continue
    const match = entry.match as Match
    if (match.leg2Result !== null) continue
    out.push({
      homeId: entry.awayId,
      awayId: entry.homeId,
      result: null,
      source: { ...entry.source, leg: 2 },
      match,
      isDoubleLeg: true,
    })
  }
  return out
}

/** Every fixture the managed team still has to play, in the order it will play them. */
export function pendingManagedFixtures(t: Tournament): MatchEntry[] {
  const teamId = t.manager?.teamId
  if (!teamId) return []
  return allFixtures(t).filter(
    (entry) =>
      entry.result == null && !isBye(entry) && (entry.homeId === teamId || entry.awayId === teamId)
  )
}

/** The one the user is being asked to manage, or null when the season is done. */
export function nextManagedFixture(t: Tournament): MatchEntry | null {
  return pendingManagedFixtures(t)[0] ?? null
}

/**
 * Whether a bulk simulation would play one of the user's own matches for him.
 *
 * This is the whole of the manager-mode guard: the "simulate everything"
 * actions are blocked while it is true, and released the moment the fixture
 * has been managed.
 */
export function hasPendingManagedFixture(t: Tournament): boolean {
  return pendingManagedFixtures(t).length > 0
}

/** Whether this fixture is one the user is supposed to manage himself. */
export function isManagedMatch(t: Tournament, matchId: string, leg: 1 | 2 = 1): boolean {
  const teamId = t.manager?.teamId
  if (!teamId) return false
  return allFixtures(t).some(
    (entry) =>
      entry.match.id === matchId &&
      legOf(entry) === leg &&
      !isBye(entry) &&
      (entry.homeId === teamId || entry.awayId === teamId)
  )
}

/** Which end of the pitch the managed team is at, for a given fixture. */
export function managedSideOf(t: Tournament, entry: MatchEntry): "home" | "away" | null {
  const teamId = t.manager?.teamId
  if (!teamId) return null
  if (entry.homeId === teamId) return "home"
  if (entry.awayId === teamId) return "away"
  return null
}
