import { ref, computed, watch, type ComputedRef } from "vue"
import { useRoute, useRouter } from "vue-router"
import type { Swiper as SwiperInstance } from "swiper/types"
import { getLeaguePlayoffData } from "@/engine"
import type { Tournament } from "@/modules/tournament/types"
import type { MainTab } from "../components/detail"

const VALID_TABS: MainTab[] = ["groups", "bracket", "league", "stats", "participants"]

export function useTournamentTabs(
  tournament: ComputedRef<Tournament | undefined>,
  hasAnyResults: ComputedRef<boolean>
) {
  const route = useRoute()
  const router = useRouter()

  const isMultiTier = computed(() => (tournament.value?.tiers?.length ?? 0) > 1)
  const activeTierIdx = ref(0)

  watch(
    () => tournament.value?.tiers?.length,
    (len) => {
      if (len !== undefined && activeTierIdx.value >= len) activeTierIdx.value = 0
    }
  )

  function defaultTab(): MainTab {
    const fmt = tournament.value?.format
    if (fmt === "league") return "league"
    if (fmt === "group+bracket") return "groups"
    return "bracket"
  }

  function tabFromQuery(): MainTab {
    const q = route.query.tab as string
    return (VALID_TABS.includes(q as MainTab) ? q : defaultTab()) as MainTab
  }

  const activeTab = ref<MainTab>(tabFromQuery())
  const groupSubTab = ref<"groups" | "wildcards">("groups")
  const isGroupFormat = computed(() => tournament.value?.format === "group+bracket")
  const hasWildcards = computed(
    () => isGroupFormat.value && (tournament.value?.wildcardCount ?? 0) > 0
  )
  const isLeagueFormat = computed(() => tournament.value?.format === "league")

  const leaguePlayoffData = computed(() =>
    tournament.value ? getLeaguePlayoffData(tournament.value) : undefined
  )
  const hasLeaguePlayoff = computed(() => !!leaguePlayoffData.value?.started)

  function changeTab(tab: MainTab, tierIdx?: number) {
    activeTab.value = tab
    if (tab === "league" && tierIdx !== undefined) {
      activeTierIdx.value = tierIdx
    }
    router.replace({ query: { tab } })
  }

  const visibleTabs = computed<MainTab[]>(() => {
    const tabs: MainTab[] = []
    if (isLeagueFormat.value) {
      tabs.push("league")
      if (hasLeaguePlayoff.value) tabs.push("bracket")
    } else if (isGroupFormat.value) {
      tabs.push("groups")
      if (tournament.value?.groupsDone) tabs.push("bracket")
    } else {
      tabs.push("bracket")
    }
    if (hasAnyResults.value) tabs.push("stats")
    tabs.push("participants")
    return tabs
  })
  const activeIndex = computed(() => visibleTabs.value.indexOf(activeTab.value))

  /**
   * Mounting every tab at once puts the whole bracket, the group and
   * league tables, the stats charts and the participants table in the
   * DOM together, and the swipe then has to composite — and autoHeight
   * has to measure — all of it every frame. Only the slide either side
   * of the active one can come into view mid-drag, so nothing further
   * out needs to exist.
   */
  function isTabRendered(tab: MainTab) {
    return Math.abs(visibleTabs.value.indexOf(tab) - activeIndex.value) <= 1
  }

  let swiperInstance: SwiperInstance | null = null

  function onSwiperReady(s: SwiperInstance) {
    swiperInstance = s
  }

  let pendingUrlTab: MainTab | null = null

  function onSlideChange(s: SwiperInstance) {
    const tab = visibleTabs.value[s.activeIndex]
    if (!tab || tab === activeTab.value) return
    // Only the cheap part runs here — the tab highlight has to keep up
    // with the finger. router.replace() re-renders the page, so it is
    // held back until the slide animation has finished.
    activeTab.value = tab
    pendingUrlTab = tab
  }

  function onSlideChangeEnd() {
    if (!pendingUrlTab) return
    router.replace({ query: { tab: pendingUrlTab } })
    pendingUrlTab = null
  }

  watch(activeIndex, (idx) => {
    if (idx >= 0 && swiperInstance && swiperInstance.activeIndex !== idx) {
      swiperInstance.slideTo(idx)
    }
  })

  watch(
    () => tournament.value?.groupsDone,
    (done) => {
      if (done) changeTab("bracket")
    }
  )

  watch(
    () => leaguePlayoffData.value?.started,
    (started) => {
      if (started) changeTab("bracket")
    }
  )

  watch(
    () => route.params.id,
    () => {
      activeTab.value = tabFromQuery()
      activeTierIdx.value = 0
      groupSubTab.value = "groups"
    }
  )

  watch(
    () => route.query.tab,
    () => {
      activeTab.value = tabFromQuery()
    }
  )

  return {
    isMultiTier,
    activeTierIdx,
    activeTab,
    groupSubTab,
    isGroupFormat,
    hasWildcards,
    isLeagueFormat,
    leaguePlayoffData,
    hasLeaguePlayoff,
    changeTab,
    visibleTabs,
    activeIndex,
    isTabRendered,
    onSwiperReady,
    onSlideChange,
    onSlideChangeEnd,
  }
}
