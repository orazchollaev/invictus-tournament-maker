import { ref, computed, watch, type ComputedRef } from "vue"
import { useRoute, useRouter } from "vue-router"
import type { Swiper as SwiperInstance } from "swiper/types"

export type HistoryTab = "champions" | "finals" | "alltime" | "stats" | "teams"

const VALID_TABS: HistoryTab[] = ["champions", "finals", "alltime", "stats", "teams"]

export function useHistoryTabs(isLeagueSeries: ComputedRef<boolean>) {
  const route = useRoute()
  const router = useRouter()

  function tabFromQuery(): HistoryTab {
    const q = route.query.tab as string
    if (VALID_TABS.includes(q as HistoryTab) && (q !== "alltime" || isLeagueSeries.value)) {
      return q as HistoryTab
    }
    return "champions"
  }

  const activeTab = ref<HistoryTab>(tabFromQuery())

  function changeTab(tab: HistoryTab) {
    activeTab.value = tab
    router.replace({ query: { tab } })
  }

  const visibleTabs = computed<HistoryTab[]>(() => {
    const tabs: HistoryTab[] = ["champions", "finals"]
    if (isLeagueSeries.value) tabs.push("alltime")
    tabs.push("stats", "teams")
    return tabs
  })
  const activeIndex = computed(() => visibleTabs.value.indexOf(activeTab.value))

  /**
   * Only the slide either side of the active one can come into view
   * mid-drag. Keeping the rest unmounted keeps every table and chart in
   * the history out of the DOM the swipe has to composite.
   */
  function isTabRendered(tab: HistoryTab) {
    return Math.abs(visibleTabs.value.indexOf(tab) - activeIndex.value) <= 1
  }

  let swiperInstance: SwiperInstance | null = null

  function onSwiperReady(s: SwiperInstance) {
    swiperInstance = s
  }

  let pendingUrlTab: HistoryTab | null = null

  function onSlideChange(s: SwiperInstance) {
    const tab = visibleTabs.value[s.activeIndex]
    if (!tab || tab === activeTab.value) return
    // The tab highlight has to keep up with the finger; router.replace()
    // re-renders the page, so it waits for the animation to finish.
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
    () => route.query.tab,
    () => {
      activeTab.value = tabFromQuery()
    }
  )

  watch(
    () => route.params.name,
    () => {
      activeTab.value = tabFromQuery()
    }
  )

  return {
    activeTab,
    changeTab,
    visibleTabs,
    activeIndex,
    isTabRendered,
    onSwiperReady,
    onSlideChange,
    onSlideChangeEnd,
  }
}
