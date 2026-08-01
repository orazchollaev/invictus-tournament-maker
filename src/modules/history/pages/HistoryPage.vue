<script setup lang="ts">
import { computed } from "vue"
import { useRouter } from "vue-router"
import { useTournamentStore } from "@/modules/tournament/store"
import { useI18n } from "vue-i18n"
import { AppCard, AppChip, AppEmptyState } from "@/components/ui"

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

    <AppEmptyState v-if="!series.length" :description="t('history.empty')" />

    <div v-else class="t-list">
      <AppCard
        v-for="s in series"
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
  margin-right: var(--sp-2);
  opacity: 0.5;
}
</style>
