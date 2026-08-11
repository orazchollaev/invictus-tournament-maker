import { ref, computed, watch, nextTick, onScopeDispose, type ComputedRef } from "vue"
import { useRoute, useRouter } from "vue-router"
import type { Swiper as SwiperInstance } from "swiper/types"
import { useSwiperAutoHeight } from "@/composables/useSwiperAutoHeight"
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
   *
   * A tab click can jump more than one slide away (e.g. first tab to
   * last) — while that jump is animating, jumpRange widens the mounted
   * window to cover every slide the animation passes over, so it never
   * scrolls across an empty, unmounted slide. It collapses back to the
   * adjacent-only window once the transition ends.
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

  function isTabRendered(tab: MainTab) {
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

  let pendingUrlTab: MainTab | null = null
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
    // Only the cheap part runs here — the tab highlight has to keep up
    // with the finger. router.replace() re-renders the page, so it is
    // held back until the slide animation has finished.
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

  // visibleTabs can grow mid-session — e.g. "stats" appears the instant the
  // first result lands, possibly mid gradual-sim. css-mode never observes
  // the DOM on its own, so Swiper's internal slide bookkeeping goes stale
  // unless told about the new slide. Resyncing with update() does that in
  // place, instead of destroying and recreating the whole Swiper tree via a
  // :key remount — which would tear down whatever's mounted in the active
  // slide, including any in-flight simulation's timers.
  watch(
    () => visibleTabs.value.join("|"),
    () => {
      nextTick(() => {
        if (!swiperInstance) return
        swiperInstance.update()
        swiperInstance.slideTo(activeIndex.value, 0)
        settledIndex.value = activeIndex.value
        autoHeight.sync()
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
  }
}
