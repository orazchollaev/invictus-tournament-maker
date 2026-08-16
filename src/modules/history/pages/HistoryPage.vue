<script setup lang="ts">
import { ref, computed } from "vue"
import { useRouter } from "vue-router"
import { useTournamentStore } from "@/modules/tournament/store"
import { useSettingsStore } from "@/modules/settings/store"
import { useI18n } from "vue-i18n"
import { AppCard, AppChip, AppEmptyState, AppSearchInput } from "@/components/ui"
import HistoryFilterMenu from "../components/HistoryFilterMenu.vue"

const { t } = useI18n()
const router = useRouter()
const store = useTournamentStore()
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
        <AppCard
          v-for="s in filtered"
          :key="s.name"
          rail
          interactive
          padding="sm"
          class="series-row"
          @click="router.push('/history/' + encodeURIComponent(s.name))"
        >
          <span class="series-name">{{ s.name }}</span>
          <div class="series-meta">
            <AppChip>
              {{ s.seasons }} {{ s.seasons === 1 ? t("common.season", 1) : t("common.season", 2) }}
            </AppChip>
            <AppChip variant="accent">{{ formatLabel(s.format) }}</AppChip>
            <span class="series-teams">{{ t("common.teams", { n: s.teamCount }) }}</span>
          </div>
        </AppCard>
      </div>
    </template>
  </div>
</template>

<style scoped>
.series-row {
  cursor: pointer;
}

.series-row :deep(.card-body) {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
  min-width: 0;
}

.series-name {
  font-size: var(--fs-base);
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.series-meta {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}

.series-teams {
  font-size: var(--fs-xs);
  color: var(--text-muted);
}
/* Interpunct before the team count, separating it from the chips. */
.series-teams::before {
  content: "·";
  margin-inline-end: var(--sp-2);
  opacity: 0.5;
}
</style>
