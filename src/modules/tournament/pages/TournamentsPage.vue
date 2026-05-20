<script setup lang="ts">
import { ref } from "vue"
import { useRouter } from "vue-router"
import { useTeamsStore } from "@/modules/teams/store"
import { useTournamentStore } from "@/modules/tournament/store"
import ManualDraw from "../components/ManualDraw.vue"
import GroupDraw from "../components/GroupDraw.vue"
import AppModal from "@/components/AppModal.vue"
import CreateTournamentModal from "../components/CreateTournamentModal.vue"
import type { Tournament } from "../types"

const router = useRouter()
const teamsStore = useTeamsStore()
const store = useTournamentStore()

function winnerName(t: Tournament) {
  return teamsStore.teams.find((tm) => tm.id === t.winnerId)?.name ?? "?"
}
function winnerColor(t: Tournament) {
  return teamsStore.teams.find((tm) => tm.id === t.winnerId)?.color ?? "#888"
}

// ─── Create modal ──────────────────────────────────────────────
const showCreateModal = ref(false)

// ─── Season modal ──────────────────────────────────────────────
const seasonModal = ref<Tournament | null>(null)
const showSeasonManual = ref(false)
const showSeasonGroupDraw = ref(false)

function doNewSeason(isSeeded: boolean, orderedIds?: string[]) {
  if (!seasonModal.value) return
  const id = store.newSeason(seasonModal.value.id, isSeeded, orderedIds)
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
    <div v-if="store.tournaments.length" class="section-box">
      <div class="t-list">
        <div v-for="t in store.tournaments" :key="t.id" class="t-row">
          <span class="t-name">{{ t.name }}</span>
          <span class="t-season">S{{ t.season }}</span>
          <span class="t-meta">{{ t.teamIds.length }} teams</span>
          <span class="t-format">{{ t.format === "group+bracket" ? "Groups+KO" : "Bracket" }}</span>
          <span v-if="t.winnerId" class="winner-tag" :style="{ '--team-color': winnerColor(t) }">
            🏆 {{ winnerName(t) }}
          </span>
          <span v-else class="t-meta">In progress</span>
          <div class="ml-auto flex">
            <button v-if="t.winnerId" class="primary sm" @click.stop="seasonModal = t">
              + Season
            </button>
            <button class="primary sm" @click.stop="router.push(`/tournaments/${t.id}`)">
              Open
            </button>
            <button class="danger sm" @click.stop="store.remove(t.id)">✕</button>
          </div>
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
          @confirm="(ids) => doNewSeason(false, ids)"
          @cancel="showSeasonManual = false"
        />
      </template>
      <template v-else-if="showSeasonGroupDraw">
        <GroupDraw
          :teams="teamsStore.teams.filter((t) => seasonModal!.teamIds.includes(t.id))"
          :group-count="seasonModal.groups?.length ?? 2"
          @confirm="(ids) => doNewSeason(false, ids)"
          @cancel="showSeasonGroupDraw = false"
        />
      </template>
      <template v-else>
        <p class="modal-desc">Choose draw type for Season {{ (seasonModal.season ?? 1) + 1 }}</p>
        <div class="modal-actions">
          <button class="primary" @click="doNewSeason(false)">Random draw</button>
          <button class="primary" @click="doNewSeason(true)">Seeded</button>
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
  font-weight: normal;
  font-family: var(--font);
}

.t-list {
  border-top: 1px solid var(--border-light);
}
.t-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-light);
}
.t-row:last-child {
  border-bottom: none;
}
.t-name {
  font-weight: 600;
}
.t-season {
  font-size: 11px;
  color: var(--text-muted);
  background: var(--bg);
  border: 1px solid var(--border-light);
  border-radius: 2px;
  padding: 1px 5px;
}
.t-format {
  font-size: 11px;
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent) 25%, transparent);
  border-radius: 2px;
  padding: 1px 5px;
}
.t-meta {
  font-size: 12px;
  color: var(--text-muted);
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
    row-gap: 4px;
  }
  .t-row .ml-auto {
    margin-left: 0;
    width: 100%;
  }
}
</style>
