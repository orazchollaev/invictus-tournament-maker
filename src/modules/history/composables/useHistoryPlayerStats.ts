// All-time player totals across every completed season of one tournament
// series. Seasons played before v2.2.0 carry no events, so an archive can
// legitimately be empty here — the tab says so rather than showing zeroes.
import { computed, type ComputedRef } from "vue"
import { playedMatches } from "@/engine"
import { usePlayersStore } from "@/modules/players/store"
import type { Tournament } from "@/modules/tournament/types"
import type { PlayerPosition } from "@/modules/players/types"

export interface AllTimePlayerRow {
  playerId: string
  name: string
  teamId: string
  position: PlayerPosition
  seasons: number
  apps: number
  goals: number
  assists: number
  rating: number
}

export function useHistoryPlayerStats(seasons: ComputedRef<Tournament[]>) {
  const playersStore = usePlayersStore()

  const playerRows: ComputedRef<AllTimePlayerRow[]> = computed(() => {
    const totals = new Map<
      string,
      AllTimePlayerRow & { ratingSum: number; seasonKeys: Set<number> }
    >()

    for (const tournament of seasons.value) {
      for (const entry of playedMatches(tournament)) {
        const stats = entry.result?.stats
        if (!stats) continue

        for (const line of stats.lines) {
          if (!line.playerId) continue

          let row = totals.get(line.playerId)
          if (!row) {
            row = {
              playerId: line.playerId,
              name: playersStore.byId(line.playerId)?.name ?? "",
              teamId: "",
              position: line.position,
              seasons: 0,
              apps: 0,
              goals: 0,
              assists: 0,
              rating: 0,
              ratingSum: 0,
              seasonKeys: new Set<number>(),
            }
            totals.set(line.playerId, row)
          }

          row.teamId = (line.side === "home" ? entry.homeId : entry.awayId) ?? row.teamId
          row.seasonKeys.add(tournament.season)
          row.apps += 1
          row.goals += line.goals
          row.assists += line.assists
          row.ratingSum += line.rating
        }
      }
    }

    return [...totals.values()]
      .filter((row) => row.name !== "")
      .map(({ ratingSum, seasonKeys, ...row }) => ({
        ...row,
        seasons: seasonKeys.size,
        rating: Math.round((ratingSum / row.apps) * 10) / 10,
      }))
      .sort((a, b) => b.goals - a.goals || b.assists - a.assists || a.apps - b.apps)
  })

  const hasPlayerHistory = computed(() => playerRows.value.length > 0)

  return { playerRows, hasPlayerHistory }
}
