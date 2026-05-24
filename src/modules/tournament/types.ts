// modules/tournament/types.ts

export type LegMode = "single" | "double"

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

// ─── Tournament ──────────────────────────────────────────────────
export type TournamentFormat = "bracket" | "group+bracket"

export type PlayoffSeedMode = "cross" | "no-same-group" | "random"

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

  hasThirdPlace?: boolean
  thirdPlaceMatch?: Match

  groupLegMode?: LegMode
  knockoutLegMode?: LegMode
  finalLegMode?: LegMode

  createdAt: number
}
