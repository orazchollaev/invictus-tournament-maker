// engine/hosts.ts
//
// The group/league/knockout helpers only ever read a handful of fields off a
// Tournament: the container they act on, and the scoring rules to apply. They
// used to *declare* the whole `Tournament`, which meant the only thing they
// could ever be pointed at was the tournament's own single container.
//
// The custom format needs the same helpers pointed at a phase's container
// instead. Narrowing the parameter types to these is the whole mechanism:
// a real `Tournament` still satisfies every one of them structurally, so no
// existing call site changes, while a phase can be adapted with a small
// object literal (see engine/customPhases.ts) whose container fields are the
// phase's own reactive arrays — so writes land on the phase, not on a copy.
import type { Group, League, Match, Round, Tiebreaker, Tournament } from "../modules/tournament/types"

/** Table points and tiebreaker rules, plus any per-team point deductions. */
export type ScoringHost = {
  tiebreaker?: Tiebreaker
  winPoints?: number
  drawPoints?: number
  lossPoints?: number
  teamPointAdjustments?: Record<string, number>
}

export type GroupHost = ScoringHost & { groups?: Group[] }

/** `teamIds` is the pool form guidance is computed over, not the whole tournament's. */
export type LeagueHost = ScoringHost & { teamIds: string[]; league?: League }

/**
 * A knockout bracket plus the optional third-place tie hanging off its
 * semifinals.
 *
 * Deliberately no `winnerId`: a tournament has one, a phase does not, so the
 * ops return the winner and let the caller decide where it belongs.
 */
export type KnockoutHost = {
  rounds: Round[]
  hasThirdPlace?: boolean
  thirdPlaceMatch?: Match
}

/** Compile-time proof that a Tournament still satisfies every host shape. */
export type _TournamentIsGroupHost = Tournament extends GroupHost ? true : never
export type _TournamentIsLeagueHost = Tournament extends LeagueHost ? true : never
export type _TournamentIsKnockoutHost = Tournament extends KnockoutHost ? true : never
