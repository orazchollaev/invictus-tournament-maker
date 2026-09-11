// engine/injuries.ts
//
// A knock that takes a player out of the match there and then, and keeps
// him out of his team's next few matches after it.
//
// Unlike a red card (discipline.ts), an injury never touches the score
// that produced it — the player leaves for a substitute at full strength,
// the same as a tactical change. What it costs is entirely in the future:
// he is unavailable for a run of his team's matches, decided by chance
// rather than by cards, and — unlike a suspension — long enough to matter.
//
// The duration lives on the `Substitution` record itself (see
// modules/tournament/types.ts), the same way a red card's minute lives on
// `RedCard`. Nothing here is stored as mutable state on the player: a
// player's current availability, like his career totals, is read back out
// of the match history it was written into, fresh every time.
import type { Substitution, Tournament } from "../modules/tournament/types"
import { forEachMatch, isBye } from "./matchIterator"
import { isInjuriesEnabled } from "./simulation"

/** Chance a side loses a player to injury in any given match. */
export const INJURY_CHANCE = 0.06

export const INJURY_MIN_MATCHES = 1
export const INJURY_MAX_MATCHES = 4

/** How many of the team's next matches the injury rules him out of. */
export function rollInjuryDuration(rng: () => number = Math.random): number {
  return INJURY_MIN_MATCHES + Math.floor(rng() * (INJURY_MAX_MATCHES - INJURY_MIN_MATCHES + 1))
}

export interface InjuryMatch {
  matchId: string
  leg: 1 | 2
  homeId: string | null
  awayId: string | null
  /**
   * The report already generated for this match, when there is one. Absent
   * for a match still pending its own stats — which is exactly the case
   * `computeInjuryAvailability` exists to answer: who can play in it.
   */
  substitutions?: Substitution[]
}

export interface InjuryAvailability {
  matchId: string
  leg: 1 | 2
  /** Player ids on the home side ruled out for this match. */
  unavailableHomeIds: string[]
  /** Player ids on the away side ruled out for this match. */
  unavailableAwayIds: string[]
}

/**
 * Who is still working off an injury, match by match.
 *
 * `matches` is expected in playing order — the order every fixture list is
 * already stored in, the same assumption `discipline.ts` makes. A team's
 * own match count only advances on matches it actually played, so a bye or
 * the other team's fixtures never eat into a recovery.
 *
 * The match a player got hurt in is not itself a miss — he was already out
 * there, and came off rather than never taking the field — so the clock
 * starts counting from the match after it.
 *
 * Like every adjustment in this engine, this is a pure read of the history
 * so far: it is recomputed from scratch each time it is asked for, never
 * carried as state on the player. A whole batch of matches resolved in one
 * "Simulate All" is snapshotted once, before any of them run — the same
 * approximation `fixtureAdjustments` already makes for form and discipline —
 * so an injury picked up mid-batch does not retroactively rule its man out
 * of a later match in the same batch.
 */
export function computeInjuryAvailability(matches: InjuryMatch[]): InjuryAvailability[] {
  const teamMatchCount = new Map<string, number>()
  const injured = new Map<string, { teamId: string; startCount: number; duration: number }>()
  const out: InjuryAvailability[] = []

  const unavailableFor = (teamId: string | null): string[] => {
    if (!teamId) return []
    const played = teamMatchCount.get(teamId) ?? 0
    const ids: string[] = []
    for (const [playerId, info] of injured) {
      if (info.teamId !== teamId) continue
      const missedSoFar = played - info.startCount - 1
      if (missedSoFar < info.duration) ids.push(playerId)
    }
    return ids
  }

  for (const m of matches) {
    out.push({
      matchId: m.matchId,
      leg: m.leg,
      unavailableHomeIds: unavailableFor(m.homeId),
      unavailableAwayIds: unavailableFor(m.awayId),
    })

    for (const sub of m.substitutions ?? []) {
      if (sub.reason !== "injury" || !sub.outPlayerId || !sub.injuryMatches) continue
      const teamId = sub.side === "home" ? m.homeId : m.awayId
      if (!teamId) continue
      injured.set(sub.outPlayerId, {
        teamId,
        startCount: teamMatchCount.get(teamId) ?? 0,
        duration: sub.injuryMatches,
      })
    }

    if (m.homeId) teamMatchCount.set(m.homeId, (teamMatchCount.get(m.homeId) ?? 0) + 1)
    if (m.awayId) teamMatchCount.set(m.awayId, (teamMatchCount.get(m.awayId) ?? 0) + 1)
  }

  return out
}

/**
 * A tournament's played matches, in `forEachMatch` order, as the plain data
 * `computeInjuryAvailability` needs. A match still missing its own report
 * simply has no `substitutions` yet — that is the case this whole module
 * exists to answer: who is fit to play in it, based on what has already
 * been generated for the matches before it.
 */
export function tournamentInjuryMatches(t: Tournament): InjuryMatch[] {
  const matches: InjuryMatch[] = []
  forEachMatch(t, (entry) => {
    const result = entry.result
    if (!result || isBye(entry)) return
    const leg = "leg" in entry.source ? entry.source.leg : 1
    matches.push({
      matchId: entry.match.id,
      leg,
      homeId: entry.homeId,
      awayId: entry.awayId,
      ...(result.stats?.substitutions ? { substitutions: result.stats.substitutions } : {}),
    })
  })
  return matches
}

/**
 * Who is ruled out of which match, for a whole tournament, keyed by
 * `${matchId}:${leg}`. The one entry point every caller should use —
 * `ensure.ts`'s sweep and any UI that rolls or previews a single match
 * both need the same answer, so both read it from here rather than
 * keeping their own copy of "which matches has this team played".
 *
 * Empty when the setting is off, so a caller need not check it twice.
 */
export function unavailablePlayersByMatch(t: Tournament): Map<string, InjuryAvailability> {
  if (!isInjuriesEnabled()) return new Map()
  const availability = computeInjuryAvailability(tournamentInjuryMatches(t))
  return new Map(availability.map((a) => [`${a.matchId}:${a.leg}`, a]))
}
