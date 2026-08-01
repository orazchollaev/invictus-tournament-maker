import type { ComputedRef } from "vue"
import type { Tournament } from "@/modules/tournament/types"
import { useChampions } from "./useChampions"
import { useHistoryOverviewStats } from "./useHistoryOverviewStats"
import { useHistoryTeamStats } from "./useHistoryTeamStats"
import { useLeagueAllTime } from "./useLeagueAllTime"

/**
 * Everything the history page's six tabs render, in one call.
 *
 * Each group of derived data lives in its own composable; this is just the
 * facade so a page doesn't have to know which one owns what.
 */
export function useTournamentHistoryStats(completedSeasons: ComputedRef<Tournament[]>) {
  const { champions, finals } = useChampions(completedSeasons)
  const { leagueSeasons, allTimeRows } = useLeagueAllTime(completedSeasons)
  const { stats } = useHistoryOverviewStats(completedSeasons)
  const { teamStats } = useHistoryTeamStats(completedSeasons)

  return { champions, finals, leagueSeasons, allTimeRows, stats, teamStats }
}
