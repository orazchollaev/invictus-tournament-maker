import { ref, computed, watch, type ComputedRef } from "vue"
import { useRoute } from "vue-router"
import { getLeaguePlayoffData, isCustomFormat, isLeagueLike, topoOrder } from "@/engine"
import type { Tournament, TournamentPhase } from "@/modules/tournament/types"
import { phaseTab, type MainTab } from "../components/detail"

export function useTournamentTabs(tournament: ComputedRef<Tournament | undefined>) {
  const route = useRoute()

  const isMultiTier = computed(() => (tournament.value?.tiers?.length ?? 0) > 1)
  const activeTierIdx = ref(0)

  watch(
    () => tournament.value?.tiers?.length,
    (len) => {
      if (len !== undefined && activeTierIdx.value >= len) activeTierIdx.value = 0
    }
  )

  const isCustom = computed(() => !!tournament.value && isCustomFormat(tournament.value))

  /** Phases in the order the graph runs, so the tabs read left to right. */
  const orderedPhases = computed<TournamentPhase[]>(() => {
    const t = tournament.value
    if (!t?.phases?.length) return []
    return topoOrder(t.phases, t.phaseEdges ?? []) ?? t.phases
  })

  function defaultTab(): MainTab {
    // A managed side is what the user came back for — the rest is scenery.
    if (tournament.value?.manager) return "manager"
    const fmt = tournament.value?.format
    if (fmt === "custom") {
      // The first phase still unfinished, or the last one once it is all over —
      // the same "where is the user now" rule the fixtures picker uses.
      const phases = orderedPhases.value
      const live = phases.find((p) => p.status !== "done") ?? phases[phases.length - 1]
      return live ? phaseTab(live.id) : "fixtures"
    }
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

  // Whether this tournament ever reaches a bracket phase at all — always for
  // knockout and group+bracket, only for league/swiss when a playoff is
  // configured. Independent of whether that phase has actually arrived yet.
  const bracketAllowed = computed(() => {
    if (isLeagueFormat.value) return !!leaguePlayoffData.value?.enabled
    return true
  })

  // Whether the bracket tab has real content to show right now, vs. a
  // "come back later" placeholder.
  const bracketReady = computed(() => {
    if (isGroupFormat.value) return !!tournament.value?.groupsDone
    if (isLeagueFormat.value) return hasLeaguePlayoff.value
    return true
  })

  function changeTab(tab: MainTab, tierIdx?: number) {
    activeTab.value = tab
    if (tab === "league" && tierIdx !== undefined) {
      activeTierIdx.value = tierIdx
    }
  }

  const visibleTabs = computed<MainTab[]>(() => {
    const tabs: MainTab[] = []
    if (tournament.value?.manager) tabs.push("manager")
    if (isCustom.value) {
      for (const phase of orderedPhases.value) tabs.push(phaseTab(phase.id))
      tabs.push("fixtures", "stats", "participants")
      return tabs
    }
    if (isLeagueFormat.value) {
      tabs.push("league")
      if (bracketAllowed.value) tabs.push("bracket")
    } else if (isGroupFormat.value) {
      tabs.push("groups", "bracket")
    } else {
      tabs.push("bracket")
    }
    tabs.push("fixtures", "stats", "participants")
    return tabs
  })

  // The auto-jumps below are for someone watching a stage unfold. A manager
  // stays on their own tab: the next stage arriving is not theirs to look at
  // until they choose to.
  const isManaged = () => !!tournament.value?.manager

  watch(
    () => tournament.value?.groupsDone,
    (done) => {
      if (done && !isManaged()) changeTab("bracket")
    }
  )

  // Advancing into a phase is the custom format's equivalent of a bracket being
  // seeded: the stage the user pressed for has just appeared, so show it.
  watch(
    () => orderedPhases.value.filter((p) => p.status === "active").map((p) => p.id),
    (activeIds, previous) => {
      if (!isCustom.value || isManaged()) return
      const fresh = activeIds.find((id) => !(previous ?? []).includes(id))
      if (fresh) changeTab(phaseTab(fresh))
    }
  )

  watch(
    () => leaguePlayoffData.value?.started,
    (started) => {
      if (started && !isManaged()) changeTab("bracket")
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
    isCustom,
    orderedPhases,
    isGroupFormat,
    hasWildcards,
    isLeagueFormat,
    isSwissFormat,
    leaguePlayoffData,
    hasLeaguePlayoff,
    bracketAllowed,
    bracketReady,
    changeTab,
    visibleTabs,
  }
}
