// engine/doubleElim.ts
//
// Double elimination, laid out so every existing knockout operation keeps
// working on it unchanged.
//
// The whole bracket lives in the ordinary `rounds` array, flat:
//
//   [ winners 0..k-1 | losers 0..2k-4 | grand final | grand-final reset ]
//
// with k = the number of winners rounds, so a double bracket always holds
// exactly 3k rounds. Recording a result, a second leg, simulating a tie or a
// round all address a match as (round, match) and never ask what kind of round
// it is — only *what a result does to the rounds after it* differs, and that is
// `reconcileDoubleElim` below. `host.doubleElim` is what says the array is laid
// out this way; the round count alone cannot (a single bracket of 3 rounds is a
// different shape from a double one of k = 1).
import type { Team } from "../modules/teams/types"
import type { KnockoutStage, LegMode, Match, Round, Tournament } from "../modules/tournament/types"
import {
  applyLegModes,
  getLoserId,
  getWinnerId,
  propagateWinners,
  resolveRoundLegMode,
} from "./bracket"
import { uid } from "./utils"

/** Two teams make one tie, which is not a bracket with a second chance in it. */
export const DOUBLE_ELIM_MIN_TEAMS = 3

type RoundsHost = { doubleElim?: boolean }

export interface DoubleElimLayout {
  /** Winners rounds; the whole bracket is 3 × this many rounds. */
  winners: number
  losersStart: number
  losersCount: number
  grandFinal: number
  reset: number
}

export function doubleElimLayout(roundCount: number): DoubleElimLayout {
  const winners = Math.floor(roundCount / 3)
  return {
    winners,
    losersStart: winners,
    losersCount: Math.max(0, 2 * winners - 2),
    grandFinal: 3 * winners - 2,
    reset: 3 * winners - 1,
  }
}

export type BracketSection = "winners" | "losers" | "grandFinal" | "reset"

/** Which part of a double bracket a flat round index falls in. */
export function sectionOfRound(roundCount: number, ri: number): BracketSection {
  const l = doubleElimLayout(roundCount)
  if (ri < l.losersStart) return "winners"
  if (ri < l.grandFinal) return "losers"
  return ri === l.grandFinal ? "grandFinal" : "reset"
}

/**
 * Winners-bracket rounds wrapped into a full double bracket. The winners
 * rounds come in already built (byes resolved, seeded however the caller
 * likes); the losers bracket, grand final and reset are created empty and
 * filled by the first reconcile.
 */
export function buildDoubleElimRounds(winners: Round[]): Round[] {
  const k = winners.length
  const rounds: Round[] = winners.map((r, i) => ({
    name: i === k - 1 ? "Winners Final" : `Winners Round ${i + 1}`,
    matches: r.matches,
  }))

  const emptyMatch = (): Match => ({ id: uid(), homeId: null, awayId: null, result: null })
  // Match count per losers round: the first takes the winners' first-round
  // losers in pairs; after that a round either takes those pairs on again or
  // takes a drop-down from the winners bracket, alternately.
  const size = winners[0].matches.length
  let count = Math.max(1, size / 2)
  const losersCount = 2 * k - 2
  for (let lr = 0; lr < losersCount; lr++) {
    if (lr > 0 && lr % 2 === 0) count = Math.max(1, count / 2)
    rounds.push({
      name: lr === losersCount - 1 ? "Losers Final" : `Losers Round ${lr + 1}`,
      matches: Array.from({ length: count }, emptyMatch),
    })
  }

  rounds.push({ name: "Grand Final", matches: [emptyMatch()] })
  rounds.push({ name: "Grand Final Reset", matches: [emptyMatch()] })
  reconcileDoubleElim(rounds)
  return rounds
}

// ─── Wiring ──────────────────────────────────────────────────────

interface Source {
  kind: "winner" | "loser"
  round: number
  match: number
}

