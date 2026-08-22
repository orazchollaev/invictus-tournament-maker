// Aggregates every generated match line in one tournament into per-player
// totals, then slices them into the rankings the Player Stats panel shows.
//
// Team membership is taken from the fixture rather than from the player
// record, so a player moved to another squad after the fact still counts
// for the team he actually played for.
import { computed, type ComputedRef } from "vue"
import { playedMatches } from "@/engine"
import { usePlayersStore } from "@/modules/players/store"
import type { Tournament } from "../types"
import type { PlayerPosition } from "@/modules/players/types"

export interface PlayerStatRow {
  playerId: string
  name: string
  teamId: string
  position: PlayerPosition
  apps: number
  goals: number
  assists: number
  yellow: number
  red: number
  cleanSheets: number
  saves: number
  conceded: number
  /** Mean match rating across every appearance, one decimal. */
  rating: number
}

/** Ratings need a couple of matches behind them before they mean anything. */
export const MIN_APPS_FOR_RATING = 2

export function useTournamentPlayerStats(getTournament: () => Tournament | undefined) {
  const playersStore = usePlayersStore()

  const rows: ComputedRef<PlayerStatRow[]> = computed(() => {
    const t = getTournament()
    if (!t) return []

    const totals = new Map<string, PlayerStatRow & { ratingSum: number }>()

    for (const entry of playedMatches(t)) {
      const stats = entry.result?.stats
      if (!stats) continue

      for (const line of stats.lines) {
        if (!line.playerId) continue // an unfilled slot is nobody

        const teamId = (line.side === "home" ? entry.homeId : entry.awayId) ?? ""
        let row = totals.get(line.playerId)
        if (!row) {
          row = {
            playerId: line.playerId,
            name: playersStore.byId(line.playerId)?.name ?? "",
            teamId,
            position: line.position,
            apps: 0,
            goals: 0,
            assists: 0,
            yellow: 0,
            red: 0,
            cleanSheets: 0,
            saves: 0,
            conceded: 0,
            rating: 0,
            ratingSum: 0,
          }
          totals.set(line.playerId, row)
        }

        row.apps += 1
        row.goals += line.goals
        row.assists += line.assists
        row.yellow += line.yellow
        row.red += line.red
        if (line.cleanSheet) row.cleanSheets += 1
        row.saves += line.saves ?? 0
        row.conceded += line.conceded ?? 0
        row.ratingSum += line.rating
      }
    }

    return (
      [...totals.values()]
        // A player deleted since the match was played has no name left to show.
        .filter((row) => row.name !== "")
        .map(({ ratingSum, ...row }) => ({
          ...row,
          rating: Math.round((ratingSum / row.apps) * 10) / 10,
        }))
    )
  })

  const hasPlayerStats = computed(() => rows.value.length > 0)

  const topScorers = computed(() =>
    rows.value
      .filter((r) => r.goals > 0)
      .sort((a, b) => b.goals - a.goals || b.assists - a.assists || a.apps - b.apps)
  )

  const topAssists = computed(() =>
    rows.value
      .filter((r) => r.assists > 0)
      .sort((a, b) => b.assists - a.assists || b.goals - a.goals || a.apps - b.apps)
  )

  const topRated = computed(() =>
    rows.value
      .filter((r) => r.apps >= MIN_APPS_FOR_RATING)
      .sort((a, b) => b.rating - a.rating || b.apps - a.apps)
  )

  const keepers = computed(() =>
    rows.value
      .filter((r) => r.position === "GK")
      .sort((a, b) => b.cleanSheets - a.cleanSheets || a.conceded - b.conceded || b.saves - a.saves)
  )

  return { rows, hasPlayerStats, topScorers, topAssists, topRated, keepers }
}
