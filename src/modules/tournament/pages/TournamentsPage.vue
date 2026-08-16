<script setup lang="ts">
import { ref, computed } from "vue"
import { useRouter } from "vue-router"
import { useTeamsStore } from "@/modules/teams/store"
import { useTournamentStore } from "@/modules/tournament/store"
import { useSettingsStore } from "@/modules/settings/store"
import type { Tournament } from "../types"
import TeamBadge from "@/modules/teams/components/TeamBadge.vue"
import {
  AppButton,
  AppCard,
  AppEmptyState,
  AppIcon,
  AppSearchInput,
  BtnGroup,
} from "@/components/ui"
import { Trophy, X, Plus, List, Grid3x3 } from "@lucide/vue"
import { showConfirm } from "@/composables/useDialog"
import { useI18n } from "vue-i18n"

/** A tournament cannot be created with fewer teams than this. */
const MIN_TEAMS = 2

const { t } = useI18n()
const router = useRouter()
const teamsStore = useTeamsStore()
const store = useTournamentStore()
const settings = useSettingsStore()

const viewOptions = computed(() => [
  { value: "list", label: t("tournaments.viewList"), icon: List },
  { value: "grid", label: t("tournaments.viewGrid"), icon: Grid3x3 },
])

const isGrid = computed(() => settings.tournamentListView === "grid")
const hasEnoughTeams = computed(() => teamsStore.teams.length >= MIN_TEAMS)

function winnerTeam(tour: Tournament) {
  return teamsStore.teams.find((tm) => tm.id === tour.winnerId)
}

const query = ref("")
const sortedTournaments = computed(() =>
  [...store.tournaments].sort((a, b) => b.createdAt - a.createdAt)
)

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return sortedTournaments.value
  return sortedTournaments.value.filter((tn) => tn.name.toLowerCase().includes(q))
})

function formatLabel(format: string) {
  if (format === "group+bracket") return t("tournaments.format.groupsKo")
  if (format === "league") return t("tournaments.format.league")
  return t("tournaments.format.bracket")
}

async function deleteTournament(id: string) {
  if (
    await showConfirm(t("tournaments.deleteConfirm"), {
      confirmLabel: t("tournaments.deleteLabel"),
      dangerous: true,
    })
  )
    store.remove(id)
}
</script>

<template>
  <div class="page">
    <div class="page-top">
      <h2 class="page-title">{{ t("tournaments.title") }}</h2>
      <AppButton
        variant="filled"
        :disabled="!hasEnoughTeams"
        :title="hasEnoughTeams ? '' : t('tournaments.needTeamsTitle')"
        @click="router.push('/tournaments/new')"
      >
        <AppIcon :icon="Plus" size="xs" />
        {{ t("tournaments.newBtn") }}
      </AppButton>
    </div>

    <div v-if="!hasEnoughTeams" class="notice">{{ t("tournaments.needTeamsNotice") }}</div>

    <div v-if="store.tournaments.length" class="search-row">
      <AppSearchInput v-model="query" :placeholder="t('tournaments.searchPlaceholder')" />
      <BtnGroup v-model="settings.tournamentListView" :options="viewOptions" />
    </div>

    <div v-if="store.tournaments.length" class="t-list">
      <p v-if="!filtered.length" class="empty-text">{{ t("tournaments.noMatch", { query }) }}</p>
      <TransitionGroup name="list" tag="div" :class="isGrid ? 'tour-grid' : 't-list-inner'">
        <AppCard
          v-for="(tour, i) in filtered"
          :key="tour.id"
          rail
          interactive
          padding="sm"
          class="tour-card"
          :class="{ 'tour-card--grid': isGrid }"
          :style="{
            '--i': i,
            '--rail-color': winnerTeam(tour)?.color,
            '--team-color': winnerTeam(tour)?.color,
          }"
          @click="router.push(`/tournaments/${tour.id}`)"
        >
          <div class="tour-body">
            <span class="tour-name">{{ tour.name }}</span>
            <div class="tour-meta">
              <span class="tour-meta-text">S{{ tour.season }}</span>
              <span class="tour-meta-text format-text">{{ formatLabel(tour.format) }}</span>
              <span class="tour-meta-text">
                {{ t("common.teams", { n: tour.teamIds.length }) }}
              </span>
            </div>
          </div>

          <span v-if="store.isTournamentFinished(tour.id)" class="tour-winner">
            <AppIcon :icon="Trophy" size="xs" />
            <TeamBadge :team="winnerTeam(tour)" />
          </span>

          <AppButton
            variant="danger"
            icon-only
            class="tour-delete"
            @click.stop="deleteTournament(tour.id)"
          >
            <AppIcon :icon="X" />
          </AppButton>
        </AppCard>
      </TransitionGroup>
    </div>

    <AppEmptyState
      v-else-if="hasEnoughTeams"
      :icon="Trophy"
      :description="t('tournaments.empty', { action: t('tournaments.newBtn') })"
    >
      <template #action>
        <AppButton variant="filled" @click="router.push('/tournaments/new')">
          {{ t("tournaments.newBtn") }}
        </AppButton>
      </template>
    </AppEmptyState>
  </div>
</template>

<style scoped>
.tour-card {
  cursor: pointer;
}

/* List: name block, winner and delete on one line. */
.tour-card :deep(.card-body) {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  min-width: 0;
}

.tour-body {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
  flex: 1;
  min-width: 0;
}

.tour-name {
  font-size: var(--fs-base);
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tour-meta {
  display: flex;
  align-items: center;
}

.tour-meta-text {
  font-size: var(--fs-xs);
  color: var(--text-muted);
}
/* Interpunct separator between meta items. */
.tour-meta-text + .tour-meta-text::before {
  content: "·";
  margin: 0 var(--sp-2);
  opacity: 0.5;
}

.tour-winner {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-1);
  flex-shrink: 0;
  font-size: var(--fs-xs);
  font-weight: 600;
  padding: 2px var(--sp-2) 2px var(--sp-2);
  border-left: 2px solid var(--team-color, var(--accent));
  border-radius: 0 var(--radius) var(--radius) 0;
  background: color-mix(in srgb, var(--team-color, var(--border)) 8%, var(--bg));
}

.tour-delete {
  flex-shrink: 0;
}

/* ── Grid ────────────────────────────────────────────────────── */
.tour-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--sp-3);
  position: relative;
}

@media (min-width: 641px) {
  .tour-grid {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  }
}

/* Grid: stack, with the delete button pinned to the card's top-right. */
.tour-card--grid {
  position: relative;
}

.tour-card--grid :deep(.card-body) {
  flex-direction: column;
  align-items: flex-start;
  gap: var(--sp-2);
  padding-inline-end: 40px;
}

.tour-card--grid .tour-meta {
  flex-wrap: wrap;
}

.tour-card--grid .tour-delete {
  position: absolute;
  top: var(--sp-2);
  inset-inline-end: var(--sp-2);
}

@media (max-width: 600px) {
  .format-text {
    display: none;
  }
}
</style>
