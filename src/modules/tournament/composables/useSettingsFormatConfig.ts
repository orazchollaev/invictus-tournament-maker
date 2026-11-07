import { computed } from "vue"
import { useI18n } from "vue-i18n"
import type {
  GroupConfigPayload,
  SwissConfigPayload,
  VenueConfigPayload,
} from "../components/config"
import type { KnockoutConfigPayload } from "../components/settings/SettingsKnockoutConfigModal.vue"
import type { LeagueConfigPayload } from "../components/settings/SettingsLeagueConfigModal.vue"
import type { TournamentSettingsDraft } from "./useTournamentSettingsDraft"
import { useVenueSummary } from "./useVenueSummary"

/**
 * The format card's one-line summaries (what each config button shows without
 * opening its modal) and the handlers that write a modal's payload back into
 * the settings draft. Nothing is saved here — the page's Save does that.
 */
export function useSettingsFormatConfig(draft: TournamentSettingsDraft) {
  const { t } = useI18n()

  const group = computed(() => {
    const base = t("tournament.create.config.groupsAndAdvance", {
      groups: draft.groupCount.value,
      advance: draft.qualifiersPerGroup.value * draft.groupCount.value,
    })
    if (draft.wildcardCount.value <= 0) return base
    return `${base} · ${t("tournament.create.config.wildcardsShort", { n: draft.wildcardCount.value })}`
  })

  const knockout = computed(() => {
    if (draft.isLeagueFormat.value) {
      return draft.playoffEnabled.value
        ? t("tournament.create.config.playoffShort", { n: draft.playoffQualifierCount.value })
        : t("tournament.create.config.playoffOff")
    }
    const thirdPlace = draft.hasThirdPlace.value
      ? t("tournament.create.config.thirdPlaceOn")
      : t("tournament.create.config.noThirdPlace")
    return `${t(`common.${draft.drawType.value}`)} · ${thirdPlace}`
  })

  const swiss = computed(() => {
    const opponents = t("tournament.create.config.swissOpponentsShort", {
      n: draft.swissOpponentCount.value,
    })
    const draw =
      draft.drawType.value === "seeded" && draft.swissPotCount.value > 1
        ? t("tournament.create.config.swissPotsShort", { n: draft.swissPotCount.value })
        : t("common.random")
    return `${opponents} · ${draw}`
  })

  const league = computed(() =>
    draft.tierCount.value > 1
      ? t("tournament.create.config.divisionsShort", { n: draft.tierCount.value })
      : t("tournament.create.config.singleDivisionShort")
  )

  const venue = useVenueSummary(draft.homeAdvantage, draft.neutralFinal, draft.hasFinal)

  function applyGroup(payload: GroupConfigPayload) {
    draft.drawType.value = payload.drawType
    draft.groupCount.value = payload.groupCount
    draft.qualifiersPerGroup.value = payload.qualifiersPerGroup
    draft.wildcardCount.value = payload.wildcardCount
    draft.groupLegMode.value = payload.groupLegMode
    draft.tiebreaker.value = payload.tiebreaker
    draft.winPoints.value = payload.winPoints
    draft.drawPoints.value = payload.drawPoints
    draft.lossPoints.value = payload.lossPoints
  }

  function applyKnockout(payload: KnockoutConfigPayload) {
    if (!draft.isGroupFormat.value) draft.drawType.value = payload.drawType
    draft.hasThirdPlace.value = payload.hasThirdPlace
    draft.roundLegModes.value = payload.roundLegModes
    draft.thirdPlaceLegMode.value = payload.thirdPlaceLegMode
    draft.finalLegMode.value = payload.finalLegMode
    draft.playoffEnabled.value = payload.playoffEnabled
    draft.playoffQualifierCount.value = payload.playoffQualifierCount
    draft.leaguePlayoffSeedMode.value = payload.playoffSeedMode
    draft.playoffSeedMode.value = payload.groupPlayoffSeedMode
  }

  function applySwiss(payload: SwissConfigPayload) {
    draft.swissOpponentCount.value = payload.opponentCount
    draft.swissPotCount.value = payload.potCount
    draft.leagueLegMode.value = payload.legMode
    draft.swissBalanceHomeAway.value = payload.balanceHomeAway
    draft.drawType.value = payload.drawType
    draft.tiebreaker.value = payload.tiebreaker
    draft.winPoints.value = payload.winPoints
    draft.drawPoints.value = payload.drawPoints
    draft.lossPoints.value = payload.lossPoints
  }

  function applyLeague(payload: LeagueConfigPayload) {
    draft.leagueLegMode.value = payload.leagueLegMode
    draft.tierCount.value = payload.tierCount
    draft.promotionCount.value = payload.promotionCount
    draft.tiebreaker.value = payload.tiebreaker
    draft.winPoints.value = payload.winPoints
    draft.drawPoints.value = payload.drawPoints
    draft.lossPoints.value = payload.lossPoints
  }

  function applyVenue(payload: VenueConfigPayload) {
    draft.homeAdvantage.value = payload.homeAdvantage
    draft.neutralFinal.value = payload.neutralFinal
  }

  return {
    summaries: { group, knockout, swiss, league, venue },
    applyGroup,
    applyKnockout,
    applySwiss,
    applyLeague,
    applyVenue,
  }
}
