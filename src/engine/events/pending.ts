// engine/events/pending.ts
//
// A hand-off for a match that was watched before its result was committed.
//
// Results are written from a dozen actions across every store slice, and the
// store sweeps each one afterwards with `ensureMatchStats` — which generates
// a *fresh* narrative for anything missing one. That is exactly right for a
// score typed in or simulated in bulk, and exactly wrong for a match the user
// just watched: the report would describe a different match from the one on
// screen, and the extra time it went to would be lost entirely.
//
// So the watcher leaves the whole outcome here, keyed by the match, and the
// sweep claims it. Nothing else about the commit path changes — no setter
// signature, no store action, no emit chain up through the fixture rows.
import type { MatchResult, MatchStats } from "@/modules/tournament/types"

/** What was rolled, and the score it produced. */
export interface WatchedMatch {
  home: number
  away: number
  penHome?: number
  penAway?: number
  /** Score at 90', when the tie went to extra time. */
  ft?: { home: number; away: number }
  /**
   * The narrative that was played on screen. Absent for a plain simulation,
   * which has a result to hand over but no events yet — the sweep generates
   * those itself, and by then `ft` is already on the result to guide it.
   */
  stats?: MatchStats
}

const pending = new Map<string, WatchedMatch>()

/** Legs of a two-legged tie share a match id, so the leg is part of the key. */
export function pendingKey(matchId: string, leg: 1 | 2 = 1): string {
  return `${matchId}#${leg}`
}

export function stashWatchedMatch(key: string, watched: WatchedMatch): void {
  pending.set(key, watched)
}

/**
 * Claim a stash for a result that has just been committed: restore the extra
 * time it went to, and hand back the narrative if there is one.
 *
 * The score is checked first. Between rolling and saving, the user can still
 * edit the numbers in the score modal, and a timeline that adds up to a
 * different scoreline — or an "a.e.t." on a score nobody played out — would
 * be a lie. A stash that no longer matches is dropped rather than applied.
 */
export function claimWatchedMatch(key: string, result: MatchResult): MatchStats | undefined {
  const watched = pending.get(key)
  if (!watched) return undefined
  pending.delete(key)

  const sameScore =
    watched.home === result.home &&
    watched.away === result.away &&
    (watched.penHome ?? null) === (result.penHome ?? null) &&
    (watched.penAway ?? null) === (result.penAway ?? null)
  if (!sameScore) return undefined

  // Extra time is part of what was watched but not part of what the score
  // modal can emit, so it is restored here alongside the events.
  if (watched.ft && result.ft === undefined) result.ft = { ...watched.ft }

  return watched.stats
}

/** Abandon one stash — the score modal closed without the result being saved. */
export function dropWatchedMatch(key: string): void {
  pending.delete(key)
}

/** Abandon all of them. */
export function clearPendingStats(): void {
  pending.clear()
}
