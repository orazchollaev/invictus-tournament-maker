import { computed, type ComputedRef } from "vue"
import type { Tournament } from "@/modules/tournament/types"
import type { HistoryStats } from "../types"
import { knockoutGoals } from "./matchFormat"
import { useTeamRef } from "./useTeamRef"

/** A streak shorter than this is not worth reporting. */
const MIN_REPORTABLE_STREAK = 2

/** The headline numbers on the Statistics tab: totals, records and title streaks. */
export function useHistoryOverviewStats(completedSeasons: ComputedRef<Tournament[]>) {
  const { teamRef } = useTeamRef()

  const stats = computed<HistoryStats>(() => {
    let totalMatches = 0
    let totalGoals = 0

    const teamGoals = new Map<string, number>()
    const teamCleanSheets = new Map<string, number>()
    let biggestWinDiff = 0
    let biggestWin: HistoryStats["biggestWin"] = null

    /** One played leg, from the perspective of whoever was home *in that leg*. */
    function trackLeg(
      homeId: string | null | undefined,
      awayId: string | null | undefined,
      homeG: number,
      awayG: number
    ) {
      if (!homeId || !awayId) return
      teamGoals.set(homeId, (teamGoals.get(homeId) ?? 0) + homeG)
      teamGoals.set(awayId, (teamGoals.get(awayId) ?? 0) + awayG)
      if (awayG === 0) teamCleanSheets.set(homeId, (teamCleanSheets.get(homeId) ?? 0) + 1)
      if (homeG === 0) teamCleanSheets.set(awayId, (teamCleanSheets.get(awayId) ?? 0) + 1)

      const diff = Math.abs(homeG - awayG)
      if (diff > biggestWinDiff) {
        biggestWinDiff = diff
        const [wId, lId, wG, lG] =
          homeG > awayG ? [homeId, awayId, homeG, awayG] : [awayId, homeId, awayG, homeG]
        const w = teamRef(wId)
        const l = teamRef(lId)
        biggestWin = {
          score: `${wG}–${lG}`,
          winnerName: w.name,
          winnerColor: w.color,
          winnerFlag: w.flag,
          loserName: l.name,
          loserColor: l.color,
          loserFlag: l.flag,
        }
      }
    }

    /**
     * Knockout ties count as one match but contribute both legs' goals — kept as-is
     * from the original implementation so the displayed history does not shift.
     */
    function trackTie(m: Tournament["rounds"][number]["matches"][number]) {
      if (!m.result) return
      totalMatches++
      totalGoals += knockoutGoals(m)
      trackLeg(m.homeId, m.awayId, m.result.home, m.result.away)
      if (m.leg2Result) trackLeg(m.awayId, m.homeId, m.leg2Result.home, m.leg2Result.away)
    }

    for (const t of completedSeasons.value) {
      for (const group of t.groups ?? []) {
        for (const m of group.matches) {
          if (!m.result) continue
          totalMatches++
          totalGoals += m.result.home + m.result.away
          trackLeg(m.homeId, m.awayId, m.result.home, m.result.away)
        }
      }

      for (const round of t.rounds) {
        for (const m of round.matches) trackTie(m)
      }
      if (t.thirdPlaceMatch) trackTie(t.thirdPlaceMatch)

      const leagues = [...(t.league ? [t.league] : []), ...(t.tiers ?? []).map((x) => x.league)]
      for (const league of leagues) {
        for (const matchday of league.matchdays) {
          for (const m of matchday.matches) {
            if (!m.result) continue
            totalMatches++
            totalGoals += m.result.home + m.result.away
            trackLeg(m.homeId, m.awayId, m.result.home, m.result.away)
          }
        }
      }
    }

    function peak<T>(
      tally: Map<string, number>,
      build: (id: string, value: number) => T
    ): T | null {
      if (!tally.size) return null
      const [id, value] = [...tally.entries()].reduce((a, b) => (b[1] > a[1] ? b : a))
      return build(id, value)
    }

    const topScoringTeam = peak(teamGoals, (id, goals) => ({ ...teamRef(id), goals }))
    const mostCleanSheets = peak(teamCleanSheets, (id, count) => ({ ...teamRef(id), count }))

    // ── Title streaks ──────────────────────────────────────────
    let firstChampion: HistoryStats["firstChampion"] = null
    let longestStreak: HistoryStats["longestStreak"] = null
    let currentStreak: HistoryStats["currentStreak"] = null

    const sorted = [...completedSeasons.value].sort((a, b) => a.season - b.season)
    if (sorted.length) {
      const first = sorted[0]
      if (first.winnerId) {
        firstChampion = { ...teamRef(first.winnerId), season: first.season }
      }

      let streak = 0
      let streakId: string | null = null
      let maxStreak = 0
      let maxStreakId: string | null = null
      for (const t of sorted) {
        if (!t.winnerId) continue
        if (t.winnerId === streakId) streak++
        else {
          streakId = t.winnerId
          streak = 1
        }
        if (streak > maxStreak) {
          maxStreak = streak
          maxStreakId = streakId
        }
      }

      if (maxStreak >= MIN_REPORTABLE_STREAK && maxStreakId) {
        longestStreak = { ...teamRef(maxStreakId), count: maxStreak }
      }
      if (streak >= MIN_REPORTABLE_STREAK && streakId) {
        currentStreak = { ...teamRef(streakId), count: streak }
      }
    }

    return {
      totalSeasons: completedSeasons.value.length,
      totalMatches,
      totalGoals,
      avgGoals: totalMatches > 0 ? (totalGoals / totalMatches).toFixed(2) : "—",
      topScoringTeam,
      biggestWin,
      mostCleanSheets,
      firstChampion,
      longestStreak,
      currentStreak,
    }
  })

  return { stats }
}
