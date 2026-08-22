import { ref, computed, watch, onScopeDispose, type ComputedRef } from "vue"
import { useRoute, useRouter } from "vue-router"
import type { Swiper as SwiperInstance } from "swiper/types"
import { useSwiperAutoHeight } from "@/composables/useSwiperAutoHeight"

export type HistoryTab = "champions" | "finals" | "alltime" | "stats" | "teams" | "players"

const VALID_TABS: HistoryTab[] = ["champions", "finals", "alltime", "stats", "teams", "players"]

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
    tabs.push("stats", "teams", "players")
    return tabs
  })
  const activeIndex = computed(() => visibleTabs.value.indexOf(activeTab.value))

  /**
   * Only the slide either side of the active one can come into view
   * mid-drag. Keeping the rest unmounted keeps every table and chart in
   * the history out of the DOM the swipe has to composite.
   *
   * A tab click can jump more than one slide away — while that jump is
   * animating, jumpRange widens the mounted window to cover every slide
   * the animation passes over, so it never scrolls across an empty,
   * unmounted slide. It collapses back to the adjacent-only window once
   * the transition ends.
   *
   * Rapid re-clicking retargets an in-flight transition before it ends.
   * swiperInstance.activeIndex flips to the new target the instant
   * slideTo() is called, so it can't be trusted as "where the slide
   * visually is right now" — using it as the jump's start point loses
   * whatever span the previous, interrupted jump was already covering.
   * settledIndex instead only moves once a transition genuinely
   * finishes, and each new jump unions its span into jumpRange rather
   * than replacing it, so the mounted window always covers the whole
   * chain of retargeted jumps, not just the latest one.
   */
  const jumpRange = ref<[number, number] | null>(null)
  const settledIndex = ref(activeIndex.value)

  function isTabRendered(tab: HistoryTab) {
    const idx = visibleTabs.value.indexOf(tab)
    if (jumpRange.value) {
      const [from, to] = jumpRange.value
      return idx >= from && idx <= to
    }
    return Math.abs(idx - activeIndex.value) <= 1
  }

  let swiperInstance: SwiperInstance | null = null
  /* css-mode disables Swiper's built-in autoHeight, so each tab's height is
     measured here instead — otherwise every tab is clipped to the first one. */
  const autoHeight = useSwiperAutoHeight()

  // css-mode never fires Swiper's "transitionEnd" — swiper-core's transitionEnd()
  // returns immediately when params.cssMode is set, and the cssMode scroll handler
  // (onScroll -> updateActiveIndex) never emits it either. So "slide-change-transition-end"
  // (bound in the template) never fires: settledIndex would never advance past its
  // initial value, isProgrammaticJump would latch true forever after the first
  // click and silently swallow every slide-change after it. Detect settling
  // ourselves instead, the same way useSwiperAutoHeight does: no more scroll
  // events on the wrapper for SETTLE_MS means the scroll has stopped.
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
    autoHeight.attach(s)
    s.wrapperEl?.addEventListener("scroll", scheduleSettleCheck, { passive: true })
  }

  onScopeDispose(() => {
    if (settleTimer) clearTimeout(settleTimer)
    swiperInstance?.wrapperEl?.removeEventListener("scroll", scheduleSettleCheck)
  })

  let pendingUrlTab: HistoryTab | null = null
  // Set while a tab click drives the slide programmatically. css-mode
  // still fires "slide-change" for every slide the scroll passes over,
  // so without this guard a first-tab-to-last click would flash the tab
  // pill active on each slide in between before landing on the real one.
  let isProgrammaticJump = false

  function onSlideChange(s: SwiperInstance) {
    // Deliberately does *not* re-measure the tab height here. Under css-mode
    // this fires once per slide the scroll crosses, and the wrapper is the
    // scroll container — resizing it mid-scroll cancels the native smooth
    // scroll and strands a multi-slide jump on an intermediate tab.
    // useSwiperAutoHeight waits for the scroll to settle instead.
    if (isProgrammaticJump) return
    const tab = visibleTabs.value[s.activeIndex]
    if (!tab || tab === activeTab.value) return
    // The tab highlight has to keep up with the finger; router.replace()
    // re-renders the page, so it waits for the animation to finish.
    activeTab.value = tab
    pendingUrlTab = tab
  }

  function onSlideChangeEnd() {
    isProgrammaticJump = false
    // The lazy window collapses just below, unmounting neighbours; re-measure
    // so the wrapper settles on the slide that is left.
    autoHeight.sync()
    if (swiperInstance) settledIndex.value = swiperInstance.activeIndex
    // Only collapse the mounted window once the settled slide matches
    // the tab we actually want — if a rapid click retargeted mid-flight,
    // this "end" belongs to a superseded jump and another is still coming.
    if (settledIndex.value === activeIndex.value) jumpRange.value = null
    if (!pendingUrlTab) return
    router.replace({ query: { tab: pendingUrlTab } })
    pendingUrlTab = null
  }

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
  }
}
