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
        <template v-else>
          <div class="form-row">
            <input
              v-model="newName"
              placeholder="Tournament name"
              class="name-input"
              @keyup.enter="handleCreate"
            />
            <div class="draw-group">
              <button
                type="button"
                class="draw-btn"
                :class="{ active: drawType === 'random' }"
                @click="drawType = 'random'"
              >
                Random
              </button>
              <button
                type="button"
                class="draw-btn"
                :class="{ active: drawType === 'seeded' }"
                @click="drawType = 'seeded'"
              >
                Seeded
              </button>
              <button
                type="button"
                class="draw-btn"
                :class="{ active: drawType === 'manual' }"
                @click="drawType = 'manual'"
              >
                Manual
              </button>
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
            <label class="team-chip chip-all" :class="{ 'chip-selected': allSelected }">
              <input
                type="checkbox"
                :checked="allSelected"
                class="chip-check"
                @change="toggleAll"
              />
              All
            </label>
            <label
              v-for="team in teamsStore.teams"
              :key="team.id"
              class="team-chip"
              :class="{ 'chip-selected': selected.includes(team.id) }"
            >
              <input v-model="selected" type="checkbox" :value="team.id" class="chip-check" />
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

    <!-- Manual Draw modal -->
    <div v-if="showManualDraw" class="modal-backdrop" @click.self="cancelManualDraw">
      <div class="modal">
        <div class="modal-header">Manual Draw — {{ newName || "New Tournament" }}</div>
        <div class="modal-body">
          <ManualDraw
            :teams="selectedTeams"
            @confirm="handleManualConfirm"
            @cancel="cancelManualDraw"
          />
        </div>
      </div>
    </div>

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
.count-badge {
  display: inline-block;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 10px;
  padding: 0 6px;
  font-size: 11px;
  margin-left: 2px;
}

/* Draw type segmented control */
.draw-group {
  display: flex;
}
.draw-btn {
  border-radius: 0;
  font-size: 12px;
  padding: 4px 10px;
  border-right-width: 0;
  transition:
    background 0.1s,
    color 0.1s;
}
.draw-btn:first-child {
  border-radius: var(--radius) 0 0 var(--radius);
}
.draw-btn:last-child {
  border-radius: 0 var(--radius) var(--radius) 0;
  border-right-width: 1px;
}
.draw-btn.active {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent-hover);
  z-index: 1;
}
.draw-btn:hover:not(.active) {
  background: var(--border-light);
}

/* Team selection */
.chip-check {
  display: none;
}
.team-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  max-height: 140px;
  overflow-y: auto;
  padding: 2px 0;
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
  transition:
    border-color 0.1s,
    background 0.1s,
    color 0.1s;
}
.team-chip:hover {
  background: var(--bg);
}
.team-chip.chip-selected {
  background: color-mix(in srgb, var(--accent) 12%, var(--surface));
  border-color: var(--accent);
  color: var(--accent);
}
.team-chip.chip-selected .power {
  color: var(--accent);
  opacity: 0.65;
}
.chip-all {
  color: var(--text-muted);
  font-style: italic;
}
.chip-all.chip-selected {
  font-style: normal;
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
  width: 420px;
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

@media (max-width: 600px) {
  .form-row {
    flex-direction: column;
    align-items: stretch;
  }
  .name-input {
    width: 100%;
  }
  .draw-group {
    align-self: flex-start;
  }

  .t-row {
    flex-wrap: wrap;
    row-gap: 4px;
  }
  .t-row .ml-auto {
    margin-left: 0;
    width: 100%;
  }

  .modal {
    width: calc(100vw - 32px);
  }
}
</style>
