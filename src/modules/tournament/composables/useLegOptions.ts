import { computed } from "vue"
import { useI18n } from "vue-i18n"

export function useLegOptions() {
  const { t } = useI18n()

  const legOptions = computed(() => [
    { value: "single", label: t("common.single") },
    { value: "double", label: t("common.double") },
  ])

  const multiLegOptions = computed(() => [
    { value: "single", label: t("common.single") },
    { value: "double", label: t("common.double") },
    { value: "triple", label: t("common.triple") },
    { value: "quadruple", label: t("common.quadruple") },
  ])

  /** League-only: adds the 6× mode on top of the shared multi-leg options. */
  const leagueLegOptions = computed(() => [
    ...multiLegOptions.value,
    { value: "sextuple", label: t("common.sextuple") },
  ])

  return { legOptions, multiLegOptions, leagueLegOptions }
}
