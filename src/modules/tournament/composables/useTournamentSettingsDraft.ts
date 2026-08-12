import { computed, ref, type ComputedRef } from "vue"
import { getLeaguePlayoffData } from "@/engine"
import { useTournamentStore } from "../store"
import type {
  LeaguePlayoffSeedMode,
  LegMode,
  PlayoffSeedMode,
  Tiebreaker,
  Tournament,
} from "../types"

export type DrawType = "random" | "seeded" | "manual"

/** Field defaults, in one place so the draft, the diff and the save agree. */
const DEFAULTS = {
  drawType: "random" as DrawType,
  playoffSeedMode: "cross" as PlayoffSeedMode,
  groupCount: 2,
  qualifiersPerGroup: 2,
  wildcardCount: 0,
  legMode: "single" as LegMode,
  tiebreaker: "goal-diff" as Tiebreaker,
  tierCount: 1,
  promotionCount: 1,
  playoffQualifierCount: 4,
  leaguePlayoffSeedMode: "seeded" as LeaguePlayoffSeedMode,
  winPoints: 3,
  drawPoints: 1,
  lossPoints: 0,
}

function leagueLegModeOf(t: Tournament): LegMode {
  return t.league?.legMode ?? t.tiers?.[0]?.league.legMode ?? DEFAULTS.legMode
}

function sameIdSet(a: string[], b: string[]) {
  if (a.length !== b.length) return false
  const set = new Set(a)
  return b.every((id) => set.has(id))
}

function sameAdjustments(a: Record<string, number>, b: Record<string, number>) {
  return JSON.stringify(a) === JSON.stringify(b)
}

/**
 * Editable copy of a tournament's configuration.
 *
 * The page binds the refs, `hasChanges` says whether the Save button is live,
 * and `save()` dispatches only the store actions whose field actually moved —
 * several of them rebuild fixtures, so writing them unconditionally would
 * regenerate the draw on every save.
 */
