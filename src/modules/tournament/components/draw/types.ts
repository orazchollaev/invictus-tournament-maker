import type { Team, TeamLike } from "@/modules/teams/types"

export interface DrawItem {
  id: string
  team: Team | TeamLike
  subLabel?: string
}

// A team eligible for a playoff bracket manual draw, with a human label
// describing how it qualified (e.g. "Group A · 1st", "Rank 3", "Play-In Winner").
export interface Qualifier {
  teamId: string
  label: string
  teamName: string
}
