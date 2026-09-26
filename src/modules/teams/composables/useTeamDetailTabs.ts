import { ref, watch } from "vue"
import { useRoute } from "vue-router"

export type TeamTab = "overview" | "squad" | "matches"

const VALID_TABS: TeamTab[] = ["overview", "squad", "matches"]

export function useTeamDetailTabs() {
  const route = useRoute()

  const activeTab = ref<TeamTab>("overview")

  function changeTab(tab: TeamTab) {
    activeTab.value = tab
  }

  const visibleTabs = VALID_TABS

  watch(
    () => route.params.id,
    () => {
      activeTab.value = "overview"
    }
  )

  return {
    activeTab,
    changeTab,
    visibleTabs,
  }
}
