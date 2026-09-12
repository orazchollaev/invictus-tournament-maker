// modules/tournament/types.ts
import type { PlayerPosition } from "@/modules/players/types"
import type { Formation, PlayStyle } from "@/modules/teams/types"

export type LegMode = "single" | "double" | "triple" | "quadruple" | "half"
export type Tiebreaker = "head-to-head" | "goal-diff"

// Named knockout stages, keyed by distance from the final (1 = semifinal, … 5+ = r64).
// Independent of actual bracket size — see engine/bracket.ts:stageForDistance.
export type KnockoutStage = "r64" | "r32" | "r16" | "quarterfinal" | "semifinal"

// ─── Match events & statistics ───────────────────────────────────
// Events hang off MatchResult, which is the one shape shared by every
// container: knockout legs, group matches, league matches, third place.
// One optional field therefore covers all formats.

export type MatchEventType = "goal" | "ownGoal" | "penGoal" | "penMiss" | "yellow" | "red" | "sub"

export interface MatchEvent {
  minute: number // 1-90 (90+ in stoppage), or 91-120 when the tie went to extra time
  type: MatchEventType
  side: "home" | "away" // the side the event is credited to
  /**
   * For every type but "sub": the player the event happened to.
   * For "sub": the player coming ON. null on either field means an
   * unfilled squad slot, never aggregated.
   */
  playerId: string | null
  /** For "sub", the player going OFF. For a goal, the assist (if any). */
  assistId?: string | null
}

export interface PlayerMatchLine {
  playerId: string | null
  side: "home" | "away"
  position: PlayerPosition
  goals: number
  assists: number
  yellow: number
  red: number
  saves?: number // goalkeepers only
  conceded?: number // goalkeepers only
  cleanSheet?: boolean // goalkeepers and defenders
  rating: number // 1.0-10.0, one decimal
  /**
   * Present only when this player was part of a substitution — either the
   * one who came off or the one who came on. Its absence means all 90 (or
   * 120) minutes; the two lines sharing a slot always sum to the full match.
   */
  minutesPlayed?: number
}

/** One in-match substitution, home or away. */
export interface Substitution {
  minute: number
  side: "home" | "away"
  outPlayerId: string | null // null = an Unknown slot went off
  inPlayerId: string | null // null = replaced by another Unknown slot
  position: PlayerPosition
  reason?: "tactical" | "injury"
  /** Present only when `reason` is "injury": his team's next N matches he is ruled out of. */
  injuryMatches?: number
}

/** Team-level colour, simulated from the power gap and the score. */
export interface TeamMatchStats {
  possession: number // home share, 0-100; away is the remainder
  shots: [number, number]
  onTarget: [number, number]
  corners: [number, number]
  fouls: [number, number]
  /** Expected goals, one decimal. Driven by shot volume/quality, not by the actual goals scored. */
  xg: [number, number]
  /** Clear-cut chances, a subset of onTarget. */
  bigChances: [number, number]
  offsides: [number, number]
}

/** One kick of a penalty shootout, in the order it was taken. */
export interface ShootoutKick {
  order: number // 1-based, alternating home/away
  side: "home" | "away"
  playerId: string | null
  scored: boolean
}

export interface MatchStats {
  events: MatchEvent[]
  lines: PlayerMatchLine[]
  team: TeamMatchStats
  /** Only set when the tie went to a shootout. */
  shootout?: ShootoutKick[]
  /** In-match substitutions, both sides, minute order. */
  substitutions?: Substitution[]
}

/**
 * A sending-off, rolled *before* the score rather than decorated onto it
 * afterwards. Stored on the result so the scoreline, the timeline and the
 * next match's discipline penalty all read the same dismissal.
 */
export interface RedCard {
  side: "home" | "away"
  minute: number // 1-90; extra-time dismissals stay cosmetic and live in stats only
}

export interface MatchResult {
  /** Final score. Includes extra-time goals when the tie went that far. */
  home: number
  away: number
  /**
   * The score at 90'. Set only when the tie went to extra time, so its
   * presence is what "a.e.t." means — every other result ended in normal
   * time. Group and league matches never have it: extra time is only ever
   * played where a winner is required.
   */
  ft?: { home: number; away: number }
  penHome?: number
  penAway?: number
  /**
   * Dismissals that were part of simulating this result. Absent on a
   * hand-entered score and on anything played before v2.7.0 — the event
   * generator then rolls its own reds, which stay purely cosmetic.
   */
  reds?: RedCard[]
  /**
   * undefined — not generated yet; `ensureMatchStats` will fill it.
   * null      — played before v2.2.0; deliberately never generated.
   */
  stats?: MatchStats | null
}

export interface Match {
  id: string
  homeId: string | null
  awayId: string | null
  result: MatchResult | null
  // undefined = single-leg, null = double-leg leg2 not yet played, object = played
  leg2Result?: MatchResult | null
}

export interface Round {
  name: string
  matches: Match[]
}

