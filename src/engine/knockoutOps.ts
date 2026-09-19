// engine/knockoutOps.ts
//
// Every rule a knockout bracket has once it is built: what a result does to
// the rounds after it, how a two-legged tie is settled on aggregate, how the
// third-place tie tracks the semifinals, and how far a bulk simulation runs.
//
// This used to live in the tournament store's bracket slice, reachable only
// through `t.rounds`. The custom format has a bracket *per phase*, and a
// second copy of aggregate-and-penalties logic is exactly the kind of thing
// that drifts, so the rules moved here and take the container instead. The
// store slice is now a thin adapter over these.
import type { Team } from "../modules/teams/types"
import type { Match, MatchResult } from "../modules/tournament/types"
import type { KnockoutHost } from "./hosts"
import { getLoserId, getWinnerId, propagateWinners } from "./bracket"
import { decideKnockoutResult } from "./knockout"
import { simulateMatch } from "./simulation"

/** Points the third-place tie at whoever just lost the semifinals. */
export function updateThirdPlaceSlotsIn(host: KnockoutHost) {
  if (!host.hasThirdPlace || !host.thirdPlaceMatch) return
  if (host.rounds.length < 2) return
  const semis = host.rounds[host.rounds.length - 2]
  const m = host.thirdPlaceMatch
  m.homeId = semis.matches[0] ? getLoserId(semis.matches[0]) : null
  m.awayId = semis.matches[1] ? getLoserId(semis.matches[1]) : null
}

/** Whoever won the final, or null while it is still open. */
export function knockoutWinnerId(host: KnockoutHost): string | null {
  const final = host.rounds[host.rounds.length - 1]?.matches[0]
  return final ? getWinnerId(final) : null
}

/**
 * A semifinal changing invalidates the third-place tie. Both legs go, not
 * just leg 1 — otherwise a double-legged third-place match keeps a stale
 * second leg played by the old pair of losers.
 */
export function clearThirdPlaceTie(host: KnockoutHost) {
  const m = host.thirdPlaceMatch
  if (!m) return
  m.result = null
  if (m.leg2Result !== undefined) m.leg2Result = null
}

export function clearDownstreamFrom(host: KnockoutHost, fromRound: number, fromMatch: number) {
  let matchIdx = fromMatch
  for (let r = fromRound + 1; r < host.rounds.length; r++) {
    matchIdx = Math.floor(matchIdx / 2)
    const m = host.rounds[r].matches[matchIdx]
    if (!m) continue
    m.homeId = null
    m.awayId = null
    m.result = null
    if (m.leg2Result !== undefined) m.leg2Result = null
  }
}

/** Re-propagate, re-point the third-place tie, and report the winner. */
export function settleKnockout(host: KnockoutHost, teams: Team[]): string | null {
  propagateWinners(host.rounds, teams)
  updateThirdPlaceSlotsIn(host)
  return knockoutWinnerId(host)
}

/** Everything a result in round `ri` invalidates, before re-settling. */
function invalidateFrom(host: KnockoutHost, ri: number, mi: number) {
  clearDownstreamFrom(host, ri, mi)
  if (ri === host.rounds.length - 2) clearThirdPlaceTie(host)
}

/**
 * Record a leg-1 result and settle everything downstream of it.
 *
 * Takes a whole MatchResult rather than loose numbers so a simulated tie can
 * carry what a typed-in score never has — the score at full time when the tie
 * went to extra time — without hanging another optional positional parameter
 * off the public setter.
 */
export function commitKnockoutResult(
  host: KnockoutHost,
  ri: number,
  mi: number,
  result: MatchResult,
  teams: Team[]
): string | null {
  const match = host.rounds[ri]?.matches[mi]
  if (!match) return knockoutWinnerId(host)
  match.result = result
  // Editing leg 1 of a double-leg match resets leg 2.
  if (match.leg2Result !== undefined) match.leg2Result = null
  invalidateFrom(host, ri, mi)
  return settleKnockout(host, teams)
}

/**
 * Back to unplayed. Leg 1 owns the tie, so clearing it drops leg 2 as well —
 * the same rule commitKnockoutResult already applies when leg 1 is re-entered.
 */
