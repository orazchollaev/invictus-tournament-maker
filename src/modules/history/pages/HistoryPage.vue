<script setup lang="ts">
import { computed } from "vue"
import { useRouter } from "vue-router"
import { useTournamentStore } from "@/modules/tournament/store"
import { ChevronRight } from "@lucide/vue"
import { useI18n } from "vue-i18n"

const { t } = useI18n()
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
  for (const tour of store.tournaments) {
    const finished = store.isTournamentFinished(tour.id)
    const existing = map.get(tour.name)
    if (!existing) {
      map.set(tour.name, {
        name: tour.name,
        seasons: 1,
        latestSeason: tour.season,
        teamCount: tour.teamIds.length,
        format: tour.format,
        champId: finished ? tour.winnerId : null,
      })
    } else {
      existing.seasons++
      if (tour.season > existing.latestSeason) {
        existing.latestSeason = tour.season
        existing.teamCount = tour.teamIds.length
        existing.format = tour.format
      }
      if (finished) existing.champId = tour.winnerId
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
})

function formatLabel(format: string) {
  if (format === "group+bracket") return t("tournaments.format.groupsKo")
  if (format === "league") return t("tournaments.format.league")
  return t("tournaments.format.bracket")
}
</script>

<template>
  <div class="page">
    <div class="page-top">
      <h2 class="page-title">{{ t("history.title") }}</h2>
    </div>

    <p v-if="!series.length" class="empty-text">{{ t("history.empty") }}</p>

    <div v-else class="t-list">
      <div v-for="s in series" :key="s.name" class="t-row">
        <div class="t-body">
          <div class="t-top">
            <span class="t-name">{{ s.name }}</span>
          </div>
          <div class="t-meta-row">
            <span class="t-badge">
              {{ s.seasons }} {{ s.seasons === 1 ? t("common.season", 1) : t("common.season", 2) }}
            </span>
            <span class="t-badge accent">{{ formatLabel(s.format) }}</span>
            <span class="t-dot">{{ t("common.teams", { n: s.teamCount }) }}</span>
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
