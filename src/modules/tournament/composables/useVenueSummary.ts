import { computed, type Ref } from "vue"
import { useI18n } from "vue-i18n"
import { useSettingsStore } from "@/modules/settings/store"

/**
 * The one-line summary under the Venue config button, shared by the create
 * page and the settings page so the two read the same: "App default (6)" or
 * "Home edge 10", plus "Neutral final" where there is a final to move.
 */
export function useVenueSummary(
  homeAdvantage: Ref<number | null>,
  neutralFinal: Ref<boolean>,
  showNeutralFinal: Ref<boolean>
) {
  const { t } = useI18n()
  const settings = useSettingsStore()

  return computed(() => {
    const edge =
      homeAdvantage.value === null
        ? t("tournament.venue.summaryDefault", { n: settings.homeAdvantage })
        : t("tournament.venue.summaryCustom", { n: homeAdvantage.value })
    return showNeutralFinal.value && neutralFinal.value
      ? `${edge} · ${t("tournament.venue.neutralFinal")}`
      : edge
  })
}