export function useTournamentSettingsDraft(
  tournamentId: ComputedRef<string>,
  tournament: ComputedRef<Tournament | undefined>
) {
  const store = useTournamentStore()
  const original = tournament
  const originalPlayoff = computed(() =>
    original.value ? getLeaguePlayoffData(original.value) : undefined
  )

  const t0 = original.value

  const name = ref(t0?.name ?? "")
  const teamIds = ref<string[]>([...(t0?.teamIds ?? [])])
  const drawType = ref<DrawType>(t0?.drawType ?? DEFAULTS.drawType)

  const playoffSeedMode = ref<PlayoffSeedMode>(t0?.playoffSeedMode ?? DEFAULTS.playoffSeedMode)
  const groupCount = ref(t0?.groups?.length ?? DEFAULTS.groupCount)
  const qualifiersPerGroup = ref(t0?.qualifiersPerGroup ?? DEFAULTS.qualifiersPerGroup)
  const wildcardCount = ref(t0?.wildcardCount ?? DEFAULTS.wildcardCount)
  const hasThirdPlace = ref(!!t0?.hasThirdPlace)
  const groupLegMode = ref<LegMode>(t0?.groupLegMode ?? DEFAULTS.legMode)
  const knockoutLegMode = ref<LegMode>(t0?.knockoutLegMode ?? DEFAULTS.legMode)
  const finalLegMode = ref<LegMode>(t0?.finalLegMode ?? DEFAULTS.legMode)
  const leagueLegMode = ref<LegMode>(t0 ? leagueLegModeOf(t0) : DEFAULTS.legMode)

  const tiebreaker = ref<Tiebreaker>(t0?.tiebreaker ?? DEFAULTS.tiebreaker)
  const promotionCount = ref(t0?.promotionCount ?? DEFAULTS.promotionCount)
  const tierCount = ref(t0?.tiers?.length ?? DEFAULTS.tierCount)

  const playoffEnabled = ref(originalPlayoff.value?.enabled ?? false)
  const playoffQualifierCount = ref(
    originalPlayoff.value?.qualifierCount ?? DEFAULTS.playoffQualifierCount
  )
  const leaguePlayoffSeedMode = ref<LeaguePlayoffSeedMode>(
    originalPlayoff.value?.seedMode ?? DEFAULTS.leaguePlayoffSeedMode
  )

  const winPoints = ref(t0?.winPoints ?? DEFAULTS.winPoints)
  const drawPoints = ref(t0?.drawPoints ?? DEFAULTS.drawPoints)
  const lossPoints = ref(t0?.lossPoints ?? DEFAULTS.lossPoints)
  const teamPointAdjustments = ref<Record<string, number>>({ ...(t0?.teamPointAdjustments ?? {}) })
  const teamPowerAdjustments = ref<Record<string, number>>({ ...(t0?.teamPowerAdjustments ?? {}) })

  const isLeagueFormat = computed(() => original.value?.format === "league")
  const isGroupFormat = computed(() => original.value?.format === "group+bracket")
  const isMultiTier = computed(() => (original.value?.tiers?.length ?? 0) > 1)
  const usesStandings = computed(() => isLeagueFormat.value || isGroupFormat.value)

  /** Playoff config is frozen once the bracket has been seeded. */
  const playoffChanged = computed(() => {
    const p = originalPlayoff.value
    return (
      playoffEnabled.value !== (p?.enabled ?? false) ||
      playoffQualifierCount.value !== (p?.qualifierCount ?? DEFAULTS.playoffQualifierCount) ||
      leaguePlayoffSeedMode.value !== (p?.seedMode ?? DEFAULTS.leaguePlayoffSeedMode)
    )
  })

  const pointsChanged = computed(
    () =>
      winPoints.value !== (original.value?.winPoints ?? DEFAULTS.winPoints) ||
      drawPoints.value !== (original.value?.drawPoints ?? DEFAULTS.drawPoints) ||
      lossPoints.value !== (original.value?.lossPoints ?? DEFAULTS.lossPoints)
  )

  const trimmedName = computed(() => name.value.trim())
  const nameChanged = computed(
    () => !!trimmedName.value && trimmedName.value !== original.value?.name
  )

  const hasChanges = computed(() => {
    const orig = original.value
    if (!orig) return false

    return (
      nameChanged.value ||
      !sameIdSet(orig.teamIds, teamIds.value) ||
      drawType.value !== (orig.drawType ?? DEFAULTS.drawType) ||
      playoffSeedMode.value !== (orig.playoffSeedMode ?? DEFAULTS.playoffSeedMode) ||
      groupCount.value !== (orig.groups?.length ?? DEFAULTS.groupCount) ||
      qualifiersPerGroup.value !== (orig.qualifiersPerGroup ?? DEFAULTS.qualifiersPerGroup) ||
      wildcardCount.value !== (orig.wildcardCount ?? DEFAULTS.wildcardCount) ||
      hasThirdPlace.value !== !!orig.hasThirdPlace ||
      groupLegMode.value !== (orig.groupLegMode ?? DEFAULTS.legMode) ||
      knockoutLegMode.value !== (orig.knockoutLegMode ?? DEFAULTS.legMode) ||
      finalLegMode.value !== (orig.finalLegMode ?? DEFAULTS.legMode) ||
      (isLeagueFormat.value && leagueLegMode.value !== leagueLegModeOf(orig)) ||
      (isMultiTier.value && tierCount.value !== (orig.tiers?.length ?? DEFAULTS.tierCount)) ||
      (isMultiTier.value &&
        promotionCount.value !== (orig.promotionCount ?? DEFAULTS.promotionCount)) ||
      (isLeagueFormat.value && playoffChanged.value) ||
      tiebreaker.value !== (orig.tiebreaker ?? DEFAULTS.tiebreaker) ||
      (usesStandings.value && pointsChanged.value) ||
      (usesStandings.value &&
        !sameAdjustments(teamPointAdjustments.value, orig.teamPointAdjustments ?? {})) ||
      !sameAdjustments(teamPowerAdjustments.value, orig.teamPowerAdjustments ?? {})
    )
  })

  /** Writes `local` back through `setAdjustment`, zeroing entries that were removed. */
  function syncAdjustments(
    local: Record<string, number>,
    originalMap: Record<string, number>,
    setAdjustment: (teamId: string, value: number) => void
  ) {
    for (const [teamId, value] of Object.entries(local)) {
      if (value !== (originalMap[teamId] ?? 0)) setAdjustment(teamId, value)
    }
    for (const teamId of Object.keys(originalMap)) {
      if (!(teamId in local)) setAdjustment(teamId, 0)
    }
  }

  function save() {
    const orig = original.value
    if (!orig) return
    const id = tournamentId.value

    if (nameChanged.value) store.renameTournament(id, trimmedName.value)

    const origTeams = new Set(orig.teamIds)
    const nextTeams = new Set(teamIds.value)
    for (const teamId of nextTeams) {
      if (!origTeams.has(teamId)) store.addTeamToTournament(id, teamId)
    }
    for (const teamId of origTeams) {
      if (!nextTeams.has(teamId)) store.removeTeamFromTournament(id, teamId)
    }

    if (drawType.value !== (orig.drawType ?? DEFAULTS.drawType)) {
      store.setDrawType(id, drawType.value)
    }
    if (playoffSeedMode.value !== (orig.playoffSeedMode ?? DEFAULTS.playoffSeedMode)) {
      store.setPlayoffSeedMode(id, playoffSeedMode.value)
    }
    if (groupCount.value !== (orig.groups?.length ?? DEFAULTS.groupCount)) {
      store.changeGroupCount(id, groupCount.value)
    }
    if (qualifiersPerGroup.value !== (orig.qualifiersPerGroup ?? DEFAULTS.qualifiersPerGroup)) {
      store.changeQualifiersPerGroup(id, qualifiersPerGroup.value)
    }
    if (wildcardCount.value !== (orig.wildcardCount ?? DEFAULTS.wildcardCount)) {
      store.changeWildcardCount(id, wildcardCount.value)
    }
    if (hasThirdPlace.value !== !!orig.hasThirdPlace) store.toggleThirdPlace(id)

    if (groupLegMode.value !== (orig.groupLegMode ?? DEFAULTS.legMode)) {
      store.setLegMode(id, "group", groupLegMode.value)
    }
    // League+playoff: knockout/final legs live on the tournament but must not
    // go through setLegMode's rebuildDraw, which would wipe league standings.
    if (isLeagueFormat.value) {
      if (
        knockoutLegMode.value !== (orig.knockoutLegMode ?? DEFAULTS.legMode) ||
        finalLegMode.value !== (orig.finalLegMode ?? DEFAULTS.legMode)
      ) {
        store.setLeaguePlayoffLegModes(id, knockoutLegMode.value, finalLegMode.value)
      }
    } else {
      if (knockoutLegMode.value !== (orig.knockoutLegMode ?? DEFAULTS.legMode)) {
        store.setLegMode(id, "knockout", knockoutLegMode.value)
      }
      if (finalLegMode.value !== (orig.finalLegMode ?? DEFAULTS.legMode)) {
        store.setLegMode(id, "final", finalLegMode.value)
      }
    }
    if (isLeagueFormat.value && leagueLegMode.value !== leagueLegModeOf(orig)) {
      store.setLeagueLegMode(id, leagueLegMode.value)
    }

    if (isMultiTier.value && tierCount.value !== (orig.tiers?.length ?? DEFAULTS.tierCount)) {
      store.rebuildTiers(id, tierCount.value)
    }
    if (
      isMultiTier.value &&
      promotionCount.value !== (orig.promotionCount ?? DEFAULTS.promotionCount)
    ) {
      store.setPromotionCount(id, promotionCount.value)
    }

    if (isLeagueFormat.value && !originalPlayoff.value?.started && playoffChanged.value) {
      store.changeLeaguePlayoffSettings(id, {
        enabled: playoffEnabled.value,
        qualifierCount: playoffQualifierCount.value,
        seedMode: leaguePlayoffSeedMode.value,
      })
    }

    if (tiebreaker.value !== (orig.tiebreaker ?? DEFAULTS.tiebreaker)) {
      store.setTiebreaker(id, tiebreaker.value)
    }
    if (usesStandings.value && pointsChanged.value) {
      store.setPointsConfig(id, winPoints.value, drawPoints.value, lossPoints.value)
    }
    if (usesStandings.value) {
      syncAdjustments(
        teamPointAdjustments.value,
        orig.teamPointAdjustments ?? {},
        (teamId, value) => store.setTeamPointAdjustment(id, teamId, value)
      )
    }
    syncAdjustments(teamPowerAdjustments.value, orig.teamPowerAdjustments ?? {}, (teamId, value) =>
      store.setTeamPowerAdjustment(id, teamId, value)
    )
  }

  return {
    // draft fields
    name,
    teamIds,
    drawType,
    playoffSeedMode,
    groupCount,
    qualifiersPerGroup,
    wildcardCount,
    hasThirdPlace,
    groupLegMode,
    knockoutLegMode,
    finalLegMode,
    leagueLegMode,
    tiebreaker,
    promotionCount,
    tierCount,
    playoffEnabled,
    playoffQualifierCount,
    leaguePlayoffSeedMode,
    winPoints,
    drawPoints,
    lossPoints,
    teamPointAdjustments,
    teamPowerAdjustments,
    // derived
    originalPlayoff,
    isLeagueFormat,
    isGroupFormat,
    isMultiTier,
    hasChanges,
    save,
  }
}
