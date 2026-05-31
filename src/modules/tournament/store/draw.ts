import type { Ref } from "vue"
import type { Tournament, PlayoffSeedMode, LegMode } from "../types"
import type { Team } from "@/modules/teams/types"
import { createTournament, createLeague, buildLeagueMatchdays, legModeToCount } from "@/engine"

export function useDrawActions(tournaments: Ref<Tournament[]>, getTeams: () => Team[]) {
  function hasAnyResults(tournamentId: string): boolean {
    const t = tournaments.value.find((t) => t.id === tournamentId)
    if (!t) return false
    if (t.tiers) {
      for (const tier of t.tiers) {
        for (const md of tier.league.matchdays) {
          if (md.matches.some((m) => m.result !== null)) return true
        }
      }
    }
    if (t.league) {
      for (const md of t.league.matchdays) {
        if (md.matches.some((m) => m.result !== null)) return true
      }
    }
    if (t.groups) {
      for (const g of t.groups) {
        if (g.matches.some((m) => m.result !== null)) return true
      }
    }
    for (const round of t.rounds) {
      for (const match of round.matches) {
        if (match.result && match.homeId && match.awayId) return true
      }
    }
    return false
  }

  function rebuildDraw(
    t: Tournament,
    seeded = false,
    orderedIds?: string[],
    groupCount?: number,
    qualifiersPerGroup?: number
  ) {
    const allTeams = getTeams()
    const selected = allTeams.filter((tm) => t.teamIds.includes(tm.id))

    if (t.format === "league" && t.tiers?.length) {
      for (const tier of t.tiers) {
        tier.league.matchdays = buildLeagueMatchdays(
          tier.teamIds,
          legModeToCount(tier.league.legMode)
        )
        for (const s of tier.league.standings) {
          s.played = s.won = s.drawn = s.lost = s.gf = s.ga = s.gd = s.pts = 0
        }
      }
      t.winnerId = null
      return
    }

    if (t.format === "league" && t.league) {
      const fresh = createLeague(t.name, selected, t.season, t.league.legMode)
      t.league = fresh.league
      t.winnerId = null
      return
    }

    const resolvedGroupCount =
      t.format === "group+bracket"
        ? Math.min(groupCount ?? t.groups?.length ?? 2, Math.floor(selected.length / 2))
        : undefined
    const resolvedQpg =
      t.format === "group+bracket" ? (qualifiersPerGroup ?? t.qualifiersPerGroup ?? 2) : undefined
    const ordered = orderedIds
      ? (orderedIds.map((id) => allTeams.find((tm) => tm.id === id)).filter(Boolean) as Team[])
      : undefined
    const fresh = createTournament(
      t.name,
      selected,
      t.season,
      seeded,
      ordered,
      resolvedGroupCount,
      resolvedQpg,
      t.wildcardCount ?? 0,
      t.groupLegMode ?? "single",
      t.knockoutLegMode ?? "single",
      t.finalLegMode ?? "single"
    )
    t.rounds = fresh.rounds
    t.winnerId = null
    if (fresh.groups) {
      t.groups = fresh.groups
      t.groupsDone = false
      t.qualifiersPerGroup = fresh.qualifiersPerGroup
      t.wildcardCount = fresh.wildcardCount
    }
  }

  function changeWildcardCount(tournamentId: string, count: number) {
    const t = tournaments.value.find((t) => t.id === tournamentId)
    if (!t || t.format !== "group+bracket" || hasAnyResults(tournamentId)) return
    const max = t.groups?.length ?? 0
    t.wildcardCount = Math.max(0, Math.min(count, max)) || undefined
    rebuildDraw(t)
  }

  function setLegMode(tournamentId: string, stage: "group" | "knockout" | "final", mode: LegMode) {
    const t = tournaments.value.find((t) => t.id === tournamentId)
    if (!t || hasAnyResults(tournamentId)) return
    if (stage === "group") t.groupLegMode = mode
    else if (stage === "knockout") t.knockoutLegMode = mode
    else t.finalLegMode = mode
    rebuildDraw(t)
  }

  function changeGroupCount(tournamentId: string, count: number) {
    const t = tournaments.value.find((t) => t.id === tournamentId)
    if (!t || t.format !== "group+bracket" || hasAnyResults(tournamentId)) return
    const max = Math.floor(t.teamIds.length / 2)
    const clamped = Math.max(2, Math.min(count, max))
    const minGroupSize = Math.floor(t.teamIds.length / clamped)
    const clampedQpg = Math.max(1, Math.min(t.qualifiersPerGroup ?? 2, minGroupSize))
    rebuildDraw(t, false, undefined, clamped, clampedQpg)
  }

  function changeQualifiersPerGroup(tournamentId: string, qpg: number) {
    const t = tournaments.value.find((t) => t.id === tournamentId)
    if (!t || t.format !== "group+bracket" || hasAnyResults(tournamentId)) return
    const gc = t.groups?.length ?? 2
    const minGroupSize = Math.floor(t.teamIds.length / gc)
    const clamped = Math.max(1, Math.min(qpg, minGroupSize))
    rebuildDraw(t, false, undefined, gc, clamped)
  }

  function addTeamToTournament(tournamentId: string, teamId: string) {
    const t = tournaments.value.find((t) => t.id === tournamentId)
    if (!t || hasAnyResults(tournamentId)) return
    if (t.teamIds.includes(teamId)) return
    t.teamIds = [...t.teamIds, teamId]
    rebuildDraw(t)
  }

  function removeTeamFromTournament(tournamentId: string, teamId: string) {
    const t = tournaments.value.find((t) => t.id === tournamentId)
    if (!t || hasAnyResults(tournamentId)) return
    if (t.teamIds.length <= 2) return
    t.teamIds = t.teamIds.filter((id) => id !== teamId)
    rebuildDraw(t)
  }

  function redrawTournament(tournamentId: string, seeded = false, orderedIds?: string[]) {
    const t = tournaments.value.find((t) => t.id === tournamentId)
    if (!t || hasAnyResults(tournamentId)) return
    rebuildDraw(t, seeded, orderedIds)
    t.drawType = orderedIds ? "manual" : seeded ? "seeded" : "random"
  }

  function setDrawType(tournamentId: string, type: "random" | "seeded" | "manual") {
    const t = tournaments.value.find((t) => t.id === tournamentId)
    if (!t) return
    t.drawType = type
  }

  function setPlayoffSeedMode(tournamentId: string, mode: PlayoffSeedMode) {
    const t = tournaments.value.find((t) => t.id === tournamentId)
    if (!t) return
    t.playoffSeedMode = mode
  }

  function setLeagueLegMode(tournamentId: string, mode: LegMode) {
    const t = tournaments.value.find((t) => t.id === tournamentId)
    if (!t || t.format !== "league" || hasAnyResults(tournamentId)) return
    if (t.tiers?.length) {
      for (const tier of t.tiers) {
        tier.league.legMode = mode
      }
      rebuildDraw(t)
      return
    }
    if (!t.league) return
    t.league.legMode = mode
    rebuildDraw(t)
  }

  return {
    hasAnyResults,
    setLegMode,
    setLeagueLegMode,
    changeGroupCount,
    changeQualifiersPerGroup,
    changeWildcardCount,
    addTeamToTournament,
    removeTeamFromTournament,
    redrawTournament,
    setDrawType,
    setPlayoffSeedMode,
  }
}
