// One player's whole record, gathered across every tournament and season
// stored in the app. Matches played before v2.2.0 carry no events, so they
// simply contribute nothing — the totals describe what the app has actually
// simulated, never an estimate.
import { computed, type ComputedRef } from "vue"
import { playedMatches, statsOf } from "@/engine"
import { useTournamentStore } from "@/modules/tournament/store"
import type { Tournament } from "@/modules/tournament/types"
import { useRawTournament } from "@/modules/tournament/composables/useRawTournament"

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
  /** Times this player came off through a substitution tagged "injury". */
  injuries: number
  /** Matches missed to injury, summed across every knock. */
  matchesMissedToInjury: number
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
  injuries: 0,
  matchesMissedToInjury: 0,
}

/** One player's lines in one tournament, in match order. */
interface PlayerInTournament {
  apps: number
  goals: number
  assists: number
  yellow: number
  red: number
  cleanSheets: number
  saves: number
  conceded: number
  /** Every rating, kept in order so the career mean adds up exactly as before. */
  ratings: number[]
  bestRating: number
  /** The side of his last appearance. */
  teamId: string
  injuries: number
  matchesMissedToInjury: number
}

interface TournamentSummary {
  players: Map<string, PlayerInTournament>
  /** The top score of the tournament, and how many players share it. */
  topGoals: number
  topCount: number
}

/**
 * Every player's record in a tournament, from one pass over its reports. A player
 * page asked for totals, spells and honours, and each walked (and decoded) every
 * report of every tournament again, for every player opened. Kept per raw
 * tournament and dropped when its revision moves on.
 */
const summaries = new WeakMap<Tournament, { rev: number; summary: TournamentSummary }>()

function blank(): PlayerInTournament {
  return {
    apps: 0,
    goals: 0,
    assists: 0,
    yellow: 0,
    red: 0,
    cleanSheets: 0,
    saves: 0,
    conceded: 0,
    ratings: [],
    bestRating: -Infinity,
    teamId: "",
    injuries: 0,
    matchesMissedToInjury: 0,
  }
}

function summarize(raw: Tournament): TournamentSummary {
  const players = new Map<string, PlayerInTournament>()
  const of = (id: string) => {
    let p = players.get(id)
    if (!p) players.set(id, (p = blank()))
    return p
  }
  const tally = new Map<string, number>()
  for (const entry of playedMatches(raw)) {
    const stats = statsOf(entry.result)
    if (!stats) continue
    for (const line of stats.lines) {
      if (line.playerId && line.goals !== 0)
        tally.set(line.playerId, (tally.get(line.playerId) ?? 0) + line.goals)
      if (line.playerId == null) continue
      const p = of(line.playerId)
      p.apps += 1
      p.goals += line.goals
      p.assists += line.assists
      p.yellow += line.yellow
      p.red += line.red
      if (line.cleanSheet) p.cleanSheets += 1
      p.saves += line.saves ?? 0
      p.conceded += line.conceded ?? 0
      p.ratings.push(line.rating)
      p.bestRating = Math.max(p.bestRating, line.rating)
      p.teamId = (line.side === "home" ? entry.homeId : entry.awayId) ?? p.teamId
    }
    for (const sub of stats.substitutions ?? []) {
      if (sub.reason !== "injury" || sub.outPlayerId == null) continue
      const p = of(sub.outPlayerId)
      p.injuries += 1
      p.matchesMissedToInjury += sub.injuryMatches ?? 0
    }
  }
  const topGoals = Math.max(...tally.values())
  const topCount = [...tally.values()].filter((v) => v === topGoals).length
  return { players, topGoals, topCount }
}

interface TournamentSpell {
  tournament: Tournament
  teamId: string
  goals: number
}

export function usePlayerCareer(getPlayerId: () => string | undefined) {
  const tournamentStore = useTournamentStore()
  const rawOf = useRawTournament()

  function summaryOf(tournament: Tournament): TournamentSummary {
    const raw = rawOf(tournament)
    const rev = tournamentStore.revision(tournament.id)
    const hit = summaries.get(raw)
    if (hit && hit.rev === rev) return hit.summary
    const summary = summarize(raw)
    summaries.set(raw, { rev, summary })
    return summary
  }

  /** Per-tournament appearance record, the basis for both totals and honours. */
  const spells: ComputedRef<TournamentSpell[]> = computed(() => {
    const playerId = getPlayerId()
    if (!playerId) return []

    const out: TournamentSpell[] = []

    for (const tournament of tournamentStore.tournaments) {
      const p = summaryOf(tournament).players.get(playerId)
      if (p && p.apps > 0) out.push({ tournament, teamId: p.teamId, goals: p.goals })
    }

    return out
  })

  const totals: ComputedRef<CareerTotals> = computed(() => {
    const playerId = getPlayerId()
    if (!playerId) return { ...EMPTY }

    const acc = { ...EMPTY }
    let ratingSum = 0

    for (const tournament of tournamentStore.tournaments) {
      const p = summaryOf(tournament).players.get(playerId)
      if (!p) continue
      acc.apps += p.apps
      acc.goals += p.goals
      acc.assists += p.assists
      acc.yellow += p.yellow
      acc.red += p.red
      acc.cleanSheets += p.cleanSheets
      acc.saves += p.saves
      acc.conceded += p.conceded
      for (const r of p.ratings) ratingSum += r
      acc.bestRating = Math.max(acc.bestRating, p.bestRating)
      acc.injuries += p.injuries
      acc.matchesMissedToInjury += p.matchesMissedToInjury
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
        const { topGoals, topCount } = summaryOf(tournament)
        if (goals === topGoals && topCount === 1) {
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
