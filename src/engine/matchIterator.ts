import type { Tournament, Match, GroupMatch, MatchResult } from "@/modules/tournament/types"

/**
 * A tournament stores its matches in five containers with two different
 * record shapes. Walking all of them was hand-written in four places
 * (team history, participants table, history stats, store recalc), so
 * adding a container type meant finding and editing all four. This is
 * that walk, once.
 *
 * Knockout ties yield two entries when a second leg has been played.
 * Crucially, `homeId`/`awayId` on a leg-2 entry are already flipped to
 * match how the leg was actually played, so `result.penHome` and
 * `homeId` always refer to the same side and callers never have to
 * special-case leg 2.
 */

export type MatchSource =
  | { kind: "group"; groupIdx: number; groupName: string }
  | {
      kind: "league"
      matchdayIdx: number
      matchdayName: string
      tierIdx?: number
      tierName?: string
    }
  | { kind: "knockout"; roundIdx: number; roundName: string; leg: 1 | 2 }
  | { kind: "third-place"; leg: 1 | 2 }

export interface MatchEntry {
  homeId: string | null
  awayId: string | null
  result: MatchResult | null
  source: MatchSource
  /** The underlying record, for callers that need tie-level context. */
  match: Match | GroupMatch
  /** True when this entry is one leg of a two-legged tie. */
  isDoubleLeg: boolean
}

/** A bracket slot with a missing side — a bye, not a real fixture. */
export function isBye(entry: MatchEntry) {
  return !entry.homeId || !entry.awayId
}

function tieEntries(match: Match, makeSource: (leg: 1 | 2) => MatchSource): MatchEntry[] {
  const isDoubleLeg = match.leg2Result !== undefined
  const entries: MatchEntry[] = [
    {
      homeId: match.homeId,
      awayId: match.awayId,
      result: match.result,
      source: makeSource(1),
      match,
      isDoubleLeg,
    },
  ]

  // The second leg is played with the fixture reversed.
  if (match.leg2Result) {
    entries.push({
      homeId: match.awayId,
      awayId: match.homeId,
      result: match.leg2Result,
      source: makeSource(2),
      match,
      isDoubleLeg,
    })
  }

  return entries
}

function groupEntry(match: GroupMatch, source: MatchSource): MatchEntry {
  return {
    homeId: match.homeId,
    awayId: match.awayId,
    result: match.result,
    source,
    match,
    isDoubleLeg: false,
  }
}

/** Visit every match in a tournament. Order is container order, not chronological. */
export function forEachMatch(t: Tournament, visit: (entry: MatchEntry) => void) {
  t.groups?.forEach((group, groupIdx) => {
    const source: MatchSource = { kind: "group", groupIdx, groupName: group.name }
    group.matches.forEach((m) => visit(groupEntry(m, source)))
  })

  t.league?.matchdays.forEach((md, matchdayIdx) => {
    const source: MatchSource = { kind: "league", matchdayIdx, matchdayName: md.name }
    md.matches.forEach((m) => visit(groupEntry(m, source)))
  })

  t.tiers?.forEach((tier, tierIdx) => {
    tier.league.matchdays.forEach((md, matchdayIdx) => {
      const source: MatchSource = {
        kind: "league",
        matchdayIdx,
        matchdayName: md.name,
        tierIdx,
        tierName: tier.name,
      }
      md.matches.forEach((m) => visit(groupEntry(m, source)))
    })
  })

  t.rounds.forEach((round, roundIdx) => {
    round.matches.forEach((m) => {
      tieEntries(m, (leg) => ({
        kind: "knockout",
        roundIdx,
        roundName: round.name,
        leg,
      })).forEach(visit)
    })
  })

  if (t.thirdPlaceMatch) {
    tieEntries(t.thirdPlaceMatch, (leg) => ({ kind: "third-place", leg })).forEach(visit)
  }
}

/** Every match in a tournament as a flat array. */
export function allMatches(t: Tournament): MatchEntry[] {
  const out: MatchEntry[] = []
  forEachMatch(t, (e) => out.push(e))
  return out
}

/** Only real fixtures that have been played — byes and pending ties excluded. */
export function playedMatches(t: Tournament): MatchEntry[] {
  return allMatches(t).filter((e) => e.result != null && !isBye(e))
}

/** Every played match involving `teamId`. */
export function matchesForTeam(t: Tournament, teamId: string): MatchEntry[] {
  return playedMatches(t).filter((e) => e.homeId === teamId || e.awayId === teamId)
}
