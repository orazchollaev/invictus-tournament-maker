import { defineStore } from "pinia"
import { ref, watch } from "vue"
import type { LegMode, PlayoffSeedMode } from "@/modules/tournament/types"
import { setSimConfig, setTableConfig } from "@/engine"
import type { Tiebreaker } from "@/modules/tournament/types"
import { i18n, loadLocale } from "@/i18n"
import type { Locale } from "@/i18n"

export type Theme = "light" | "dark" | "worldcup2026"
export type DrawType = "random" | "seeded" | "manual"
export type BracketStyle = "double-sided" | "classic" | "auto"
export type BracketQuality = "high" | "low"

export const useSettingsStore = defineStore("settings", () => {
  const theme = ref<Theme>("light")
  const locale = ref<Locale>("en")
  const groupLegMode = ref<LegMode>("single")
  const knockoutLegMode = ref<LegMode>("single")
  const finalLegMode = ref<LegMode>("single")
  const surpriseFactor = ref(50)
  const showTeamAbbr = ref(true)
  const confettiOnWin = ref(true)
  const soundOnWin = ref(true)
  const drawCeremony = ref(true)
  const newSeasonDrawType = ref<DrawType>("random")
  const newSeasonGroupDrawType = ref<DrawType>("random")
  const newSeasonPlayoffSeedMode = ref<PlayoffSeedMode>("cross")
  const tiebreaker = ref<Tiebreaker>("goal-diff")
  const formFactorEnabled = ref(false)
  const homeAdvantage = ref(6)
  const bracketStyle = ref<BracketStyle>("auto")
  const bracketQuality = ref<BracketQuality>("high")
  const bracketHighlightOnHover = ref(true)
  const bracketConnectorColors = ref(true)
  const winPoints = ref(3)
  const drawPoints = ref(1)
  const lossPoints = ref(0)
  const gradualReveal = ref(true)

  watch(
    theme,
    (val) => {
      document.documentElement.setAttribute("data-theme", val)
    },
    { immediate: true }
  )

  watch(
    locale,
    async (val) => {
      await loadLocale(val)
      i18n.global.locale.value = val
    },
    { immediate: true }
  )

  watch(surpriseFactor, (val) => setSimConfig({ surpriseFactor: val }), { immediate: true })
  watch(tiebreaker, (val) => setTableConfig({ tiebreaker: val }), { immediate: true })
  watch(formFactorEnabled, (val) => setSimConfig({ formFactor: val }), { immediate: true })
  watch(homeAdvantage, (val) => setSimConfig({ homeAdvantage: val }), { immediate: true })

  function resetAll() {
    theme.value = "light"
    locale.value = "en"
    groupLegMode.value = "single"
    knockoutLegMode.value = "single"
    finalLegMode.value = "single"
    surpriseFactor.value = 50
    showTeamAbbr.value = true
    confettiOnWin.value = true
    soundOnWin.value = true
    drawCeremony.value = true
    newSeasonDrawType.value = "random"
    newSeasonGroupDrawType.value = "random"
    newSeasonPlayoffSeedMode.value = "cross"
    tiebreaker.value = "goal-diff"
    formFactorEnabled.value = false
    homeAdvantage.value = 6
    bracketStyle.value = "auto"
    bracketQuality.value = "high"
    bracketHighlightOnHover.value = true
    bracketConnectorColors.value = true
    winPoints.value = 3
    drawPoints.value = 1
    lossPoints.value = 0
    gradualReveal.value = true
  }

  return {
    theme,
    locale,
    groupLegMode,
    knockoutLegMode,
    finalLegMode,
    surpriseFactor,
    showTeamAbbr,
    confettiOnWin,
    soundOnWin,
    drawCeremony,
    newSeasonDrawType,
    newSeasonGroupDrawType,
    newSeasonPlayoffSeedMode,
    tiebreaker,
    formFactorEnabled,
    homeAdvantage,
    bracketStyle,
    bracketQuality,
    bracketHighlightOnHover,
    bracketConnectorColors,
    winPoints,
    drawPoints,
    lossPoints,
    gradualReveal,
    resetAll,
  }
})
