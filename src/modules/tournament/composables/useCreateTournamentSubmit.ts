import { useRouter } from "vue-router"
import { useTournamentStore } from "@/modules/tournament/store"
import { useSettingsStore } from "@/modules/settings/store"
import { useHaptic } from "@/composables/useHaptic"
import { logEvent } from "@/composables/useAnalytics"
import { randomSeed } from "@/engine"
import type { useCreateTournamentDraft } from "./useCreateTournamentDraft"

/**
 * Turns a finished create-form draft into a real tournament.
 *
 * Every format ends at a different store call with a different argument list,
 * and each one then has the same tail: apply the per-team adjustments, log the
 * event, go to the new tournament. Keeping that switch here leaves the page
 * with the flow -- manual draw, ceremony, or straight to creation -- and
 * nothing else.
 */
export function useCreateTournamentSubmit(draft: ReturnType<typeof useCreateTournamentDraft>) {
  const router = useRouter()
  const store = useTournamentStore()
  const settingsStore = useSettingsStore()
  const { success: hapticSuccess } = useHaptic()

  const {
    name,
    selected,
    selectedTeams,
    format,
    drawType,
    groupCount,
    qualifiersPerGroup,
    wildcardCount,
    groupLegMode,
    hasThirdPlace,
    playoffSeedMode,
    roundLegModes,
    thirdPlaceLegMode,
    finalLegMode,
    leagueLegMode,
    tierNames,
    teamsPerTier,
    tierCount,
    promotionCount,
    playoffEnabled,
    playoffQualifierCount,
    leaguePlayoffSeedMode,
    swissOpponentCount,
    swissPotCount,
    swissLegMode,
    swissBalanceHomeAway,
    swissDrawType,
    tiebreaker,
    winPoints,
    drawPoints,
    lossPoints,
    teamPointAdjustments,
    teamPowerAdjustments,
    pendingSwissSeed,
  } = draft

  function applyAdjustments(id: string) {
    for (const [teamId, val] of Object.entries(teamPointAdjustments.value)) {
      if (val !== 0) store.setTeamPointAdjustment(id, teamId, val)
    }
    for (const [teamId, val] of Object.entries(teamPowerAdjustments.value)) {
      if (val !== 0) store.setTeamPowerAdjustment(id, teamId, val)
    }
  }

  function applyLeaguePlayoffSettings(id: string) {
    if (!playoffEnabled.value) return
    store.changeLeaguePlayoffSettings(id, {
      enabled: true,
      qualifierCount: playoffQualifierCount.value,
      seedMode: leaguePlayoffSeedMode.value,
    })
    store.setLeaguePlayoffLegModes(
      id,
      settingsStore.knockoutLegMode,
      finalLegMode.value,
      roundLegModes.value
    )
  }

  function doCreate(orderedIds?: string[]) {
    hapticSuccess()
    if (format.value === "swiss") {
      const id = store.createSwiss(name.value.trim(), selected.value, {
        opponentCount: swissOpponentCount.value,
        potCount: swissPotCount.value,
        balanceHomeAway: swissBalanceHomeAway.value,
        legMode: swissLegMode.value,
        drawType: swissDrawType.value,
        seed: pendingSwissSeed.value ?? randomSeed(),
        playoffEnabled: true,
        playoffQualifierCount: playoffQualifierCount.value,
        playoffSeedMode: leaguePlayoffSeedMode.value,
        knockoutLegMode: settingsStore.knockoutLegMode,
        finalLegMode: finalLegMode.value,
        roundLegModes: roundLegModes.value,
        tiebreaker: tiebreaker.value,
        winPoints: winPoints.value,
        drawPoints: drawPoints.value,
        lossPoints: lossPoints.value,
      })
      pendingSwissSeed.value = null
      applyAdjustments(id)
      void logEvent("create_tournament", {
        format: "swiss",
        team_count: selectedTeams.value.length,
      })
      router.push("/tournaments/" + id)
      return
    }
    if (format.value === "league") {
      if (tierCount.value > 1) {
        const tierDefs = teamsPerTier.value.map((ids, i) => ({
          name: tierNames.value[i],
          teamIds: ids,
        }))
        const id = store.createMultiTierLeagueTournament(
          name.value.trim(),
          tierDefs,
          leagueLegMode.value,
          promotionCount.value,
          tiebreaker.value,
          winPoints.value,
          drawPoints.value,
          lossPoints.value
        )
        applyAdjustments(id)
        applyLeaguePlayoffSettings(id)
        void logEvent("create_tournament", {
          format: "league",
          team_count: selectedTeams.value.length,
        })
        router.push(`/tournaments/${id}`)
        return
      }
      const id = store.createLeagueTournament(
        name.value.trim(),
        selected.value,
        leagueLegMode.value,
        tiebreaker.value,
        winPoints.value,
        drawPoints.value,
        lossPoints.value
      )
      applyAdjustments(id)
      applyLeaguePlayoffSettings(id)
      void logEvent("create_tournament", {
        format: "league",
        team_count: selectedTeams.value.length,
      })
      router.push(`/tournaments/${id}`)
      return
    }
    const isGroup = format.value === "group+bracket"
    const gc = isGroup ? groupCount.value : undefined
    const qpg = isGroup ? qualifiersPerGroup.value : undefined
    const isSeeded = drawType.value === "seeded"
    const gLeg = isGroup ? groupLegMode.value : "single"
    const id = store.create(
      name.value.trim(),
      selected.value,
      isSeeded,
      orderedIds,
      gc,
      qpg,
      isGroup ? wildcardCount.value : 0,
      gLeg,
      settingsStore.knockoutLegMode,
      finalLegMode.value,
      tiebreaker.value,
      isGroup ? winPoints.value : undefined,
      isGroup ? drawPoints.value : undefined,
      isGroup ? lossPoints.value : undefined,
      roundLegModes.value,
      thirdPlaceLegMode.value
    )
    store.setDrawType(id, drawType.value)
    if (isGroup) store.setPlayoffSeedMode(id, playoffSeedMode.value)
    if (hasThirdPlace.value) store.toggleThirdPlace(id)
    applyAdjustments(id)
    void logEvent("create_tournament", {
      format: format.value,
      team_count: selectedTeams.value.length,
    })
    router.push(`/tournaments/${id}`)
  }
  return { doCreate }
}
