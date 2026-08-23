import { ref, computed, watch, onScopeDispose } from "vue"
import { useRoute, useRouter } from "vue-router"
import type { Swiper as SwiperInstance } from "swiper/types"
import { useSwiperAutoHeight } from "@/composables/useSwiperAutoHeight"

export type TeamTab = "overview" | "squad" | "matches"

const VALID_TABS: TeamTab[] = ["overview", "squad", "matches"]

/** Same Swiper/css-mode tab machinery as useTournamentTabs / useHistoryTabs —
 *  see those for the reasoning behind jumpRange, settledIndex and the
 *  settle-timer transitionEnd workaround. */
export function useTeamDetailTabs() {
  const route = useRoute()
  const router = useRouter()

  function tabFromQuery(): TeamTab {
    const q = route.query.tab as string
    return (VALID_TABS.includes(q as TeamTab) ? q : "overview") as TeamTab
  }

  const activeTab = ref<TeamTab>(tabFromQuery())

  function changeTab(tab: TeamTab) {
    activeTab.value = tab
    router.replace({ query: { tab } })
  }

  const visibleTabs = VALID_TABS
  const activeIndex = computed(() => visibleTabs.indexOf(activeTab.value))

  const jumpRange = ref<[number, number] | null>(null)
  const settledIndex = ref(activeIndex.value)

  function isTabRendered(tab: TeamTab) {
    const idx = visibleTabs.indexOf(tab)
    if (jumpRange.value) {
      const [from, to] = jumpRange.value
      return idx >= from && idx <= to
    }
    return Math.abs(idx - activeIndex.value) <= 1
  }

  let swiperInstance: SwiperInstance | null = null
  const autoHeight = useSwiperAutoHeight()

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

  let pendingUrlTab: TeamTab | null = null
  let isProgrammaticJump = false

  function onSlideChange(s: SwiperInstance) {
    if (isProgrammaticJump) return
    const tab = visibleTabs[s.activeIndex]
    if (!tab || tab === activeTab.value) return
    activeTab.value = tab
    pendingUrlTab = tab
  }

  function onSlideChangeEnd() {
    isProgrammaticJump = false
    autoHeight.sync()
    if (swiperInstance) settledIndex.value = swiperInstance.activeIndex
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
    () => route.params.id,
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