/** The two matches whose outcome fills match (ri, mi), or null for a seeded one. */
function feedersOf(roundCount: number, ri: number, mi: number): [Source, Source] | null {
  const l = doubleElimLayout(roundCount)
  const k = l.winners
  if (ri < k) {
    if (ri === 0) return null
    return [
      { kind: "winner", round: ri - 1, match: mi * 2 },
      { kind: "winner", round: ri - 1, match: mi * 2 + 1 },
    ]
  }
  if (ri === l.grandFinal) {
    return [
      { kind: "winner", round: k - 1, match: 0 },
      { kind: "winner", round: l.grandFinal - 1, match: 0 },
    ]
  }
  if (ri === l.reset) return null
  const lr = ri - l.losersStart
  if (lr === 0) {
    return [
      { kind: "loser", round: 0, match: mi * 2 },
      { kind: "loser", round: 0, match: mi * 2 + 1 },
    ]
  }
  if (lr % 2 === 1) {
    return [
      { kind: "winner", round: ri - 1, match: mi },
      { kind: "loser", round: (lr + 1) / 2, match: mi },
    ]
  }
  return [
    { kind: "winner", round: ri - 1, match: mi * 2 },
    { kind: "winner", round: ri - 1, match: mi * 2 + 1 },
  ]
}

/**
 * A source that will never produce a team. Only the winners' first round has
 * them (a bye has no loser), and a losers match fed by two of them is empty in
 * turn — which is what lets a bye in round one simply fall through the losers
 * bracket instead of leaving a tie waiting on someone who does not exist.
 */
function isVoid(rounds: Round[], src: Source): boolean {
  const match = rounds[src.round]?.matches[src.match]
  if (!match) return true
  const k = doubleElimLayout(rounds.length).winners
  if (src.round === 0) {
    const bye = (!match.homeId && match.awayId) || (match.homeId && !match.awayId)
    return src.kind === "loser" ? !!bye || (!match.homeId && !match.awayId) : false
  }
  if (src.round < k) return false
  const feeders = feedersOf(rounds.length, src.round, src.match)
  if (!feeders) return false
  return feeders.every((f) => isVoid(rounds, f))
}

function teamOf(rounds: Round[], src: Source): string | null {
  const match = rounds[src.round]?.matches[src.match]
  if (!match) return null
  return src.kind === "winner" ? getWinnerId(match) : getLoserId(match)
}

function assign(match: Match, homeId: string | null, awayId: string | null) {
  if (match.homeId === homeId && match.awayId === awayId) return
  match.homeId = homeId
  match.awayId = awayId
  match.result = null
  if (match.leg2Result !== undefined) match.leg2Result = null
}

/**
 * Fills every round after the first from the results before it, and drops any
 * result whose two teams are no longer the ones that played it.
 *
 * One forward pass is enough: every match depends only on earlier rounds in the
 * flat order. A result that still stands after an edit upstream (a 2-1 retyped
 * as 3-0, same winner) keeps everything downstream of it; one that changes who
 * advances, or who drops down, clears exactly the ties that depended on it.
 */
export function reconcileDoubleElim(rounds: Round[]) {
  const l = doubleElimLayout(rounds.length)
  for (let ri = 1; ri < rounds.length; ri++) {
    rounds[ri].matches.forEach((match, mi) => {
      if (ri === l.reset) {
        const gf = rounds[l.grandFinal].matches[0]
        const w = getWinnerId(gf)
        // The side that came through the losers bracket needs two wins to take
        // the title; the reset only exists once they have the first.
        if (w && w === gf.awayId) assign(match, gf.homeId, gf.awayId)
        else assign(match, null, null)
        return
      }
      const feeders = feedersOf(rounds.length, ri, mi)
      if (!feeders) return
      const [a, b] = feeders
      const inLosers = ri >= l.losersStart && ri < l.grandFinal
      const voidA = inLosers && isVoid(rounds, a)
      const voidB = inLosers && isVoid(rounds, b)
      const home = voidA ? null : teamOf(rounds, a)
      const away = voidB ? null : teamOf(rounds, b)
      assign(match, home, away)
      // A tie with one real side and one that will never arrive is a bye, and
      // settles the way a winners-bracket bye does.
      if (inLosers && !match.result) {
        // A two-legged tie needs its second leg to read as played, or the
        // aggregate never settles and the bye never moves on.
        if (voidA && away) {
          match.result = { home: 0, away: 1 }
          if (match.leg2Result !== undefined) match.leg2Result = { home: 1, away: 0 }
        } else if (voidB && home) {
          match.result = { home: 1, away: 0 }
          if (match.leg2Result !== undefined) match.leg2Result = { home: 0, away: 1 }
        }
      }
    })
  }
}

// ─── Outcome ─────────────────────────────────────────────────────

