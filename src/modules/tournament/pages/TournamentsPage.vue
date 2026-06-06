<script setup lang="ts">
import { ref, computed } from "vue"
import { useRouter } from "vue-router"
import { useTeamsStore } from "@/modules/teams/store"
import { useTournamentStore } from "@/modules/tournament/store"
import type { Tournament } from "../types"
import { Trophy, X, Search } from "@lucide/vue"
import { showConfirm } from "@/composables/useDialog"
import { useI18n } from "vue-i18n"

const { t } = useI18n()
const router = useRouter()
const teamsStore = useTeamsStore()
const store = useTournamentStore()

function winnerName(tour: Tournament) {
  return teamsStore.teams.find((tm) => tm.id === tour.winnerId)?.name ?? "?"
}
function winnerColor(tour: Tournament) {
  return teamsStore.teams.find((tm) => tm.id === tour.winnerId)?.color ?? "#888"
}

const query = ref("")
const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return store.tournaments
  return store.tournaments.filter((t) => t.name.toLowerCase().includes(q))
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
    </div>

    <div v-if="store.tournaments.length" class="t-list">
      <p v-if="!filtered.length" class="empty-text">{{ t("tournaments.noMatch", { query }) }}</p>
      <TransitionGroup name="list" tag="div" class="t-list-inner">
        <div
          v-for="(tour, i) in filtered"
          :key="tour.id"
          class="t-row"
          :style="{ '--i': i }"
          @click="router.push(`/tournaments/${tour.id}`)"
        >
          <div class="t-body">
            <div class="t-name-row">
              <span class="t-name">{{ tour.name }}</span>
              <span class="t-season-tag">S{{ tour.season }}</span>
            </div>
            <div class="t-meta-row">
              <span class="format-tag">{{ formatLabel(tour.format) }}</span>
              <span class="t-dot">{{ t("common.teams", { n: tour.teamIds.length }) }}</span>
            </div>
          </div>

          <div class="t-status">
            <span
              v-if="store.isTournamentFinished(tour.id)"
              class="winner-badge"
              :style="{ '--team-color': winnerColor(tour) }"
            >
              <Trophy :size="11" />
              <span class="winner-dot" />
              {{ winnerName(tour) }}
            </span>
            <span v-else class="status-live">{{ t("tournaments.live") }}</span>
          </div>

          <button class="danger sm icon-btn del-btn" @click.stop="deleteTournament(tour.id)">
            <X :size="13" />
          </button>
        </div>
      </TransitionGroup>
    </div>

    <p v-else-if="teamsStore.teams.length >= 2" class="empty-text">
      {{ t("tournaments.empty", { action: t("tournaments.newBtn") }) }}
    </p>
  </div>
</template>

<style scoped>
.t-row {
  cursor: pointer;
}

.t-name-row {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
}

.t-season-tag {
  font-size: 11px;
  color: var(--text-muted);
  background: var(--bg);
  border: 1px solid var(--border-light);
  border-radius: 4px;
  padding: 1px 5px;
  flex-shrink: 0;
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

.format-tag {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 10%, transparent);
  border-radius: 99px;
  padding: 2px 9px;
  flex-shrink: 0;
}

.del-btn {
  flex-shrink: 0;
}
</style>
