// modules/tournament/types.ts

export type LegMode = "single" | "double" | "triple" | "quadruple"
export type Tiebreaker = "head-to-head" | "goal-diff"

export interface MatchResult {
  home: number
  away: number
  penHome?: number
  penAway?: number
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

export interface LeagueTier {
  name: string // "Division 1", "Division 2", …
  teamIds: string[]
  league: League
  playoff?: LeaguePlayoff // only ever set on tiers[0] (top tier)
}

// ─── Tournament ──────────────────────────────────────────────────
export type TournamentFormat = "bracket" | "group+bracket" | "league"

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
  knockoutLegMode?: LegMode
  finalLegMode?: LegMode

  tiebreaker?: Tiebreaker

  // league (only when format === "league")
  league?: League
  leaguePlayoff?: LeaguePlayoff // single-tier league playoff (mirrors LeagueTier.playoff)

  // wildcard slots: best N teams at rank `qualifiersPerGroup` across all groups
  wildcardCount?: number

  // league promotion/relegation: how many bottom teams swap out each new season
  relegationCount?: number

  // optional link to a second league for automatic promotion/relegation swaps
  linkedLeagueId?: string

  // multi-tier league (array of tiers ordered top→bottom, replaces single `league` when set)
  tiers?: LeagueTier[]
  // how many teams swap between adjacent tiers at season end
  promotionCount?: number

  // scoring points (group+bracket and league formats)
  winPoints?: number
  drawPoints?: number
  lossPoints?: number

  // per-team adjustments for this season only (reset on new season)
  teamPointAdjustments?: Record<string, number> // +/- table points per team
  teamPowerAdjustments?: Record<string, number> // +/- power rating per team

  createdAt: number
}
