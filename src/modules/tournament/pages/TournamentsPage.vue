<script setup lang="ts">
import { ref, computed } from "vue"
import { useRouter } from "vue-router"
import { useTeamsStore } from "@/modules/teams/store"
import { useTournamentStore } from "@/modules/tournament/store"
import { useSettingsStore } from "@/modules/settings/store"
import type { Tournament } from "../types"
import TeamBadge from "@/modules/teams/components/TeamBadge.vue"
import BtnGroup from "@/components/BtnGroup.vue"
import { Trophy, X, Search, Plus, List, Grid3x3 } from "@lucide/vue"
import { showConfirm } from "@/composables/useDialog"
import { useI18n } from "vue-i18n"

const { t } = useI18n()
const router = useRouter()
const teamsStore = useTeamsStore()
const store = useTournamentStore()
const settings = useSettingsStore()

const viewOptions = computed(() => [
  { value: "list", label: t("tournaments.viewList"), icon: List },
  { value: "grid", label: t("tournaments.viewGrid"), icon: Grid3x3 },
])

function winnerColor(tour: Tournament) {
  return teamsStore.teams.find((tm) => tm.id === tour.winnerId)?.color ?? "#888"
}

const query = ref("")
const sortedTournaments = computed(() =>
  [...store.tournaments].sort((a, b) => b.createdAt - a.createdAt)
)

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return sortedTournaments.value
  return sortedTournaments.value.filter((t) => t.name.toLowerCase().includes(q))
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
      <button
        class="primary"
        :disabled="teamsStore.teams.length < 2"
        :title="teamsStore.teams.length < 2 ? t('tournaments.needTeamsTitle') : ''"
        @click="router.push('/tournaments/new')"
      >
        <Plus :size="12" />
        {{ t("tournaments.newBtn") }}
      </button>
    </div>

    <div v-if="teamsStore.teams.length < 2" class="notice">
      {{ t("tournaments.needTeamsNotice") }}
    </div>

    <div v-if="store.tournaments.length" class="search-row">
      <div class="search-wrap">
        <Search :size="14" class="search-icon" />
        <input
          v-model="query"
          class="search-input"
          :placeholder="t('tournaments.searchPlaceholder')"
        />
      </div>
      <BtnGroup v-model="settings.tournamentListView" :options="viewOptions" />
    </div>

    <div v-if="store.tournaments.length" class="t-list">
      <p v-if="!filtered.length" class="empty-text">{{ t("tournaments.noMatch", { query }) }}</p>
      <TransitionGroup
        name="list"
        tag="div"
        :class="settings.tournamentListView === 'grid' ? 't-grid' : 't-list-inner'"
      >
        <div
          v-for="(tour, i) in filtered"
          :key="tour.id"
          :class="settings.tournamentListView === 'grid' ? 't-card' : 't-row'"
          :style="{ '--i': i }"
          @click="router.push(`/tournaments/${tour.id}`)"
        >
          <div class="t-body">
            <span class="t-name">{{ tour.name }}</span>
            <div class="t-meta-row">
              <span class="t-meta-text">S{{ tour.season }}</span>
              <span class="t-meta-text format-text">{{ formatLabel(tour.format) }}</span>
              <span class="t-meta-text">{{ t("common.teams", { n: tour.teamIds.length }) }}</span>
            </div>
          </div>

          <div class="t-status">
            <span
              v-if="store.isTournamentFinished(tour.id)"
              class="winner-badge"
              :style="{ '--team-color': winnerColor(tour) }"
            >
              <Trophy :size="11" />
              <TeamBadge :team="teamsStore.teams.find((tm) => tm.id === tour.winnerId)" />
            </span>
            <span v-else class="status-live">{{ t("tournaments.live") }}</span>
          </div>

          <button class="danger sm icon-btn del-btn" @click.stop="deleteTournament(tour.id)">
            <X :size="13" />
          </button>
        </div>
      </TransitionGroup>
    </div>

    <div v-else-if="teamsStore.teams.length >= 2" class="empty-state">
      <Trophy :size="44" class="empty-icon" />
      <p class="empty-text">{{ t("tournaments.empty", { action: t("tournaments.newBtn") }) }}</p>
      <button class="primary" @click="router.push('/tournaments/new')">
        {{ t("tournaments.newBtn") }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 14px;
  text-align: center;
}
.empty-icon {
  color: var(--text-muted);
  opacity: 0.25;
}

.t-row {
  cursor: pointer;
}

.t-meta-row {
  gap: 0;
}

.t-meta-text {
  font-size: 11px;
  color: var(--text-muted);
}

.t-meta-text + .t-meta-text::before {
  content: "·";
  margin: 0 6px;
  opacity: 0.5;
}

@media (max-width: 640px) {
  .format-text {
    display: none;
  }
}

.t-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--sp-3);
  position: relative;
}

@media (min-width: 641px) {
  .t-grid {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  }
}

.t-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  padding: var(--sp-3);
  padding-right: 40px;
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-left: 3px solid transparent;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  min-width: 0;
  cursor: pointer;
  transition:
    border-color var(--dur-fast),
    box-shadow var(--dur),
    transform var(--dur),
    background var(--dur-fast);
}

.t-card:hover {
  border-color: var(--border);
  border-left-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 4%, var(--surface));
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

.t-card .t-body {
  gap: 6px;
}

.t-card .t-meta-row {
  flex-wrap: wrap;
}

.t-card .t-status {
  margin-top: 2px;
}

.t-card .del-btn {
  position: absolute;
  top: var(--sp-2);
  right: var(--sp-2);
}

@media (max-width: 640px) {
  .t-card {
    padding: 10px;
  }
}

.t-status {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.winner-badge {
  border-left: 2px solid var(--team-color, var(--accent));
  padding-left: 6px;
  background: color-mix(in srgb, var(--team-color, var(--border)) 8%, var(--bg));
}

.del-btn {
  flex-shrink: 0;
}
</style>
