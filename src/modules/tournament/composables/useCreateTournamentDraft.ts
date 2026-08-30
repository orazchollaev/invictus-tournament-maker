import { ref, computed, watch } from "vue"
import { useI18n } from "vue-i18n"
import { useTeamsStore } from "@/modules/teams/store"
import { useSettingsStore } from "@/modules/settings/store"
import { validateSwissConfig } from "@/engine"
import type {
  KnockoutStage,
  LegMode,
  PlayoffSeedMode,
  Tiebreaker,
  LeaguePlayoffSeedMode,
  TournamentFormat,
} from "@/modules/tournament/types"
import type { GroupConfigPayload, SwissConfigPayload } from "../components/config"
import type { KnockoutConfigPayload } from "../components/create/CreateKnockoutConfigModal.vue"
import type { LeagueConfigPayload } from "../components/create/CreateLeagueConfigModal.vue"

export type CreateDrawType = "random" | "seeded" | "manual"

const KNOCKOUT_STAGES: KnockoutStage[] = ["r64", "r32", "r16", "quarterfinal", "semifinal"]

/**
 * Everything the create form holds before a tournament exists: the shape the
 * user is describing, the summaries shown on the config buttons, and the
 * rules that keep the shape buildable as the roster and the format change.
 *
 * It deliberately stops short of creating anything: the page owns the manual
 * draw and the ceremony, and `useCreateTournamentSubmit` owns the store call.
 * This stays a description of a tournament rather than a half-made one.
 *
 * Mirrors `useTournamentSettingsDraft`, which does the same job for a
 * tournament that already exists.
 */
