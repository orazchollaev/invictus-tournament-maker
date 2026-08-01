import { useTeamsStore } from "@/modules/teams/store"
import type { TeamRef } from "../types"

/** Shown when a season references a team that has since been deleted. */
export const UNKNOWN_TEAM_NAME = "?"
export const UNKNOWN_TEAM_COLOR = "#888"

/** Resolves team ids to the name/colour/flag triple every history row carries. */
export function useTeamRef() {
  const teamsStore = useTeamsStore()

  function teamById(id: string | null | undefined) {
    if (!id) return null
    return teamsStore.teams.find((t) => t.id === id) ?? null
  }

  function teamRef(id: string | null | undefined): TeamRef {
    const team = teamById(id)
    return {
      name: team?.name ?? UNKNOWN_TEAM_NAME,
      color: team?.color ?? UNKNOWN_TEAM_COLOR,
      flag: team?.flag,
    }
  }

  return { teamById, teamRef }
}
