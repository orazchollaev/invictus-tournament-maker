<script setup lang="ts">
import { ref, computed } from "vue"
import { useRouter } from "vue-router"
import { useTournamentStore } from "@/modules/tournament/store"
import { useSettingsStore } from "@/modules/settings/store"
import { useI18n } from "vue-i18n"
import { ChevronRight, History } from "@lucide/vue"
import { AppEmptyState, AppIcon, AppListItem, AppSearchInput } from "@/components/ui"
import { HistoryFilterMenu } from "@/modules/history/components"
import { ChampionPill } from "@/modules/tournament/components"
import { TeamCrest } from "@/modules/teams/components"
import { useTeamsStore } from "@/modules/teams/store"

const { t } = useI18n()
const router = useRouter()
const store = useTournamentStore()
const teamsStore = useTeamsStore()
const settings = useSettingsStore()
const query = ref("")

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
  return [...map.values()]
})

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  const list = q ? series.value.filter((s) => s.name.toLowerCase().includes(q)) : [...series.value]

  if (settings.historySortKey === "seasons") {
    list.sort((a, b) => (settings.historySortAsc ? a.seasons - b.seasons : b.seasons - a.seasons))
  } else if (settings.historySortKey === "name" && !settings.historySortAsc) {
    list.sort((a, b) => b.name.localeCompare(a.name))
  } else {
    list.sort((a, b) => a.name.localeCompare(b.name))
  }

  return list
})

/** The series' latest champion, if a season has been finished. */
function champion(s: SeriesEntry) {
  return s.champId ? teamsStore.teams.find((tm) => tm.id === s.champId) : undefined
}

function formatLabel(format: string) {
  if (format === "group+bracket") return t("tournaments.format.groupsKo")
  if (format === "league") return t("tournaments.format.league")
  if (format === "swiss") return t("tournaments.format.swiss")
  if (format === "custom") return t("tournaments.format.custom")
  return t("tournaments.format.bracket")
}
</script>

<template>
  <div class="page">
    <div class="page-top">
      <h2 class="page-title">{{ t("history.title") }}</h2>
    </div>

    <AppEmptyState v-if="!series.length" :description="t('history.empty')" />

    <template v-else>
      <div class="search-row">
        <AppSearchInput v-model="query" :placeholder="t('tournaments.searchPlaceholder')" />
        <HistoryFilterMenu
          v-model:sort-key="settings.historySortKey"
          v-model:sort-asc="settings.historySortAsc"
        />
      </div>

      <p v-if="!filtered.length" class="empty-text">{{ t("tournaments.noMatch", { query }) }}</p>

      <div v-if="filtered.length" class="t-list">
        <AppListItem
          v-for="s in filtered"
          :key="s.name"
          :title="s.name"
          :lead-icon="champion(s) ? undefined : History"
          @open="router.push('/history/' + encodeURIComponent(s.name))"
        >
          <template v-if="champion(s)" #lead>
            <TeamCrest :team="champion(s)!" :size="28" />
          </template>
          <template #subtitle>
            {{ s.seasons }} {{ s.seasons === 1 ? t("common.season", 1) : t("common.season", 2) }} ·
            {{ formatLabel(s.format) }} · {{ t("common.teams", { n: s.teamCount }) }}
          </template>
          <template #trail>
            <ChampionPill v-if="champion(s)" :team="champion(s)!" />
            <AppIcon :icon="ChevronRight" size="sm" class="series-chevron" />
          </template>
        </AppListItem>
      </div>
    </template>
  </div>
</template>

<style scoped>
.series-chevron {
  color: var(--text-muted);
}
</style>
