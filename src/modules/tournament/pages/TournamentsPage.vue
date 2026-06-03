<script setup lang="ts">
import { ref, computed } from "vue"
import { useRouter } from "vue-router"
import { useTeamsStore } from "@/modules/teams/store"
import { useTournamentStore } from "@/modules/tournament/store"
import type { Tournament } from "../types"
import { Trophy, X, Search, ChevronRight } from "@lucide/vue"
import { showConfirm } from "@/composables/useDialog"
import { useI18n } from "vue-i18n"

const { t } = useI18n()
const router = useRouter()
const teamsStore = useTeamsStore()
const store = useTournamentStore()

function winnerName(t: Tournament) {
  return teamsStore.teams.find((tm) => tm.id === t.winnerId)?.name ?? "?"
}
function winnerColor(t: Tournament) {
  return teamsStore.teams.find((tm) => tm.id === t.winnerId)?.color ?? "#888"
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
    <!-- Header row -->
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

    <!-- Tournament list -->
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
        <div v-for="(tour, i) in filtered" :key="tour.id" class="t-row" :style="{ '--i': i }">
          <div class="t-body">
            <div class="t-top">
              <span class="t-name">{{ tour.name }}</span>
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
            <div class="t-meta-row">
              <span class="t-badge">S{{ tour.season }}</span>
              <span class="t-badge accent">{{ formatLabel(tour.format) }}</span>
              <span class="t-dot">{{ t("common.teams", { n: tour.teamIds.length }) }}</span>
            </div>
          </div>
          <div class="t-actions">
            <button
              class="sm icon-btn"
              :title="t('common.open')"
              @click.stop="router.push(`/tournaments/${tour.id}`)"
            >
              <ChevronRight :size="14" />
            </button>
            <button class="danger sm icon-btn" @click.stop="deleteTournament(tour.id)">
              <X :size="13" />
            </button>
          </div>
        </div>
      </TransitionGroup>
    </div>

    <p v-else-if="teamsStore.teams.length >= 2" class="empty-text">
      {{ t("tournaments.empty", { action: t("tournaments.newBtn") }) }}
    </p>
  </div>
</template>
