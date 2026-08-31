import { ref, computed, watch, nextTick, onScopeDispose, type ComputedRef } from "vue"
import { useRoute } from "vue-router"
import type { Swiper as SwiperInstance } from "swiper/types"
import { getLeaguePlayoffData, isLeagueLike } from "@/engine"
import type { Tournament } from "@/modules/tournament/types"
import type { MainTab } from "../components/detail"

export function useTournamentTabs(
  tournament: ComputedRef<Tournament | undefined>,
  hasAnyResults: ComputedRef<boolean>
) {
  const route = useRoute()

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
    if (fmt === "league" || fmt === "swiss") return "league"
    if (fmt === "group+bracket") return "groups"
    return "bracket"
  }

  const activeTab = ref<MainTab>(defaultTab())
  const groupSubTab = ref<"groups" | "wildcards">("groups")
  const isGroupFormat = computed(() => tournament.value?.format === "group+bracket")
  const hasWildcards = computed(
    () => isGroupFormat.value && (tournament.value?.wildcardCount ?? 0) > 0
  )
  // Swiss reuses the league tab (and its table); only the label differs.
  const isLeagueFormat = computed(() => !!tournament.value && isLeagueLike(tournament.value))
  const isSwissFormat = computed(() => tournament.value?.format === "swiss")

  const leaguePlayoffData = computed(() =>
    tournament.value ? getLeaguePlayoffData(tournament.value) : undefined
  )
  const hasLeaguePlayoff = computed(() => !!leaguePlayoffData.value?.started)

  function changeTab(tab: MainTab, tierIdx?: number) {
    activeTab.value = tab
    if (tab === "league" && tierIdx !== undefined) {
      activeTierIdx.value = tierIdx
    }
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

  const jumpRange = ref<[number, number] | null>(null)
  const settledIndex = ref(activeIndex.value)

  function isTabRendered(tab: MainTab) {
    const idx = visibleTabs.value.indexOf(tab)
    if (jumpRange.value) {
      const [from, to] = jumpRange.value
      return idx >= from && idx <= to
    }
    return Math.abs(idx - activeIndex.value) <= 1
  }

  let swiperInstance: SwiperInstance | null = null

  const SETTLE_MS = 120
  let settleTimer: ReturnType<typeof setTimeout> | null = null
  function scheduleSettleCheck() {
    if (settleTimer) clearTimeout(settleTimer)
    settleTimer = setTimeout(() => {
      settleTimer = null
      onSlideChangeEnd()
    }, SETTLE_MS)
  }

  function onSwiperReady(s: SwiperInstance) {
    swiperInstance = s
    s.wrapperEl?.addEventListener("scroll", scheduleSettleCheck, { passive: true })
  }

  onScopeDispose(() => {
    if (settleTimer) clearTimeout(settleTimer)
    swiperInstance?.wrapperEl?.removeEventListener("scroll", scheduleSettleCheck)
  })

  // Set while a tab click drives the slide programmatically. css-mode
  // still fires "slide-change" for every slide the scroll passes over,
  // so without this guard a first-tab-to-last click would flash the tab
  // pill active on each slide in between before landing on the real one.
  let isProgrammaticJump = false

  function onSlideChange(s: SwiperInstance) {
    if (isProgrammaticJump) return
    const tab = visibleTabs.value[s.activeIndex]
    if (!tab || tab === activeTab.value) return
    activeTab.value = tab
  }

  function onSlideChangeEnd() {
    isProgrammaticJump = false
    if (swiperInstance) settledIndex.value = swiperInstance.activeIndex
    // Only collapse the mounted window once the settled slide matches
    // the tab we actually want — if a rapid click retargeted mid-flight,
    // this "end" belongs to a superseded jump and another is still coming.
    if (settledIndex.value === activeIndex.value) jumpRange.value = null
  }

  watch(
    () => visibleTabs.value.join("|"),
    () => {
      nextTick(() => {
        if (!swiperInstance) return
        swiperInstance.update()
        swiperInstance.slideTo(activeIndex.value, 0)
        settledIndex.value = activeIndex.value
      })
    }
  )

  watch(activeIndex, (idx) => {
    if (idx >= 0 && swiperInstance && swiperInstance.activeIndex !== idx) {
      const from = settledIndex.value
      if (Math.abs(from - idx) > 1 || jumpRange.value) {
        const [lo, hi] = jumpRange.value ?? [from, from]
        jumpRange.value = [Math.min(lo, from, idx), Math.max(hi, from, idx)]
      }
      isProgrammaticJump = true
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
      activeTab.value = defaultTab()
      activeTierIdx.value = 0
      groupSubTab.value = "groups"
    }
  )

  // The format is only known once the tournament resolves, and a tab can also
  // disappear mid-session — land on the first tab that actually exists.
  watch(visibleTabs, (tabs) => {
    if (tabs.length && !tabs.includes(activeTab.value)) activeTab.value = tabs[0]
  })

  return {
    isMultiTier,
    activeTierIdx,
    activeTab,
    groupSubTab,
    isGroupFormat,
    hasWildcards,
    isLeagueFormat,
    isSwissFormat,
    leaguePlayoffData,
    hasLeaguePlayoff,
    changeTab,
    visibleTabs,
    activeIndex,
    isTabRendered,
    onSwiperReady,
    onSlideChange,
  }
}
