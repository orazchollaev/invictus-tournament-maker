import { computed, onMounted, ref } from "vue"
import type { Team } from "@/modules/teams/types"
import * as api from "../services/marketApi"
import { toLocalTeam } from "../utils/toLocalTeam"
import type { MarketDataset, MarketListing } from "../types"

export interface PreviewRow {
  team: Team
  players: number
}

/**
 * Fetches a dataset ahead of the download so its teams can be looked through
 * (and picked from). The same payload is then added, so a preview costs no
 * extra read.
 */
export function useMarketPreview(listing: MarketListing) {
  const dataset = ref<MarketDataset | null>(null)
  const rows = ref<PreviewRow[]>([])
  const loading = ref(true)
  const error = ref<"network" | "invalid" | null>(null)
  const picked = ref(new Set<string>())
  const query = ref("")

  async function load() {
    loading.value = true
    error.value = null
    try {
      const data = await api.fetchDataset(listing.id)
      if (!data) {
        error.value = "invalid"
        return
      }
      // The crest engine is loaded only when a team actually has a crest to draw.
      const renderCrest = data.teams.some((x) => x.crest)
        ? (await import("@/engine/crest")).renderCrestDataUrl
        : undefined
      const counts = new Map<string, number>()
      for (const p of data.players ?? []) counts.set(p.teamId, (counts.get(p.teamId) ?? 0) + 1)
      rows.value = data.teams.map((x) => ({
        team: toLocalTeam(x, renderCrest),
        players: counts.get(x.id) ?? 0,
      }))
      dataset.value = data
      picked.value = new Set(data.teams.map((x) => x.id))
    } catch {
      error.value = "network"
    } finally {
      loading.value = false
    }
  }

  onMounted(load)

  const visible = computed(() => {
    const q = query.value.trim().toLowerCase()
    if (!q) return rows.value
    return rows.value.filter(
      ({ team }) => team.name.toLowerCase().includes(q) || team.abbr?.toLowerCase().includes(q)
    )
  })

  const stats = computed(() => {
    const teams = rows.value.map((r) => r.team)
    if (!teams.length) return null
    const total = teams.reduce((sum, x) => sum + x.power, 0)
    return {
      average: Math.round(total / teams.length),
      strongest: teams.reduce((a, b) => (b.power > a.power ? b : a)),
      players: rows.value.reduce((sum, r) => sum + r.players, 0),
    }
  })

  function toggle(id: string) {
    const next = new Set(picked.value)
    if (!next.delete(id)) next.add(id)
    picked.value = next
  }

  /** Selects or clears everything the search currently shows. */
  function toggleVisible() {
    const ids = visible.value.map((r) => r.team.id)
    const all = ids.every((id) => picked.value.has(id))
    const next = new Set(picked.value)
    for (const id of ids) {
      if (all) next.delete(id)
      else next.add(id)
    }
    picked.value = next
  }

  const allVisiblePicked = computed(
    () => visible.value.length > 0 && visible.value.every((r) => picked.value.has(r.team.id))
  )

  return {
    dataset,
    loading,
    error,
    picked,
    query,
    visible,
    stats,
    allVisiblePicked,
    load,
    toggle,
    toggleVisible,
  }
}