export function clearKnockoutResult(
  host: KnockoutHost,
  ri: number,
  mi: number,
  teams: Team[]
): string | null {
  const match = host.rounds[ri]?.matches[mi]
  if (!match) return knockoutWinnerId(host)
  match.result = null
  if (match.leg2Result !== undefined) match.leg2Result = null
  invalidateFrom(host, ri, mi)
  return settleKnockout(host, teams)
}

export function setKnockoutLeg2(
  host: KnockoutHost,
  ri: number,
  mi: number,
  result: MatchResult,
  teams: Team[]
): string | null {
  const match = host.rounds[ri]?.matches[mi]
  if (!match || match.leg2Result === undefined) return knockoutWinnerId(host)
  match.leg2Result = result
  invalidateFrom(host, ri, mi)
  return settleKnockout(host, teams)
}

export function clearKnockoutLeg2(
  host: KnockoutHost,
  ri: number,
  mi: number,
  teams: Team[]
): string | null {
  const match = host.rounds[ri]?.matches[mi]
  if (!match || match.leg2Result === undefined) return knockoutWinnerId(host)
  match.leg2Result = null
  invalidateFrom(host, ri, mi)
  return settleKnockout(host, teams)
}

/**
 * Leg 2 settles the tie, so extra time and kicks are judged on aggregate, not
 * on the leg. The leg is played with the fixture reversed, so leg 1 goes over
 * flipped into leg 2's own home/away frame — after which penHome and homeId
 * refer to the same side, as everywhere else.
 */
export function decideLeg2Result(
  match: Match,
  teams: Team[],
  adjustments?: Map<string, number>
): MatchResult {
  const leg2Sim = { id: match.id, homeId: match.awayId, awayId: match.homeId }
  return decideKnockoutResult(leg2Sim as never, teams, {
    adjustments,
    aggregateOffset: { home: match.result!.away, away: match.result!.home },
  }).result
}

/** Plays whichever legs of a double-legged tie are still outstanding. */
function playDoubleLeg(
  host: KnockoutHost,
  ri: number,
  mi: number,
  teams: Team[],
  adjustments?: Map<string, number>
) {
  const match = host.rounds[ri]?.matches[mi]
  if (!match || !match.homeId || !match.awayId) return
  if (!match.result) match.result = simulateMatch(match, teams, adjustments)
  if (match.leg2Result === null) match.leg2Result = decideLeg2Result(match, teams, adjustments)
}

/** Leg 1 only, dropping any leg 2 already played — it belonged to the old score. */
export function simulateKnockoutLeg1(
  host: KnockoutHost,
  ri: number,
  mi: number,
  teams: Team[],
  adjustments?: Map<string, number>
): string | null {
  const match = host.rounds[ri]?.matches[mi]
  if (!match || !match.homeId || !match.awayId) return knockoutWinnerId(host)
  if (match.leg2Result === undefined) return knockoutWinnerId(host)
  match.result = simulateMatch(match, teams, adjustments)
  match.leg2Result = null
  invalidateFrom(host, ri, mi)
  return settleKnockout(host, teams)
}

export function simulateKnockoutLeg2(
  host: KnockoutHost,
  ri: number,
  mi: number,
  teams: Team[],
  adjustments?: Map<string, number>
): string | null {
  const match = host.rounds[ri]?.matches[mi]
  if (!match || !match.homeId || !match.awayId || !match.result) return knockoutWinnerId(host)
  if (match.leg2Result === undefined) return knockoutWinnerId(host)
  match.leg2Result = decideLeg2Result(match, teams, adjustments)
  return settleKnockout(host, teams)
}

/** One tie, single- or double-legged. */
export function simulateKnockoutTie(
  host: KnockoutHost,
  ri: number,
  mi: number,
  teams: Team[],
  adjustments?: Map<string, number>
): string | null {
  const match = host.rounds[ri]?.matches[mi]
  if (!match || !match.homeId || !match.awayId) return knockoutWinnerId(host)
  if (match.leg2Result !== undefined) {
    playDoubleLeg(host, ri, mi, teams, adjustments)
    return settleKnockout(host, teams)
  }
  return commitKnockoutResult(
    host,
    ri,
    mi,
    decideKnockoutResult(match, teams, { adjustments }).result,
    teams
  )
}