export function useCreateTournamentDraft() {
  const { t } = useI18n()
  const teamsStore = useTeamsStore()
  const settingsStore = useSettingsStore()

  const name = ref("")
  const selected = ref<string[]>([])
  const format = ref<TournamentFormat>("bracket")
  const drawType = ref<CreateDrawType>(settingsStore.newSeasonDrawType)

  const groupCount = ref(4)
  const qualifiersPerGroup = ref(2)
  const wildcardCount = ref(0)
  const groupLegMode = ref<LegMode>(settingsStore.groupLegMode)

  const hasThirdPlace = ref(false)
  const playoffSeedMode = ref<PlayoffSeedMode>(settingsStore.newSeasonPlayoffSeedMode)
  const roundLegModes = ref<Record<KnockoutStage, LegMode>>(
    Object.fromEntries(KNOCKOUT_STAGES.map((s) => [s, settingsStore.knockoutLegMode])) as Record<
      KnockoutStage,
      LegMode
    >
  )
  const thirdPlaceLegMode = ref<LegMode>(settingsStore.knockoutLegMode)
  const finalLegMode = ref<LegMode>(settingsStore.finalLegMode)

  const leagueLegMode = ref<LegMode>("single")
  const tierCount = ref(1)
  const tierAssignments = ref<Record<string, number>>({})
  const promotionCount = ref(1)
  const playoffEnabled = ref(false)
  const playoffQualifierCount = ref(4)
  const leaguePlayoffSeedMode = ref<LeaguePlayoffSeedMode>("seeded")

  // Swiss defaults mirror the Champions League league phase.
  const swissOpponentCount = ref(8)
  const swissPotCount = ref(4)
  const swissLegMode = ref<LegMode>("single")
  const swissBalanceHomeAway = ref(true)
  const swissDrawType = ref<"random" | "seeded">("seeded")

  const tiebreaker = ref<Tiebreaker>(settingsStore.tiebreaker)
  const winPoints = ref(settingsStore.winPoints)
  const drawPoints = ref(settingsStore.drawPoints)
  const lossPoints = ref(settingsStore.lossPoints)

  // Picked when a Swiss ceremony opens so the animated reveal and the fixture
  // that gets committed on completion come from one seed; cleared after create.
  const pendingSwissSeed = ref<number | null>(null)

  const teamPointAdjustments = ref<Record<string, number>>({})
  const teamPowerAdjustments = ref<Record<string, number>>({})

  const allTeams = computed(() => teamsStore.teams)
  const selectedTeams = computed(() => allTeams.value.filter((t) => selected.value.includes(t.id)))

  // Swiss is the one format whose settings can describe an impossible fixture,
  // so creation stays blocked until the shape validates.
  const swissErrors = computed(() =>
    format.value === "swiss"
      ? validateSwissConfig(
          selectedTeams.value.length,
          swissOpponentCount.value,
          swissDrawType.value === "seeded" ? swissPotCount.value : 1
        )
      : []
  )
  const canCreate = computed(
    () => !!name.value.trim() && selected.value.length >= 2 && swissErrors.value.length === 0
  )

  const maxPlayoffQualifiers = computed(() => Math.max(2, selectedTeams.value.length))

  // Estimated size of the knockout bracket, used only to decide which round
  // rows (r64…semifinal) the knockout config modal shows.
  const bracketTeamCount = computed(() => {
    if (format.value === "group+bracket") {
      return groupCount.value * qualifiersPerGroup.value + wildcardCount.value
    }
    if (format.value === "league" || format.value === "swiss") return playoffQualifierCount.value
    return selectedTeams.value.length
  })

  const tierNames = computed(() => {
    const names: string[] = []
    for (let i = 0; i < tierCount.value; i++) {
      names.push(i === 0 ? "Division 1" : `Division ${i + 1}`)
    }
    return names
  })

  const teamsPerTier = computed(() => {
    const buckets: string[][] = Array.from({ length: tierCount.value }, () => [])
    for (const team of selectedTeams.value) {
      const tier = tierAssignments.value[team.id] ?? 0
      buckets[Math.min(tier, tierCount.value - 1)].push(team.id)
    }
    return buckets
  })

  // ── Config-button summaries ────────────────────────────────────────────

  const groupConfigSummary = computed(() => {
    const base = t("tournament.create.config.groupsAndAdvance", {
      groups: groupCount.value,
      advance: qualifiersPerGroup.value * groupCount.value,
    })
    if (wildcardCount.value <= 0) return base
    return `${base} · ${t("tournament.create.config.wildcardsShort", { n: wildcardCount.value })}`
  })

  const knockoutConfigSummary = computed(() => {
    if (format.value === "league" || format.value === "swiss") {
      return t("tournament.create.config.playoffShort", { n: playoffQualifierCount.value })
    }
    const seedLabels: Record<string, string> = {
      cross: t("tournament.create.cross"),
      "no-same-group": t("tournament.create.noRematch"),
      random: t("common.random"),
      manual: t("common.manual"),
    }
    const drawLabel =
      format.value === "group+bracket"
        ? seedLabels[playoffSeedMode.value]
        : t(`common.${drawType.value}`)
    const thirdPlace = hasThirdPlace.value
      ? t("tournament.create.config.thirdPlaceOn")
      : t("tournament.create.config.noThirdPlace")
    return `${drawLabel} · ${thirdPlace}`
  })

  const swissConfigSummary = computed(() => {
    const opponents = t("tournament.create.config.swissOpponentsShort", {
      n: swissOpponentCount.value,
    })
    const draw =
      swissDrawType.value === "seeded" && swissPotCount.value > 1
        ? t("tournament.create.config.swissPotsShort", { n: swissPotCount.value })
        : t("common.random")
    return opponents + " · " + draw
  })

  const leagueConfigSummary = computed(() =>
    tierCount.value > 1
      ? t("tournament.create.config.divisionsShort", { n: tierCount.value })
      : t("tournament.create.config.singleDivisionShort")
  )

  // ── Modal results ──────────────────────────────────────────────────────
  // Each config modal edits its own draft and only reaches these on Save.

  function applyGroupConfig(payload: GroupConfigPayload) {
    drawType.value = payload.drawType
    groupCount.value = payload.groupCount
    qualifiersPerGroup.value = payload.qualifiersPerGroup
    wildcardCount.value = payload.wildcardCount
    groupLegMode.value = payload.groupLegMode
    tiebreaker.value = payload.tiebreaker
    winPoints.value = payload.winPoints
    drawPoints.value = payload.drawPoints
    lossPoints.value = payload.lossPoints
  }

  function applyKnockoutConfig(payload: KnockoutConfigPayload) {
    if (format.value !== "group+bracket") drawType.value = payload.drawType
    hasThirdPlace.value = payload.hasThirdPlace
    roundLegModes.value = payload.roundLegModes
    thirdPlaceLegMode.value = payload.thirdPlaceLegMode
    finalLegMode.value = payload.finalLegMode
    playoffQualifierCount.value = payload.playoffQualifierCount
    leaguePlayoffSeedMode.value = payload.leaguePlayoffSeedMode
    playoffSeedMode.value = payload.groupPlayoffSeedMode
  }

  function applySwissConfig(payload: SwissConfigPayload) {
    swissOpponentCount.value = payload.opponentCount
    swissPotCount.value = payload.potCount
    swissLegMode.value = payload.legMode
    swissBalanceHomeAway.value = payload.balanceHomeAway
    swissDrawType.value = payload.drawType === "random" ? "random" : "seeded"
    drawType.value = swissDrawType.value
    tiebreaker.value = payload.tiebreaker
    winPoints.value = payload.winPoints
    drawPoints.value = payload.drawPoints
    lossPoints.value = payload.lossPoints
  }

  function applyLeagueConfig(payload: LeagueConfigPayload) {
    leagueLegMode.value = payload.leagueLegMode
    tierCount.value = payload.tierCount
    tierAssignments.value = payload.tierAssignments
    promotionCount.value = payload.promotionCount
    tiebreaker.value = payload.tiebreaker
    winPoints.value = payload.winPoints
    drawPoints.value = payload.drawPoints
    lossPoints.value = payload.lossPoints
  }

  // ── Keeping the shape buildable ────────────────────────────────────────

  /**
   * Picks a Swiss shape that is actually buildable for this many teams,
   * preferring the Champions League defaults (8 opponents, 4 pots) and stepping
   * down from there. Without this, selecting Swiss with, say, 10 teams would
   * leave the form in an invalid state the user has to go and fix by hand.
   */
  function pickSwissDefaults(teamCount: number) {
    for (let opp = Math.min(8, teamCount - 1); opp >= 2; opp--) {
      for (const pots of [4, 3, 2, 1]) {
        if (!validateSwissConfig(teamCount, opp, pots).length) return { opp, pots }
      }
    }
    return { opp: 0, pots: 1 }
  }

  function applySwissDefaults() {
    const { opp, pots } = pickSwissDefaults(selectedTeams.value.length)
    if (!opp) return
    swissOpponentCount.value = opp
    swissPotCount.value = pots
  }

  watch(format, (f) => {
    if (f === "swiss") {
      drawType.value = swissDrawType.value
      applySwissDefaults()
      playoffQualifierCount.value = Math.max(
        2,
        Math.min(playoffQualifierCount.value, selectedTeams.value.length)
      )
      return
    }
    if (f === "league") return
    drawType.value =
      f === "group+bracket" ? settingsStore.newSeasonGroupDrawType : settingsStore.newSeasonDrawType
    if (f === "group+bracket") {
      playoffSeedMode.value = settingsStore.newSeasonPlayoffSeedMode
    }
  })

  // Changing the roster changes what shapes are possible, so re-pick rather
  // than leaving a now-invalid config behind.
  watch(
    () => selected.value.length,
    (count) => {
      if (format.value !== "swiss") return
      if (swissErrors.value.length) applySwissDefaults()
      playoffQualifierCount.value = Math.max(2, Math.min(playoffQualifierCount.value, count))
    }
  )

  return {
    name,
    selected,
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
    tierCount,
    tierAssignments,
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
    pendingSwissSeed,
    teamPointAdjustments,
    teamPowerAdjustments,
    allTeams,
    selectedTeams,
    swissErrors,
    canCreate,
    maxPlayoffQualifiers,
    bracketTeamCount,
    tierNames,
    teamsPerTier,
    groupConfigSummary,
    knockoutConfigSummary,
    swissConfigSummary,
    leagueConfigSummary,
    applyGroupConfig,
    applyKnockoutConfig,
    applySwissConfig,
    applyLeagueConfig,
  }
}
