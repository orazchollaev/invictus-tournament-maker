import { ref, computed, watch, type ComputedRef } from "vue"
import { useRoute } from "vue-router"

export type HistoryTab = "champions" | "finals" | "alltime" | "stats" | "teams" | "players"

export function useHistoryTabs(isLeagueSeries: ComputedRef<boolean>) {
  const route = useRoute()

  const activeTab = ref<HistoryTab>("champions")

  function changeTab(tab: HistoryTab) {
    activeTab.value = tab
  }

  const visibleTabs = computed<HistoryTab[]>(() => {
    const tabs: HistoryTab[] = ["champions", "finals"]
    if (isLeagueSeries.value) tabs.push("alltime")
    tabs.push("stats", "teams", "players")
    return tabs
  })

  watch(
    () => route.params.name,
    () => {
      activeTab.value = "champions"
    }
  )

  // "alltime" only exists for league series; drop off it if the series changes.
  watch(visibleTabs, (tabs) => {
    if (tabs.length && !tabs.includes(activeTab.value)) activeTab.value = tabs[0]
  })

  return {
    activeTab,
    changeTab,
    visibleTabs,
  }
}