// ─── Group Stage ────────────────────────────────────────────────
export interface GroupMatch {
  id: string
  homeId: string
  awayId: string
  result: MatchResult | null
}

export interface GroupStanding {
  teamId: string
  played: number
  won: number
  drawn: number
  lost: number
  gf: number // goals for
  ga: number // goals against
  gd: number // goal difference
  pts: number
}

export interface Group {
  name: string // "Group A", "Group B", …
  teamIds: string[]
  matches: GroupMatch[]
  standings: GroupStanding[]
}

// ─── League ──────────────────────────────────────────────────────
export interface LeagueMatchday {
  name: string // "Matchday 1", "Matchday 2", …
  matches: GroupMatch[]
}

export interface League {
  matchdays: LeagueMatchday[]
  standings: GroupStanding[]
  legMode: LegMode
}

export type LeaguePlayoffSeedMode = "seeded" | "random" | "manual"

export interface LeaguePlayoff {
  enabled: boolean
  qualifierCount: number // top N of the final table make the playoff
  seedMode: LeaguePlayoffSeedMode
  started: boolean // true once the playoff bracket has been seeded — locks settings
}

/**
 * Swiss league-phase settings (only when format === "swiss").
 *
 * The fixture itself lives in the ordinary `league` container, so every league
 * helper (standings, tiebreakers, result entry, simulation, playoff seeding,
 * match iteration, history) works on a Swiss tournament unchanged. Only the
 * fixture *generation* differs: instead of a full round-robin, each team faces
 * `opponentCount` distinct opponents drawn from pots.
 *
 * Legs per opponent are read from `league.legMode`; the draw method from
 * `drawType` ("random" | "seeded" — Swiss has no manual draw).
 */
export interface SwissConfig {
  opponentCount: number // how many DISTINCT opponents each team faces
  potCount: number // 1 = no pots; >1 = power-ranked pots with an equal quota each
  balanceHomeAway: boolean // best-effort even split of home/away games
  seed: number // RNG seed the draw was generated with, so it can be reproduced
}

export interface LeagueTier {
  name: string // "Division 1", "Division 2", …
  teamIds: string[]
  league: League
  playoff?: LeaguePlayoff // only ever set on tiers[0] (top tier)
}

// ─── Manager mode ────────────────────────────────────────────────
/**
 * One team in this tournament is run by the user rather than simulated.
 *
 * Per tournament, not per team: the same club can be yours in the league and
 * an opponent in the cup. A new season carries it forward, because managing a
 * side is a commitment to a campaign rather than to a fixture.
 */
export interface ManagerState {
  teamId: string
  /** The user's default set-up, seeded from the club's own coach. */
  formation: Formation
  style: PlayStyle
  startedAt: number
}

// ─── Tournament ──────────────────────────────────────────────────
export type TournamentFormat = "bracket" | "group+bracket" | "league" | "swiss"

export type PlayoffSeedMode = "cross" | "no-same-group" | "random" | "manual"
export type DrawType = "random" | "seeded" | "manual"

export interface Tournament {
  id: string
  name: string
  season: number
  format: TournamentFormat
  teamIds: string[]

  // bracket-only / knockout phase
  rounds: Round[]
  winnerId: string | null

  // group stage (only when format === "group+bracket")
  groups?: Group[]
  groupsDone?: boolean // true once bracket has been seeded from groups
  qualifiersPerGroup?: number // how many teams advance per group (default 2)
  playoffSeedMode?: PlayoffSeedMode // how groups feed into the bracket
  drawType?: DrawType // draw method used at creation/season-start

  hasThirdPlace?: boolean
  thirdPlaceMatch?: Match

  groupLegMode?: LegMode
  knockoutLegMode?: LegMode // fallback default for any stage not overridden in roundLegModes
  finalLegMode?: LegMode
  roundLegModes?: Partial<Record<KnockoutStage, LegMode>> // per-stage overrides (r64…semifinal)
  thirdPlaceLegMode?: LegMode

  tiebreaker?: Tiebreaker

  // league (only when format === "league")
  league?: League
  leaguePlayoff?: LeaguePlayoff // single-tier league playoff (mirrors LeagueTier.playoff)

  // swiss (only when format === "swiss") — the fixture lives in `league` above
  swiss?: SwissConfig

  // wildcard slots: best N teams at rank `qualifiersPerGroup` across all groups
  wildcardCount?: number

  // multi-tier league (array of tiers ordered top→bottom, replaces single `league` when set)
  tiers?: LeagueTier[]
  // how many teams swap between adjacent tiers at season end
  promotionCount?: number

  // scoring points (group+bracket and league formats)
  winPoints?: number
  drawPoints?: number
  lossPoints?: number

  // one team run by the user rather than simulated (see ManagerState)
  manager?: ManagerState

  // per-team adjustments for this season only (reset on new season)
  teamPointAdjustments?: Record<string, number> // +/- table points per team
  teamPowerAdjustments?: Record<string, number> // +/- power rating per team

  createdAt: number
}
