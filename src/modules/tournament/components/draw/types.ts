import type { Team, TeamLike } from "@/modules/teams/types"

export interface DrawItem {
  id: string
  team: Team | TeamLike
  subLabel?: string
}
