<script setup lang="ts">
import { computed } from "vue"
import { useRouter } from "vue-router"
import { useTournamentStore } from "@/modules/tournament/store"
import { ChevronRight } from "lucide-vue-next"

const router = useRouter()
const store = useTournamentStore()

interface SeriesEntry {
  name: string
  seasons: number
  latestSeason: number
  teamCount: number
  format: string
  champId: string | null
}

const series = computed<SeriesEntry[]>(() => {
  const map = new Map<string, SeriesEntry>()
  for (const t of store.tournaments) {
    const finished = store.isTournamentFinished(t.id)
    const existing = map.get(t.name)
    if (!existing) {
      map.set(t.name, {
        name: t.name,
        seasons: 1,
        latestSeason: t.season,
        teamCount: t.teamIds.length,
        format: t.format,
        champId: finished ? t.winnerId : null,
      })
    } else {
      existing.seasons++
      if (t.season > existing.latestSeason) {
        existing.latestSeason = t.season
        existing.teamCount = t.teamIds.length
        existing.format = t.format
      }
      if (finished) existing.champId = t.winnerId
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
})
</script>

<template>
  <div class="page">
    <div class="page-top">
      <h2 class="page-title">History</h2>
    </div>

    <p v-if="!series.length" class="empty-text">No tournaments yet.</p>

    <div v-else class="t-list">
      <div v-for="s in series" :key="s.name" class="t-row">
        <div class="t-body">
          <div class="t-top">
            <span class="t-name">{{ s.name }}</span>
          </div>
          <div class="t-meta-row">
            <span class="t-badge">
              {{ s.seasons }} {{ s.seasons === 1 ? "season" : "seasons" }}
            </span>
            <span class="t-badge accent">
              {{
                s.format === "group+bracket"
                  ? "Groups+KO"
                  : s.format === "league"
                    ? "League"
                    : "Bracket"
              }}
            </span>
            <span class="t-dot">{{ s.teamCount }} teams</span>
          </div>
        </div>
        <div class="t-actions">
          <button
            class="sm icon-btn"
            @click.stop="router.push('/history/' + encodeURIComponent(s.name))"
          >
            <ChevronRight :size="14" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
