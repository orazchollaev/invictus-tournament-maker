/**
 * Row shapes shared by the history tabs and the composables that build them.
 *
 * These used to live in the tab SFCs, which meant the composables imported
 * from their own consumers. The types belong to the module, not to a view.
 */

/** The badge-able subset of a team, with fallbacks already applied. */
export interface TeamRef {
  name: string
  color: string
  flag?: string
}

export interface ChampEntry extends TeamRef {
  teamId: string
  wins: number
  finals: number
}

export interface FinalEntry {
  season: number
  champName: string
  champColor: string
  champFlag?: string
  runnerName: string
  runnerColor: string
  runnerFlag?: string
  score: string
}

export interface LeagueSeasonEntry {
  season: number
  first: (TeamRef & { pts: number }) | null
  second: (TeamRef & { pts: number }) | null
  third: (TeamRef & { pts: number }) | null
}

export interface AllTimeRow extends TeamRef {
  teamId: string
  seasons: number
  titles: number
  played: number
  won: number
  drawn: number
  lost: number
  gf: number
  ga: number
  gd: number
  pts: number
}

export interface BiggestWin {
  score: string
  winnerName: string
  winnerColor: string
  winnerFlag?: string
  loserName: string
  loserColor: string
  loserFlag?: string
}

export interface RecordTeam extends TeamRef {
  count: number
}

export interface HistoryStats {
  totalSeasons: number
  totalMatches: number
  totalGoals: number
  avgGoals: string
  topScoringTeam: (TeamRef & { goals: number }) | null
  biggestWin: BiggestWin | null
  mostCleanSheets: RecordTeam | null
  firstChampion: (TeamRef & { season: number }) | null
  longestStreak: RecordTeam | null
  currentStreak: RecordTeam | null
}

export interface TeamSeasonRow {
  season: number
  played: number
  won: number
  drawn: number
  lost: number
  gf: number
  ga: number
  gd: number
  cleanSheets: number
  title: boolean
}

export interface TeamStatEntry extends TeamRef {
  teamId: string
  seasons: number
  titles: number
  played: number
  won: number
  drawn: number
  lost: number
  gf: number
  ga: number
  gd: number
  cleanSheets: number
  seasonBreakdown: TeamSeasonRow[]
}
