<script setup lang="ts">
import { ref, computed } from "vue"
import { useRouter } from "vue-router"
import { useTeamsStore } from "@/modules/teams/store"
import { useTournamentStore } from "@/modules/tournament/store"
import ManualDraw from "../components/ManualDraw.vue"
import GroupDraw from "../components/GroupDraw.vue"
import AppModal from "@/components/AppModal.vue"
import CreateTournamentModal from "../components/CreateTournamentModal.vue"
import type { Tournament } from "../types"
import { Trophy, X, Search, ChevronRight } from "lucide-vue-next"

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

// ─── Create modal ──────────────────────────────────────────────
const showCreateModal = ref(false)

// ─── Season modal ──────────────────────────────────────────────
const seasonModal = ref<Tournament | null>(null)
const showSeasonManual = ref(false)
const showSeasonGroupDraw = ref(false)

function doNewSeason(isSeeded: boolean, orderedIds?: string[], isHaveThirdPlace?: boolean) {
  if (!seasonModal.value) return
  const id = store.newSeason(
    seasonModal.value.id,
    isSeeded,
    orderedIds,
    undefined,
    isHaveThirdPlace
  )
  seasonModal.value = null
  showSeasonManual.value = false
  showSeasonGroupDraw.value = false
  if (id) router.push(`/tournaments/${id}`)
}

function openSeasonManual() {
  if (seasonModal.value?.format === "group+bracket") {
    showSeasonGroupDraw.value = true
  } else {
    showSeasonManual.value = true
  }
}

function closeSeasonModal() {
  seasonModal.value = null
  showSeasonManual.value = false
  showSeasonGroupDraw.value = false
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
      <div v-for="t in filtered" :key="t.id" class="t-row">
        <div class="t-body">
          <div class="t-top">
            <span class="t-name">{{ t.name }}</span>
            <span
              v-if="store.isTournamentFinished(t.id)"
              class="winner-tag"
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
              {{ t.format === "group+bracket" ? "Groups+KO" : "Bracket" }}
            </span>
            <span class="t-dot">{{ t.teamIds.length }} teams</span>
          </div>
        </div>
        <div class="t-actions">
          <button v-if="store.isTournamentFinished(t.id)" class="sm" @click.stop="seasonModal = t">
            + Season
          </button>
          <button
            class="sm icon-btn"
            title="Open"
            @click.stop="router.push(`/tournaments/${t.id}`)"
          >
            <ChevronRight :size="14" />
          </button>
          <button
            class="danger sm icon-btn"
            @click.stop="confirm('Delete this tournament?') && store.remove(t.id)"
          >
            <X :size="13" />
          </button>
        </div>
      </div>
    </div>

    <p v-else-if="teamsStore.teams.length >= 2" class="empty-text">
      No tournaments yet. Click
      <strong>+ New Tournament</strong>
      to get started.
    </p>

    <!-- Create modal -->
    <CreateTournamentModal v-if="showCreateModal" @close="showCreateModal = false" />

    <!-- New Season modal -->
    <AppModal
      v-if="seasonModal"
      :title="`New Season — ${seasonModal.name}`"
      :width="showSeasonGroupDraw ? 'min(680px, calc(100vw - 32px))' : undefined"
      @close="closeSeasonModal"
    >
      <template v-if="showSeasonManual">
        <ManualDraw
          :teams="teamsStore.teams.filter((t) => seasonModal!.teamIds.includes(t.id))"
          @confirm="(ids) => doNewSeason(false, ids, seasonModal?.hasThirdPlace ?? false)"
          @cancel="showSeasonManual = false"
        />
      </template>
      <template v-else-if="showSeasonGroupDraw">
        <GroupDraw
          :teams="teamsStore.teams.filter((t) => seasonModal!.teamIds.includes(t.id))"
          :group-count="seasonModal.groups?.length ?? 2"
          @confirm="(ids) => doNewSeason(false, ids, seasonModal?.hasThirdPlace ?? false)"
          @cancel="showSeasonGroupDraw = false"
        />
      </template>
      <template v-else>
        <p class="modal-desc">Choose draw type for Season {{ (seasonModal.season ?? 1) + 1 }}</p>
        <div class="modal-actions">
          <button
            class="primary"
            @click="doNewSeason(false, undefined, seasonModal?.hasThirdPlace ?? false)"
          >
            Random draw
          </button>
          <button
            class="primary"
            @click="doNewSeason(true, undefined, seasonModal?.hasThirdPlace ?? false)"
          >
            Seeded
          </button>
          <button class="primary" @click="openSeasonManual">Manual</button>
          <button @click="closeSeasonModal">Cancel</button>
        </div>
      </template>
    </AppModal>
  </div>
</template>

<style scoped>
.page-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.search-row {
  margin-bottom: 10px;
}
.search-wrap {
  position: relative;
  display: flex;
  align-items: center;
}
.search-icon {
  position: absolute;
  left: 10px;
  color: var(--text-muted);
  pointer-events: none;
}
.search-input {
  width: 100%;
  padding-left: 32px;
}

.t-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.t-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-radius: 8px;
  min-width: 0;
  transition: border-color 0.12s;
}

.t-body {
  display: flex;
  flex-direction: column;
  gap: 5px;
  flex: 1;
  min-width: 0;
}

.t-top {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.t-name {
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.t-meta-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.t-badge {
  font-size: 11px;
  color: var(--text-muted);
  background: var(--bg);
  border: 1px solid var(--border-light);
  border-radius: 4px;
  padding: 1px 6px;
  line-height: 1.6;
}
.t-badge.accent {
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 10%, transparent);
  border-color: color-mix(in srgb, var(--accent) 25%, transparent);
}
.t-dot {
  font-size: 11px;
  color: var(--text-muted);
}
.t-dot::before {
  content: "·";
  margin-right: 6px;
  opacity: 0.5;
}

.winner-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text);
  background: var(--bg);
  border: 1px solid var(--border-light);
  border-radius: 4px;
  padding: 2px 7px 2px 5px;
  line-height: 1.6;
  flex-shrink: 0;
}
.winner-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--team-color, #888);
  flex-shrink: 0;
}

.status-live {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #22c55e;
  background: color-mix(in srgb, #22c55e 12%, transparent);
  border: 1px solid color-mix(in srgb, #22c55e 30%, transparent);
  border-radius: 4px;
  padding: 1px 6px;
  line-height: 1.6;
  flex-shrink: 0;
}

.t-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
.icon-btn {
  width: 28px;
  height: 28px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.notice {
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 16px;
}

.empty-text {
  color: var(--text-muted);
  font-size: 13px;
}

@media (max-width: 600px) {
  .t-row {
    flex-wrap: wrap;
    row-gap: 8px;
    padding: 10px 12px;
  }
  .t-body {
    flex: 1 1 100%;
  }
  .t-actions {
    flex: 1 1 100%;
  }
}
</style>
