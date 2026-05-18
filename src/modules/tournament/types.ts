export type MatchResult = { home: number; away: number; penHome?: number; penAway?: number }

export interface Match {
  id: string
  homeId: string | null // null = TBD
  awayId: string | null
  result: MatchResult | null
}

export interface Round {
  name: string
  matches: Match[]
}

export interface Tournament {
  id: string
  name: string
  season: number
  teamIds: string[]
  rounds: Round[]
  winnerId: string | null
  createdAt: number
}
