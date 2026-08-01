import type { Team } from "@/modules/teams/types"
import type { Tournament } from "../types"

/** Per-team totals accumulated across every simulated run. */
export interface SimTeamStat {
  teamId: string
  wins: number
  runnerUp: number
  top4: number
  groupAdvanced: number
  totalPoints: number
  totalGF: number
  totalGA: number
  topThree: number
}

export interface SimResultShape {
  format: string
  runs: number
  hasGroups?: boolean
  bracketRounds?: number
  teamStats: SimTeamStat[]
}

export interface SimExportContext {
  tournament: Tournament
  result: SimResultShape
  /** Already sorted for display; the export keeps that order. */
  stats: SimTeamStat[]
  teamById: (id: string) => Team | undefined
  isBracket: boolean
  showTop4: boolean
  hasGroups: boolean
}

/** Percentages and averages are reported to two decimals in exports. */
const PRECISION = 2

function ratio(value: number, runs: number): number {
  if (!runs) return 0
  return parseFloat(((value / runs) * 100).toFixed(PRECISION))
}

function mean(total: number, runs: number): number {
  if (!runs) return 0
  return parseFloat((total / runs).toFixed(PRECISION))
}

function download(content: string, mime: string, filename: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }))
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function baseFilename(ctx: SimExportContext) {
  return `${ctx.tournament.name}_sim_${ctx.result.runs}`
}

export function buildJsonPayload(ctx: SimExportContext) {
  const { result, stats, teamById, isBracket, showTop4, hasGroups } = ctx
  const runs = result.runs

  return {
    tournament: ctx.tournament.name,
    season: ctx.tournament.season,
    format: result.format,
    runs,
    generatedAt: new Date().toISOString(),
    teams: stats.map((s) => {
      const team = teamById(s.teamId)
      const base = {
        name: team?.name ?? s.teamId,
        power: team?.power ?? 0,
        wins: s.wins,
        winPct: ratio(s.wins, runs),
      }

      if (!isBracket) {
        return {
          ...base,
          avgPoints: mean(s.totalPoints, runs),
          avgGoalsFor: mean(s.totalGF, runs),
          avgGoalsAgainst: mean(s.totalGA, runs),
          topThreePct: ratio(s.topThree, runs),
        }
      }

      return {
        ...base,
        runnerUp: s.runnerUp,
        runnerUpPct: ratio(s.runnerUp, runs),
        ...(showTop4 ? { top4: s.top4, top4Pct: ratio(s.top4, runs) } : {}),
        ...(hasGroups
          ? { groupAdvanced: s.groupAdvanced, groupAdvancedPct: ratio(s.groupAdvanced, runs) }
          : {}),
      }
    }),
  }
}

export function buildCsv(ctx: SimExportContext): string {
  const { result, stats, teamById, isBracket, showTop4, hasGroups } = ctx
  const runs = result.runs

  const headers = ["Team", "Power", "Win%", "Wins"]
  if (isBracket) {
    headers.push("Runner-up%", "Runner-ups")
    if (showTop4) headers.push("Top 4%", "Top 4")
    if (hasGroups) headers.push("Group Adv.%", "Group Adv.")
  } else {
    headers.push("Title%", "Avg Pts", "Avg GF", "Avg GA", "Top 3%")
  }

  const rows = stats.map((s) => {
    const team = teamById(s.teamId)
    const row: (string | number)[] = [
      team?.name ?? s.teamId,
      team?.power ?? 0,
      ratio(s.wins, runs),
      s.wins,
    ]

    if (isBracket) {
      row.push(ratio(s.runnerUp, runs), s.runnerUp)
      if (showTop4) row.push(ratio(s.top4, runs), s.top4)
      if (hasGroups) row.push(ratio(s.groupAdvanced, runs), s.groupAdvanced)
    } else {
      row.push(
        ratio(s.wins, runs),
        mean(s.totalPoints, runs),
        mean(s.totalGF, runs),
        mean(s.totalGA, runs),
        ratio(s.topThree, runs)
      )
    }
    return row
  })

  return [headers, ...rows].map((r) => r.join(",")).join("\n")
}

/** Downloads the simulation table as JSON or CSV. */
export function useSimResultExport(getContext: () => SimExportContext | null) {
  function saveJSON() {
    const ctx = getContext()
    if (!ctx) return
    const json = JSON.stringify(buildJsonPayload(ctx), null, 2)
    download(json, "application/json", `${baseFilename(ctx)}.json`)
  }

  function saveCSV() {
    const ctx = getContext()
    if (!ctx) return
    download(buildCsv(ctx), "text/csv", `${baseFilename(ctx)}.csv`)
  }

  return { saveJSON, saveCSV }
}
