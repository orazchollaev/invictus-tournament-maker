// One player's whole record, gathered across every tournament and season
// stored in the app. Matches played before v2.2.0 carry no events, so they
// simply contribute nothing — the totals describe what the app has actually
// simulated, never an estimate.
import { computed, type ComputedRef } from "vue"
import { playedMatches } from "@/engine"
import { useTournamentStore } from "@/modules/tournament/store"
import type { Tournament } from "@/modules/tournament/types"

export interface CareerTotals {
  apps: number
  goals: number
  assists: number
  yellow: number
  red: number
  cleanSheets: number
  saves: number
  conceded: number
  /** Mean match rating across every appearance; 0 when there are none. */
  rating: number
  bestRating: number
}

export interface Honour {
  kind: "title" | "topScorer"
  tournamentName: string
  season: number
  /** Goals scored, for a top-scorer honour. */
  goals?: number
}

const EMPTY: CareerTotals = {
  apps: 0,
  goals: 0,
  assists: 0,
  yellow: 0,
  red: 0,
  cleanSheets: 0,
  saves: 0,
  conceded: 0,
  rating: 0,
  bestRating: 0,
}

interface TournamentSpell {
  tournament: Tournament
  teamId: string
  goals: number
}

export function usePlayerCareer(getPlayerId: () => string | undefined) {
  const tournamentStore = useTournamentStore()

  /** Per-tournament appearance record, the basis for both totals and honours. */
  const spells: ComputedRef<TournamentSpell[]> = computed(() => {
    const playerId = getPlayerId()
    if (!playerId) return []

    const out: TournamentSpell[] = []

    for (const tournament of tournamentStore.tournaments) {
      let teamId = ""
      let goals = 0
      let appeared = false

      for (const entry of playedMatches(tournament)) {
        const stats = entry.result?.stats
        if (!stats) continue
        for (const line of stats.lines) {
          if (line.playerId !== playerId) continue
          appeared = true
          goals += line.goals
          teamId = (line.side === "home" ? entry.homeId : entry.awayId) ?? teamId
        }
      }

      if (appeared) out.push({ tournament, teamId, goals })
    }

    return out
  })

  const totals: ComputedRef<CareerTotals> = computed(() => {
    const playerId = getPlayerId()
    if (!playerId) return { ...EMPTY }

    const acc = { ...EMPTY }
    let ratingSum = 0

    for (const tournament of tournamentStore.tournaments) {
      for (const entry of playedMatches(tournament)) {
        const stats = entry.result?.stats
        if (!stats) continue
        for (const line of stats.lines) {
          if (line.playerId !== playerId) continue
          acc.apps += 1
          acc.goals += line.goals
          acc.assists += line.assists
          acc.yellow += line.yellow
          acc.red += line.red
          if (line.cleanSheet) acc.cleanSheets += 1
          acc.saves += line.saves ?? 0
          acc.conceded += line.conceded ?? 0
          ratingSum += line.rating
          acc.bestRating = Math.max(acc.bestRating, line.rating)
        }
      }
    }

    if (acc.apps > 0) acc.rating = Math.round((ratingSum / acc.apps) * 10) / 10
    return acc
  })

  /**
   * Titles won with the side he played for, and seasons he finished as the
   * tournament's outright top scorer. A shared top score is not an honour —
   * ties go to nobody rather than to everybody.
   */
  const honours: ComputedRef<Honour[]> = computed(() => {
    const playerId = getPlayerId()
    if (!playerId) return []

    const out: Honour[] = []

    for (const spell of spells.value) {
      const { tournament, teamId, goals } = spell

      if (tournament.winnerId && tournament.winnerId === teamId) {
        out.push({ kind: "title", tournamentName: tournament.name, season: tournament.season })
      }

      if (goals > 0) {
        const tally = new Map<string, number>()
        for (const entry of playedMatches(tournament)) {
          const stats = entry.result?.stats
          if (!stats) continue
          for (const line of stats.lines) {
            if (!line.playerId || line.goals === 0) continue
            tally.set(line.playerId, (tally.get(line.playerId) ?? 0) + line.goals)
          }
        }
        const best = Math.max(...tally.values())
        const leaders = [...tally.values()].filter((v) => v === best).length
        if (goals === best && leaders === 1) {
          out.push({
            kind: "topScorer",
            tournamentName: tournament.name,
            season: tournament.season,
            goals,
          })
        }
      }
    }

    return out.sort(
      (a, b) => b.season - a.season || a.tournamentName.localeCompare(b.tournamentName)
    )
  })

  const hasCareer = computed(() => totals.value.apps > 0)

  return { totals, honours, hasCareer }
}
