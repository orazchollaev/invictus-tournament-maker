import { toValue } from "vue"
import type { MaybeRefOrGetter } from "vue"
import type { Team } from "@/modules/teams/types"

export function useTeamLookup(teams: MaybeRefOrGetter<Team[]>) {
  function teamById(id: string | null | undefined) {
    if (!id) return undefined
    return toValue(teams).find((t) => t.id === id)
  }

  function getTeamName(id: string | null | undefined) {
    if (!id) return "BYE"
    return teamById(id)?.name ?? "Unknown"
  }

  function getTeamColor(id: string | null | undefined) {
    if (!id) return "#999"
    return teamById(id)?.color ?? "#999"
  }

  return { teamById, getTeamName, getTeamColor }
}
