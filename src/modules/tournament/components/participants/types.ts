import type { Team } from "@/modules/teams/types"

export interface TeamStats {
  played: number
  wins: number
  draws: number
  losses: number
  gf: number
  ga: number
}

/** How a team finished, plus the tallies shown next to it. */
export interface ParticipantRow {
  team: Team
  isWinner: boolean
  isSecondPlace: boolean
  isThirdPlace: boolean
  isFourthPlace: boolean
  eliminatedRound: string | null
  /**
   * Sort key for "how far did they get". Lower is better within a band:
   * `-2` podium via the third-place match, `-1` still alive, `0…n` knockout
   * round index, `1000+n` playoff round index, league position otherwise.
   */
  eliminatedRoundIdx: number
  groupName: string | null
  stats: TeamStats
  leaguePosition: number | null
  tierLabel: string | null
  posInTier: number | null
}

export type SortKey =
  "result" | "name" | "group" | "power" | "wins" | "draws" | "losses" | "gf" | "ga" | "gd"

export const EMPTY_STATS: TeamStats = {
  played: 0,
  wins: 0,
  draws: 0,
  losses: 0,
  gf: 0,
  ga: 0,
}

/** The neutral finish — every builder starts here and overrides what applies. */
export const NO_FINISH: Omit<ParticipantRow, "team" | "groupName" | "stats"> = {
  isWinner: false,
  isSecondPlace: false,
  isThirdPlace: false,
  isFourthPlace: false,
  eliminatedRound: null,
  eliminatedRoundIdx: -1,
  leaguePosition: null,
  tierLabel: null,
  posInTier: null,
}
