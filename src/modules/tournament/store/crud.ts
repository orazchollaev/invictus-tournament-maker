import type { Ref } from "vue"
import type { Tournament, LegMode, PlayoffSeedMode, DrawType, Tiebreaker } from "../types"
import type { Team } from "@/modules/teams/types"
import {
  createTournament,
  createLeague,
  createMultiTierLeague,
  uid,
  updateThirdPlaceSlots,
  recalcStandings,
  recalcLeagueStandings,
} from "@/engine"

function deriveDrawType(seeded: boolean, orderedIds?: string[]): DrawType {
  if (orderedIds) return "manual"
  return seeded ? "seeded" : "random"
}

export function useCrudActions(
  tournaments: Ref<Tournament[]>,
  active: Ref<string | null>,
  getTeams: () => Team[]
) {
  function create(
    name: string,
    teamIds: string[],
    seeded = false,
    orderedIds?: string[],
    groupCount?: number,
    qualifiersPerGroup?: number,
    wildcardCount?: number,
    groupLegMode: LegMode = "single",
    knockoutLegMode: LegMode = "single",
    finalLegMode: LegMode = "single",
    tiebreaker?: Tiebreaker,
    winPoints?: number,
    drawPoints?: number,
    lossPoints?: number
  ): string {
    const allTeams = getTeams()
    const selected = allTeams.filter((t) => teamIds.includes(t.id))
    const season =
      tournaments.value
        .filter((t) => t.name === name)
        .reduce((max, t) => Math.max(max, t.season), 0) + 1
    const ordered = orderedIds
      ? (orderedIds.map((id) => allTeams.find((t) => t.id === id)).filter(Boolean) as Team[])
      : undefined
    const t = createTournament(
      name,
      selected,
      season,
      seeded,
      ordered,
      groupCount,
      qualifiersPerGroup,
      wildcardCount ?? 0,
      groupLegMode,
      knockoutLegMode,
      finalLegMode
    )
    t.drawType = deriveDrawType(seeded, orderedIds)
    if (tiebreaker) t.tiebreaker = tiebreaker
    if (winPoints !== undefined) t.winPoints = winPoints
    if (drawPoints !== undefined) t.drawPoints = drawPoints
    if (lossPoints !== undefined) t.lossPoints = lossPoints
    tournaments.value.push(t)
    active.value = t.id
    return t.id
  }

  function createLeagueTournament(
    name: string,
    teamIds: string[],
    legMode: LegMode = "single",
    tiebreaker?: Tiebreaker,
    winPoints?: number,
    drawPoints?: number,
    lossPoints?: number
  ): string {
    const allTeams = getTeams()
    const selected = allTeams.filter((t) => teamIds.includes(t.id))
    const season =
      tournaments.value
        .filter((t) => t.name === name)
        .reduce((max, t) => Math.max(max, t.season), 0) + 1
    const t = createLeague(name, selected, season, legMode)
    if (tiebreaker) t.tiebreaker = tiebreaker
    if (winPoints !== undefined) t.winPoints = winPoints
    if (drawPoints !== undefined) t.drawPoints = drawPoints
    if (lossPoints !== undefined) t.lossPoints = lossPoints
    tournaments.value.push(t)
    active.value = t.id
    return t.id
  }

  function newSeason(
    id: string,
    seeded = false,
    orderedIds?: string[],
    groupCount?: number,
    withThirdPlace?: boolean,
    playoffSeedMode?: PlayoffSeedMode,
    overrideTeamIds?: string[]
  ): string | undefined {
    const t = tournaments.value.find((t) => t.id === id)
    if (!t || !t.winnerId) return
    const allTeams = getTeams()
    const effectiveTeamIds = overrideTeamIds ?? t.teamIds
    const selected = allTeams.filter((tm) => effectiveTeamIds.includes(tm.id))
    const season =
      tournaments.value
        .filter((tr) => tr.name === t.name)
        .reduce((max, tr) => Math.max(max, tr.season), 0) + 1

    // League new season
    if (t.format === "league") {
      const teamIds = overrideTeamIds ?? t.teamIds
      const leagueTeams = allTeams.filter((tm) => teamIds.includes(tm.id))
      const newT = createLeague(t.name, leagueTeams, season, t.league?.legMode ?? "single")
      if (t.tiebreaker) newT.tiebreaker = t.tiebreaker
      if (t.relegationCount) newT.relegationCount = t.relegationCount
      if (t.winPoints !== undefined) newT.winPoints = t.winPoints
      if (t.drawPoints !== undefined) newT.drawPoints = t.drawPoints
      if (t.lossPoints !== undefined) newT.lossPoints = t.lossPoints
      if (t.leaguePlayoff?.enabled) {
        newT.leaguePlayoff = {
          enabled: true,
          qualifierCount: t.leaguePlayoff.qualifierCount,
          seedMode: t.leaguePlayoff.seedMode,
          started: false,
        }
      }
      tournaments.value.push(newT)
      active.value = newT.id
      return newT.id
    }

    const ordered = orderedIds
      ? (orderedIds.map((oid) => allTeams.find((tm) => tm.id === oid)).filter(Boolean) as Team[])
      : undefined
    const effectiveGroupCount =
      groupCount ?? (t.format === "group+bracket" ? t.groups?.length : undefined)
    const effectiveQpg = t.format === "group+bracket" ? (t.qualifiersPerGroup ?? 2) : undefined
    const newT = createTournament(
      t.name,
      selected,
      season,
      seeded,
      ordered,
      effectiveGroupCount,
      effectiveQpg,
      t.wildcardCount ?? 0,
      t.groupLegMode ?? "single",
      t.knockoutLegMode ?? "single",
      t.finalLegMode ?? "single"
    )
    newT.drawType = t.drawType ?? deriveDrawType(seeded, orderedIds)
    if (playoffSeedMode) newT.playoffSeedMode = playoffSeedMode
    else if (t.playoffSeedMode) newT.playoffSeedMode = t.playoffSeedMode
    if (withThirdPlace && newT.rounds.length >= 2) {
      newT.hasThirdPlace = true
      newT.thirdPlaceMatch = { id: uid(), homeId: null, awayId: null, result: null }
      updateThirdPlaceSlots(newT)
    }
    tournaments.value.push(newT)
    active.value = newT.id
    return newT.id
  }

  function setPromotionCount(tournamentId: string, count: number) {
    const t = tournaments.value.find((t) => t.id === tournamentId)
    if (!t || !t.tiers?.length) return
    t.promotionCount = Math.max(1, count)
  }

  function rebuildTiers(tournamentId: string, newTierCount: number) {
    const t = tournaments.value.find((t) => t.id === tournamentId)
    if (!t || !t.tiers?.length) return
    const allTeams = getTeams()
    const legMode = t.tiers[0].league.legMode
    // Sort all teams by power descending — strongest go to Division 1
    const sorted = t.teamIds
      .map((id) => allTeams.find((tm) => tm.id === id))
      .filter(Boolean) as Team[]
    sorted.sort((a, b) => b.power - a.power)
    const n = sorted.length
    const base = Math.floor(n / newTierCount)
    const extra = n % newTierCount
    const tierDefs: Array<{ name: string; teams: Team[] }> = []
    let offset = 0
    for (let i = 0; i < newTierCount; i++) {
      const size = base + (i < extra ? 1 : 0)
      tierDefs.push({ name: `Division ${i + 1}`, teams: sorted.slice(offset, offset + size) })
      offset += size
    }
    const prevPlayoff = t.tiers[0]?.playoff
    const newT = createMultiTierLeague(t.name, tierDefs, t.season, legMode, t.promotionCount ?? 1)
    t.tiers = newT.tiers
    t.teamIds = newT.teamIds
    if (prevPlayoff && t.tiers?.length) t.tiers[0].playoff = { ...prevPlayoff, started: false }
    t.winnerId = null
  }

  function newMultiTierSeason(id: string, newTierTeamIds: string[][]): string | undefined {
    const t = tournaments.value.find((t) => t.id === id)
    if (!t || !t.winnerId || !t.tiers?.length) return
    const allTeams = getTeams()
    const season =
      tournaments.value
        .filter((tr) => tr.name === t.name)
        .reduce((max, tr) => Math.max(max, tr.season), 0) + 1

    const tierDefs = t.tiers.map((tier, i) => ({
      name: tier.name,
      teams: (newTierTeamIds[i] ?? [])
        .map((tid) => allTeams.find((tm) => tm.id === tid))
        .filter(Boolean) as (typeof allTeams)[0][],
    }))

    const newT = createMultiTierLeague(
      t.name,
      tierDefs,
      season,
      t.tiers[0].league.legMode,
      t.promotionCount ?? 1
    )
    if (t.tiebreaker) newT.tiebreaker = t.tiebreaker
    if (t.winPoints !== undefined) newT.winPoints = t.winPoints
    if (t.drawPoints !== undefined) newT.drawPoints = t.drawPoints
    if (t.lossPoints !== undefined) newT.lossPoints = t.lossPoints
    const prevPlayoff = t.tiers[0]?.playoff
    if (prevPlayoff?.enabled && newT.tiers?.length) {
      newT.tiers[0].playoff = {
        enabled: true,
        qualifierCount: prevPlayoff.qualifierCount,
        seedMode: prevPlayoff.seedMode,
        started: false,
      }
    }
    tournaments.value.push(newT)
    active.value = newT.id
    return newT.id
  }

  function renameTournament(tournamentId: string, newName: string) {
    const trimmed = newName.trim()
    if (!trimmed) return
    const t = tournaments.value.find((t) => t.id === tournamentId)
    if (!t) return
    const oldName = t.name
    tournaments.value.filter((tr) => tr.name === oldName).forEach((tr) => (tr.name = trimmed))
  }

  function remove(id: string) {
    tournaments.value = tournaments.value.filter((t) => t.id !== id)
    if (active.value === id) active.value = tournaments.value[0]?.id ?? null
  }

  function getById(id: string) {
    return tournaments.value.find((t) => t.id === id)
  }

  function resetResults(tournamentId: string) {
    const t = tournaments.value.find((t) => t.id === tournamentId)
    if (!t) return
    if (t.format === "league") {
      const winPts = t.winPoints ?? 3
      const drawPts = t.drawPoints ?? 1
      const lossPts = t.lossPoints ?? 0
      if (t.tiers?.length) {
        for (const tier of t.tiers) {
          for (const matchday of tier.league.matchdays) {
            matchday.matches.forEach((m) => (m.result = null))
          }
          recalcLeagueStandings(tier.league, t.tiebreaker, winPts, drawPts, lossPts)
        }
        if (t.tiers[0].playoff) t.tiers[0].playoff.started = false
        t.rounds = []
        t.winnerId = null
        return
      }
      if (t.league) {
        for (const matchday of t.league.matchdays) {
          matchday.matches.forEach((m) => (m.result = null))
        }
        recalcLeagueStandings(t.league, t.tiebreaker, winPts, drawPts, lossPts)
        if (t.leaguePlayoff) t.leaguePlayoff.started = false
        t.rounds = []
        t.winnerId = null
        return
      }
    }
    if (t.groups) {
      const winPts = t.winPoints ?? 3
      const drawPts = t.drawPoints ?? 1
      const lossPts = t.lossPoints ?? 0
      for (const group of t.groups) {
        group.matches.forEach((m) => (m.result = null))
        recalcStandings(group, t.tiebreaker, winPts, drawPts, lossPts)
      }
      t.groupsDone = false
    }
    for (let r = 0; r < t.rounds.length; r++) {
      for (const match of t.rounds[r].matches) {
        match.result = null
        if (match.leg2Result !== undefined) match.leg2Result = null
        if (r > 0 || t.format === "group+bracket") {
          match.homeId = null
          match.awayId = null
        }
      }
    }
    if (t.thirdPlaceMatch) {
      t.thirdPlaceMatch.homeId = null
      t.thirdPlaceMatch.awayId = null
      t.thirdPlaceMatch.result = null
    }
    t.winnerId = null
  }

  function isTournamentFinished(tournamentId: string): boolean {
    const t = tournaments.value.find((t) => t.id === tournamentId)
    if (!t) return false
    if (t.format === "league") {
      if (t.tiers?.length) {
        return (
          !!t.winnerId &&
          t.tiers.every((tier) =>
            tier.league.matchdays.every((md) => md.matches.every((m) => m.result !== null))
          )
        )
      }
      return !!t.winnerId
    }
    if (t.groups) {
      for (const group of t.groups) {
        for (const match of group.matches) {
          if (!match.result) return false
        }
      }
    }
    for (const round of t.rounds) {
      for (const match of round.matches) {
        if (!match.homeId || !match.awayId) continue
        if (!match.result) return false
        if (match.leg2Result !== undefined && match.leg2Result === null) return false
      }
    }
    if (t.thirdPlaceMatch) {
      const m = t.thirdPlaceMatch
      if (m.homeId && m.awayId && !m.result) return false
    }
    return true && !!t.winnerId
  }

  return {
    create,
    createLeagueTournament,
    newSeason,
    newMultiTierSeason,
    setPromotionCount,
    rebuildTiers,
    renameTournament,
    remove,
    getById,
    resetResults,
    isTournamentFinished,
  }
}