/** Whoever holds the title, or null while the grand final (or its reset) is open. */
export function doubleElimWinnerId(rounds: Round[]): string | null {
  const l = doubleElimLayout(rounds.length)
  const gf = rounds[l.grandFinal]?.matches[0]
  const reset = rounds[l.reset]?.matches[0]
  if (!gf) return null
  if (reset?.homeId && reset.awayId) return getWinnerId(reset)
  const w = getWinnerId(gf)
  return w && w === gf.homeId ? w : null
}

/**
 * The field ranked by how far each side got: champion, the other grand
 * finalist, then the losers of each losers round from the last back to the
 * first. Every team but the finalists goes out in the losers bracket, so that
 * walk covers the lot.
 */
export function doubleElimPlacements(rounds: Round[]): string[] {
  const l = doubleElimLayout(rounds.length)
  const order: string[] = []
  const push = (id: string | null) => {
    if (id && !order.includes(id)) order.push(id)
  }
  const champion = doubleElimWinnerId(rounds)
  push(champion)
  const gf = rounds[l.grandFinal]?.matches[0]
  if (gf) {
    push(gf.homeId === champion ? gf.awayId : gf.homeId)
  }
  for (let ri = l.grandFinal - 1; ri >= l.losersStart; ri--) {
    for (const match of rounds[ri].matches) push(getLoserId(match))
  }
  return order
}

// ─── Leg modes ───────────────────────────────────────────────────

/**
 * Leg modes for a double bracket. The winners rounds before the winners final
 * follow the per-stage overrides exactly as a single bracket's do; the winners
 * final and the whole losers bracket use the general knockout setting, and the
 * grand final and its reset use the final's — they are what decides the title.
 */
export function applyDoubleElimLegModes(
  rounds: Round[],
  t: Pick<Tournament, "knockoutLegMode" | "roundLegModes" | "finalLegMode">
) {
  const l = doubleElimLayout(rounds.length)
  const general: LegMode = t.knockoutLegMode ?? "single"
  const final: LegMode = t.finalLegMode ?? "single"
  rounds.forEach((round, ri) => {
    const mode: LegMode =
      ri === l.grandFinal || ri === l.reset
        ? final
        : ri < l.winners - 1
          ? resolveRoundLegMode(t, l.winners - 1 - ri)
          : general
    if (mode === "single") return
    round.matches.forEach((m) => {
      const bye = (m.homeId && !m.awayId) || (!m.homeId && m.awayId)
      if (!bye) m.leg2Result = null
    })
  })
}

/**
 * The one place a freshly seeded winners bracket becomes the knockout a
 * tournament or phase actually plays: leg modes applied and results pushed
 * forward, wrapped into the double layout first when that is what was asked for.
 */
export function finalizeBracket(
  winners: Round[],
  t: Pick<Tournament, "knockoutLegMode" | "roundLegModes" | "finalLegMode"> & RoundsHost,
  teams: Team[]
): Round[] {
  if (!t.doubleElim || winners.length < 2) {
    applyLegModes(winners, t)
    propagateWinners(winners, teams)
    return winners
  }
  propagateWinners(winners, teams)
  const rounds = buildDoubleElimRounds(winners)
  applyDoubleElimLegModes(rounds, t)
  return rounds
}

/** Stage keys the per-round leg settings expose for a double bracket's winners side. */
export function doubleElimLegStages(winnersRounds: number): KnockoutStage[] {
  const stages: KnockoutStage[] = []
  for (let d = Math.min(winnersRounds - 1, 5); d >= 1; d--) {
    stages.push(["", "semifinal", "quarterfinal", "r16", "r32", "r64"][d] as KnockoutStage)
  }
  return stages
}

/** The match that crowns the champion: the reset once it exists, else the grand final. */
export function doubleElimDecidingMatch(rounds: Round[]): Match | undefined {
  const l = doubleElimLayout(rounds.length)
  const reset = rounds[l.reset]?.matches[0]
  if (reset?.homeId && reset.awayId) return reset
  return rounds[l.grandFinal]?.matches[0]
}

/** Re-settles a host's double bracket and reports the champion. */
export function settleDoubleElim(host: { rounds: Round[] }, _teams?: Team[]): string | null {
  reconcileDoubleElim(host.rounds)
  return doubleElimWinnerId(host.rounds)
}

export function isDoubleElim(host: RoundsHost): boolean {
  return host.doubleElim === true
}