export function simulateKnockoutRound(
  host: KnockoutHost,
  ri: number,
  teams: Team[],
  adjustments?: Map<string, number>
): string | null {
  const round = host.rounds[ri]
  if (!round) return knockoutWinnerId(host)
  propagateWinners(host.rounds, teams)
  round.matches.forEach((match, mi) => {
    if (!match.homeId || !match.awayId) return
    if (!match.result) {
      if (match.leg2Result !== undefined) playDoubleLeg(host, ri, mi, teams, adjustments)
      else match.result = decideKnockoutResult(match, teams, { adjustments }).result
    } else if (match.leg2Result === null) {
      // Leg 1 done, leg 2 outstanding.
      playDoubleLeg(host, ri, mi, teams, adjustments)
    }
  })
  return settleKnockout(host, teams)
}

export interface SimulateAllOptions {
  /**
   * Recomputed per round so a run of wins earlier in the bracket feeds into
   * the next one, the way it does matchday by matchday in a league.
   */
  adjustments?: () => Map<string, number> | undefined
  /**
   * Asked after each round: true stops the run there. Manager mode uses it to
   * hand back control the moment a later round holds a tie of the user's own.
   */
  stopAfterRound?: (nextRound: number) => boolean
  /** Runs once the bracket itself is finished — the third-place tie. */
  onFinished?: () => void
}

export function simulateKnockoutAll(
  host: KnockoutHost,
  teams: Team[],
  opts: SimulateAllOptions = {}
): string | null {
  for (let r = 0; r < host.rounds.length; r++) {
    const adjustments = opts.adjustments?.()
    propagateWinners(host.rounds, teams)
    host.rounds[r].matches.forEach((match, mi) => {
      if (!match.homeId || !match.awayId) return
      if (match.leg2Result !== undefined) playDoubleLeg(host, r, mi, teams, adjustments)
      else if (!match.result)
        match.result = decideKnockoutResult(match, teams, { adjustments }).result
    })
    propagateWinners(host.rounds, teams)
    if (opts.stopAfterRound?.(r + 1)) return knockoutWinnerId(host)
  }
  propagateWinners(host.rounds, teams)
  updateThirdPlaceSlotsIn(host)
  opts.onFinished?.()
  return knockoutWinnerId(host)
}

/**
 * True once a later round holds a real, unplayed tie for teamId — win a round
 * and it is this that stops a bulk simulation from blowing straight past
 * whatever the managed side is seeded into next, bye or not.
 */
export function hasTieFrom(host: KnockoutHost, fromRound: number, teamId?: string): boolean {
  if (!teamId) return false
  for (let r = fromRound; r < host.rounds.length; r++) {
    const hit = host.rounds[r].matches.some(
      (m) => !m.result && (m.homeId === teamId || m.awayId === teamId)
    )
    if (hit) return true
  }
  return false
}

/** The third-place tie, single- or double-legged. */
export function simulateThirdPlaceTie(
  host: KnockoutHost,
  teams: Team[],
  adjustments?: Map<string, number>
) {
  const m = host.thirdPlaceMatch
  if (!m || !m.homeId || !m.awayId) return
  if (m.leg2Result !== undefined) {
    if (!m.result) {
      m.result = simulateMatch(m, teams, adjustments)
      m.leg2Result = null
    }
    if (m.leg2Result === null) m.leg2Result = decideLeg2Result(m, teams, adjustments)
    return
  }
  if (m.result) return
  m.result = decideKnockoutResult(m, teams, { adjustments }).result
}

/** Every tie in the bracket is decided (byes and empty slots aside). */
export function knockoutComplete(host: KnockoutHost): boolean {
  for (const round of host.rounds) {
    for (const match of round.matches) {
      if (!match.homeId || !match.awayId) continue
      if (!match.result) return false
      if (match.leg2Result !== undefined && match.leg2Result === null) return false
    }
  }
  const m = host.thirdPlaceMatch
  if (m && m.homeId && m.awayId) {
    if (!m.result) return false
    if (m.leg2Result !== undefined && m.leg2Result === null) return false
  }
  return true
}
