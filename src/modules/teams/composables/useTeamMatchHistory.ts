import { computed, type Ref } from "vue"
import { forEachMatch, getWinnerId, isBye, type MatchEntry } from "@/engine"
import type { Match, GroupMatch, Tournament } from "@/modules/tournament/types"

export type Outcome = "W" | "D" | "L"
export type RoundPhase = "group" | "knockout" | "league"

export interface MatchRow {
  tournamentName: string
  tournamentSeason: number
  round: string
  roundPhase: RoundPhase
  match: Match | GroupMatch
  opponentId: string | null
  goalsFor: number
  goalsAgainst: number
  penGoalsFor: number | null
  penGoalsAgainst: number | null
  outcome: Outcome
}

function label(entry: MatchEntry): { round: string; phase: RoundPhase } {
  const s = entry.source
  switch (s.kind) {
    case "group":
      return { round: s.groupName, phase: "group" }
    case "league":
      return {
        round: s.tierName ? `${s.tierName} · ${s.matchdayName}` : s.matchdayName,
        phase: "league",
      }
    case "knockout":
      return {
        round: entry.isDoubleLeg ? `${s.roundName} (L${s.leg})` : s.roundName,
        phase: "knockout",
      }
    case "third-place":
      return { round: "3rd Place", phase: "knockout" }
  }
}

function toRow(entry: MatchEntry, t: Tournament, teamId: string): MatchRow | null {
  if (!entry.result || isBye(entry)) return null

  const isHome = entry.homeId === teamId
  if (!isHome && entry.awayId !== teamId) return null

  const { home, away, penHome, penAway } = entry.result
  const goalsFor = isHome ? home : away
  const goalsAgainst = isHome ? away : home

  // A single-leg knockout is decided by the tie (extra time, penalties),
  // so ask the engine. Every other row is decided by its own scoreline —
  // including each leg of a two-legged tie, which is shown per leg.
  const isSingleLegKnockout =
    (entry.source.kind === "knockout" || entry.source.kind === "third-place") && !entry.isDoubleLeg

  let outcome: Outcome
  if (isSingleLegKnockout) {
    outcome = getWinnerId(entry.match as Match) === teamId ? "W" : "L"
  } else if (goalsFor > goalsAgainst) {
    outcome = "W"
  } else if (goalsFor < goalsAgainst) {
    outcome = "L"
  } else {
    outcome = "D"
  }

  // Penalty columns line up with entry.homeId, which the iterator already
  // flipped for leg 2.
  const hasPen = penHome !== undefined
  const { round, phase } = label(entry)

  return {
    tournamentName: t.name,
    tournamentSeason: t.season,
    round,
    roundPhase: phase,
    match: entry.match,
    opponentId: isHome ? entry.awayId : entry.homeId,
    goalsFor,
    goalsAgainst,
    penGoalsFor: hasPen ? (isHome ? penHome! : penAway!) : null,
    penGoalsAgainst: hasPen ? (isHome ? penAway! : penHome!) : null,
    outcome,
  }
}

/**
 * Every played match for a team across every tournament, most recent
 * first, plus the aggregates the detail page shows.
 */
export function useTeamMatchHistory(tournaments: Ref<Tournament[]>, teamId: Ref<string>) {
  const matches = computed<MatchRow[]>(() => {
    const rows: MatchRow[] = []

    for (const t of tournaments.value) {
      if (!t.teamIds.includes(teamId.value)) continue
      forEachMatch(t, (entry) => {
        const row = toRow(entry, t, teamId.value)
        if (row) rows.push(row)
      })
    }

    return rows.reverse()
  })

  const stats = computed(() => {
    const all = matches.value
    const played = all.length
    const wins = all.filter((m) => m.outcome === "W").length
    const draws = all.filter((m) => m.outcome === "D").length
    const losses = all.filter((m) => m.outcome === "L").length
    return {
      played,
      wins,
      draws,
      losses,
      gf: all.reduce((s, m) => s + m.goalsFor, 0),
      ga: all.reduce((s, m) => s + m.goalsAgainst, 0),
      winRate: played > 0 ? Math.round((wins / played) * 100) : 0,
    }
  })

  /** Last five, oldest first so the form strip reads left to right. */
  const recentForm = computed(() => matches.value.slice(0, 5).reverse())

  /** One "name|season" option per tournament this team appeared in. */
  const tournamentOptions = computed(() => {
    const seen = new Set<string>()
    const opts: { key: string; label: string }[] = []
    for (const m of matches.value) {
      const key = `${m.tournamentName}|${m.tournamentSeason}`
      if (seen.has(key)) continue
      seen.add(key)
      opts.push({ key, label: `${m.tournamentName} S${m.tournamentSeason}` })
    }
    return opts
  })

  const seasonStats = computed(() =>
    tournaments.value
      .filter((t) => t.teamIds.includes(teamId.value))
      .map((t) => {
        const played = matches.value.filter(
          (m) => m.tournamentName === t.name && m.tournamentSeason === t.season
        )
        return {
          label: `${t.name} S${t.season}`,
          wins: played.filter((m) => m.outcome === "W").length,
          draws: played.filter((m) => m.outcome === "D").length,
          losses: played.filter((m) => m.outcome === "L").length,
        }
      })
      .filter((s) => s.wins + s.draws + s.losses > 0)
  )

  return { matches, stats, recentForm, tournamentOptions, seasonStats }
}
