import { defineStore } from "pinia"
import { ref, watch } from "vue"
import type { LegMode, MatchEventType, PlayoffSeedMode } from "@/modules/tournament/types"
import { setSimConfig, setTableConfig, setPowerResolver } from "@/engine"
import type { Tiebreaker } from "@/modules/tournament/types"
import { i18n, isRtl, loadLocale } from "@/i18n"
import type { Locale } from "@/i18n"
import { usePlayersStore } from "@/modules/players/store"

export type Theme = "light" | "dark"
/** Platform look: shape, elevation, type scale and neutrals — never the accent. */
export type DesignLanguage = "ios" | "android"
export type DrawType = "random" | "seeded" | "manual"
export type BracketStyle = "double-sided" | "classic" | "auto"
export type BracketQuality = "high" | "low"
export type TournamentListView = "list" | "grid"
export type TeamsSortKey = "default" | "name" | "power"
export type PlayersSortKey = "default" | "name" | "power"
export type TournamentsSortKey = "default" | "name" | "season"
export type HistorySortKey = "default" | "name" | "seasons"
/** Game minutes per real second is 2 at 1x, so a match runs about 45 seconds. */
export type LiveMatchSpeed = 1 | 2 | 4 | 10

const ALL_EVENT_TYPES: MatchEventType[] = ["goal", "penGoal", "ownGoal", "penMiss", "yellow", "red"]

export const useSettingsStore = defineStore("settings", () => {
  const theme = ref<Theme>("dark")
  const designLanguage = ref<DesignLanguage>("ios")
  const locale = ref<Locale>("en")
  const primaryColor = ref<string | null>(null)
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
  const usePlayerPower = ref(true)
  const bracketStyle = ref<BracketStyle>("auto")
  const bracketQuality = ref<BracketQuality>("high")
  const bracketHighlightOnHover = ref(true)
  const bracketConnectorColors = ref(true)
  const winPoints = ref(3)
  const drawPoints = ref(1)
  const lossPoints = ref(0)
  const gradualReveal = ref(true)
  const liveMatchSpeed = ref<LiveMatchSpeed>(2)
  const tournamentListView = ref<TournamentListView>("list")
  const teamsListView = ref<TournamentListView>("list")
  const teamsSortKey = ref<TeamsSortKey>("default")
  const teamsSortAsc = ref(true)
  const playersListView = ref<TournamentListView>("list")
  const playersSortKey = ref<PlayersSortKey>("default")
  const playersSortAsc = ref(true)
  const tournamentsSortKey = ref<TournamentsSortKey>("default")
  const tournamentsSortAsc = ref(true)
  const historySortKey = ref<HistorySortKey>("default")
  const historySortAsc = ref(true)
  const liveEventFilter = ref<Record<MatchEventType, boolean>>({
    goal: true,
    penGoal: true,
    ownGoal: true,
    penMiss: true,
    yellow: true,
    red: true,
  })

  watch(
    theme,
    (val) => {
      document.documentElement.setAttribute("data-theme", val)
    },
    { immediate: true }
  )

  watch(
    designLanguage,
    (val) => {
      document.documentElement.setAttribute("data-design", val)
    },
    { immediate: true }
  )

  watch(
    locale,
    async (val) => {
      await loadLocale(val)
      i18n.global.locale.value = val
      document.documentElement.setAttribute("lang", val)
      document.documentElement.setAttribute("dir", isRtl(val) ? "rtl" : "ltr")
    },
    { immediate: true }
  )

  watch(
    primaryColor,
    (val) => {
      const root = document.documentElement.style
      if (val) {
        root.setProperty("--accent", val)
        root.setProperty("--accent-hover", `color-mix(in srgb, ${val} 85%, black)`)
        root.setProperty("--accent-subtle", `color-mix(in srgb, ${val} 10%, transparent)`)
      } else {
        root.removeProperty("--accent")
        root.removeProperty("--accent-hover")
        root.removeProperty("--accent-subtle")
      }
    },
    { immediate: true }
  )

  watch(surpriseFactor, (val) => setSimConfig({ surpriseFactor: val }), { immediate: true })
  watch(tiebreaker, (val) => setTableConfig({ tiebreaker: val }), { immediate: true })
  watch(formFactorEnabled, (val) => setSimConfig({ formFactor: val }), { immediate: true })
  watch(homeAdvantage, (val) => setSimConfig({ homeAdvantage: val }), { immediate: true })

  const playersStore = usePlayersStore()
  watch(
    usePlayerPower,
    (enabled) => {
      if (!enabled) {
        setPowerResolver(null)
        return
      }
      setPowerResolver((team) => {
        const squad = playersStore.byTeam(team.id)
        if (!squad.length) return team.power
        const avgSquadPower = squad.reduce((sum, p) => sum + p.power, 0) / squad.length
        return Math.round((team.power + avgSquadPower) / 2)
      })
    },
    { immediate: true }
  )

  function resetAll() {
    theme.value = "dark"
    designLanguage.value = "ios"
    locale.value = "en"
    primaryColor.value = null
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
    usePlayerPower.value = true
    bracketStyle.value = "auto"
    bracketQuality.value = "high"
    bracketHighlightOnHover.value = true
    bracketConnectorColors.value = true
    winPoints.value = 3
    drawPoints.value = 1
    lossPoints.value = 0
    gradualReveal.value = true
    liveMatchSpeed.value = 2
    tournamentListView.value = "list"
    teamsListView.value = "list"
    teamsSortKey.value = "default"
    teamsSortAsc.value = true
    playersListView.value = "list"
    playersSortKey.value = "default"
    playersSortAsc.value = true
    tournamentsSortKey.value = "default"
    tournamentsSortAsc.value = true
    historySortKey.value = "default"
    historySortAsc.value = true
    for (const type of ALL_EVENT_TYPES) liveEventFilter.value[type] = true
  }

  return {
    theme,
    designLanguage,
    locale,
    primaryColor,
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
    usePlayerPower,
    bracketStyle,
    bracketQuality,
    bracketHighlightOnHover,
    bracketConnectorColors,
    winPoints,
    drawPoints,
    lossPoints,
    gradualReveal,
    liveMatchSpeed,
    tournamentListView,
    teamsListView,
    teamsSortKey,
    teamsSortAsc,
    playersListView,
    playersSortKey,
    playersSortAsc,
    tournamentsSortKey,
    tournamentsSortAsc,
    historySortKey,
    historySortAsc,
    liveEventFilter,
    resetAll,
  }
})
