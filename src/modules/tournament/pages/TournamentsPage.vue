<script setup lang="ts">
import { ref, computed } from "vue"
import { useRouter } from "vue-router"
import { useTeamsStore } from "@/modules/teams/store"
import { useTournamentStore } from "@/modules/tournament/store"
import CreateTournamentModal from "../components/CreateTournamentModal.vue"
import type { Tournament } from "../types"
import { Trophy, X, Search, ChevronRight } from "lucide-vue-next"
import { showConfirm } from "@/composables/useDialog"

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

const showCreateModal = ref(false)

async function deleteTournament(id: string) {
  if (await showConfirm("Delete this tournament?", { confirmLabel: "Delete", dangerous: true }))
    store.remove(id)
}
</script>

<template>
  <div class="page">
    <!-- Header row -->
    <div class="page-top">
      <h2 class="page-title">Tournaments</h2>
      <button
        class="primary"
        :disabled="teamsStore.teams.length < 2"
        :title="teamsStore.teams.length < 2 ? 'Add at least 2 teams first' : ''"
        @click="showCreateModal = true"
      >
        + New Tournament
      </button>
    </div>

    <div v-if="teamsStore.teams.length < 2" class="notice">
      Add at least 2 teams on the Teams tab first.
    </div>

    <!-- Tournament list -->
    <div v-if="store.tournaments.length" class="search-row">
      <div class="search-wrap">
        <Search :size="14" class="search-icon" />
        <input v-model="query" class="search-input" placeholder="Search tournaments…" />
      </div>
    </div>

    <div v-if="store.tournaments.length" class="t-list">
      <p v-if="!filtered.length" class="empty-text">No tournaments match "{{ query }}".</p>
      <TransitionGroup name="list" tag="div" class="t-list-inner">
        <div v-for="(t, i) in filtered" :key="t.id" class="t-row" :style="{ '--i': i }">
          <div class="t-body">
            <div class="t-top">
              <span class="t-name">{{ t.name }}</span>
              <span
                v-if="store.isTournamentFinished(t.id)"
                class="winner-badge"
                :style="{ '--team-color': winnerColor(t) }"
              >
                <Trophy :size="11" />
                <span class="winner-dot" />
                {{ winnerName(t) }}
              </span>
              <span v-else class="status-live">Live</span>
            </div>
            <div class="t-meta-row">
              <span class="t-badge">S{{ t.season }}</span>
              <span class="t-badge accent">
                {{
                  t.format === "group+bracket"
                    ? "Groups+KO"
                    : t.format === "league"
                      ? "League"
                      : "Bracket"
                }}
              </span>
              <span class="t-dot">{{ t.teamIds.length }} teams</span>
            </div>
          </div>
          <div class="t-actions">
            <button
              class="sm icon-btn"
              title="Open"
              @click.stop="router.push(`/tournaments/${t.id}`)"
            >
              <ChevronRight :size="14" />
            </button>
            <button class="danger sm icon-btn" @click.stop="deleteTournament(t.id)">
              <X :size="13" />
            </button>
          </div>
        </div>
      </TransitionGroup>
    </div>

    <p v-else-if="teamsStore.teams.length >= 2" class="empty-text">
      No tournaments yet. Click
      <strong>+ New Tournament</strong>
      to get started.
    </p>

    <!-- Create modal -->
    <CreateTournamentModal v-if="showCreateModal" @close="showCreateModal = false" />
  </div>
</template>
