<script setup lang="ts">
import { ref } from "vue"
import { useCreateTournament } from "../composables/useCreateTournament"
import ManualDraw from "../components/ManualDraw.vue"
import type { Tournament } from "../types"

const {
  router,
  teamsStore,
  store,
  newName,
  selected,
  selectedTeams,
  drawType,
  allSelected,
  toggleAll,
  doCreate,
  winnerName,
  winnerColor,
} = useCreateTournament()

const showManualDraw = ref(false)
const seasonModal = ref<Tournament | null>(null)
const showSeasonManual = ref(false)

function handleCreate() {
  if (drawType.value === "manual") {
    showManualDraw.value = true
  } else {
    doCreate()
  }
}

function handleManualConfirm(orderedIds: string[]) {
  showManualDraw.value = false
  doCreate(orderedIds)
}

function cancelManualDraw() {
  showManualDraw.value = false
}

function doNewSeason(isSeeded: boolean, orderedIds?: string[]) {
  if (!seasonModal.value) return
  const id = store.newSeason(seasonModal.value.id, isSeeded, orderedIds)
  seasonModal.value = null
  showSeasonManual.value = false
  if (id) router.push(`/tournaments/${id}`)
}

function closeSeasonModal() {
  seasonModal.value = null
  showSeasonManual.value = false
}
</script>

<template>
  <div class="page">
    <!-- New Tournament -->
    <div class="section-box">
      <h2>New Tournament</h2>
      <div class="section-body">
        <div v-if="teamsStore.teams.length < 2" class="notice">
          Add at least 2 teams on the Teams tab first.
        </div>
        <template v-else-if="showManualDraw">
          <ManualDraw
            :teams="selectedTeams"
            @confirm="handleManualConfirm"
            @cancel="cancelManualDraw"
          />
        </template>
        <template v-else>
          <div class="form-row">
            <input
              v-model="newName"
              placeholder="Tournament name"
              class="name-input"
              @keyup.enter="handleCreate"
            />
            <div class="radio-row">
              <label class="radio-opt">
                <input v-model="drawType" type="radio" value="random" />
                Random draw
              </label>
              <label class="radio-opt">
                <input v-model="drawType" type="radio" value="seeded" />
                Seeded
              </label>
              <label class="radio-opt">
                <input v-model="drawType" type="radio" value="manual" />
                Manual
              </label>
            </div>
            <button
              class="primary"
              :disabled="!newName.trim() || selected.length < 2"
              @click="handleCreate"
            >
              Create
              <span class="count-badge">{{ selected.length }}</span>
            </button>
          </div>

          <div class="team-grid">
            <label class="team-chip chip-all">
              <input type="checkbox" :checked="allSelected" @change="toggleAll" />
              All
            </label>
            <label v-for="team in teamsStore.teams" :key="team.id" class="team-chip">
              <input v-model="selected" type="checkbox" :value="team.id" />
              <span class="dot" :style="{ background: team.color }" />
              {{ team.name }}
              <span class="power">{{ team.power }}</span>
            </label>
          </div>

          <p v-if="selected.length === 1" class="warn-text">Select at least 2 teams.</p>
        </template>
      </div>
    </div>

    <!-- Tournament list -->
    <div v-if="store.tournaments.length" class="section-box">
      <h2>Tournaments</h2>
      <div class="t-list">
        <div v-for="t in store.tournaments" :key="t.id" class="t-row">
          <span class="t-name">{{ t.name }}</span>
          <span class="t-season">S{{ t.season }}</span>
          <span class="t-meta">{{ t.teamIds.length }} teams</span>
          <span v-if="t.winnerId" class="tag" :style="{ background: winnerColor(t) }">
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

    <p v-else-if="teamsStore.teams.length >= 2" class="empty-text">No tournaments yet.</p>

    <!-- New Season modal -->
    <div v-if="seasonModal" class="modal-backdrop" @click.self="closeSeasonModal">
      <div class="modal">
        <div class="modal-header">New Season — {{ seasonModal.name }}</div>
        <div class="modal-body">
          <template v-if="showSeasonManual">
            <ManualDraw
              :teams="teamsStore.teams.filter((t) => seasonModal!.teamIds.includes(t.id))"
              @confirm="(ids) => doNewSeason(false, ids)"
              @cancel="showSeasonManual = false"
            />
          </template>
          <template v-else>
            <p class="modal-desc">
              Choose draw type for Season {{ (seasonModal.season ?? 1) + 1 }}
            </p>
            <div class="modal-actions">
              <button class="primary" @click="doNewSeason(false)">Random draw</button>
              <button class="primary" @click="doNewSeason(true)">Seeded</button>
              <button class="primary" @click="showSeasonManual = true">Manual</button>
              <button @click="closeSeasonModal">Cancel</button>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Form row */
.form-row {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 10px;
}
.name-input {
  width: 200px;
}
.radio-row {
  display: flex;
  gap: 12px;
}
.radio-opt {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  cursor: pointer;
}
.count-badge {
  display: inline-block;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 10px;
  padding: 0 6px;
  font-size: 11px;
  margin-left: 2px;
}

/* Team selection */
.team-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.team-chip {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  cursor: pointer;
  padding: 3px 8px;
  border: 1px solid var(--border-light);
  background: var(--surface);
  border-radius: 2px;
  user-select: none;
}
.team-chip:hover {
  background: var(--bg);
}
.chip-all {
  color: var(--text-muted);
  font-style: italic;
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.power {
  color: var(--text-muted);
  font-size: 11px;
}
.warn-text {
  color: var(--danger);
  font-size: 12px;
  margin-top: 6px;
}
.empty-text {
  color: var(--text-muted);
  margin-top: 8px;
  font-size: 13px;
}

/* Tournament list */
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
.t-meta {
  font-size: 12px;
  color: var(--text-muted);
}

/* Small button variant */
.sm {
  font-size: 12px;
  padding: 2px 8px;
}

/* Modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(32, 33, 34, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}
.modal {
  background: var(--surface);
  border: 1px solid var(--border);
  width: 360px;
}
.modal-header {
  font-family: var(--font);
  font-size: 16px;
  border-bottom: 1px solid var(--border-light);
  padding: 10px 14px;
  background: var(--bg);
}
.modal-body {
  padding: 14px;
}
.modal-desc {
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 12px;
}
.modal-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
</style>
