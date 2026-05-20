<script setup lang="ts">
import { ref, computed } from "vue"
import { useCreateTournament } from "../composables/useCreateTournament"
import ManualDraw from "../components/ManualDraw.vue"
import GroupDraw from "../components/GroupDraw.vue"
import AppModal from "@/components/AppModal.vue"
import BtnGroup from "@/components/BtnGroup.vue"
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

const drawOptions = [
  { value: "random", label: "Random" },
  { value: "seeded", label: "Seeded" },
  { value: "manual", label: "Manual" },
]

// ─── Format modal ──────────────────────────────────────────────
type TournamentFormat = "bracket" | "group+bracket"
const showFormatModal = ref(false)
const chosenFormat = ref<TournamentFormat>("bracket")
const groupCount = ref(4)
const showManualDraw = ref(false)
const showGroupDraw = ref(false)

const minGroups = computed(() => 2)
const maxGroups = computed(() => Math.floor(selected.value.length / 2))

function openFormatModal() {
  if (!newName.value.trim() || selected.value.length < 2) return
  chosenFormat.value = "bracket"
  groupCount.value = Math.min(4, maxGroups.value)
  showFormatModal.value = true
}

function proceedFromFormat() {
  showFormatModal.value = false
  if (drawType.value === "manual") {
    if (chosenFormat.value === "group+bracket") {
      showGroupDraw.value = true
    } else {
      showManualDraw.value = true
    }
  } else {
    doCreate(undefined, chosenFormat.value === "group+bracket" ? groupCount.value : undefined)
  }
}

function handleManualConfirm(orderedIds: string[]) {
  showManualDraw.value = false
  doCreate(orderedIds, undefined)
}

function handleGroupDrawConfirm(orderedIds: string[]) {
  showGroupDraw.value = false
  doCreate(orderedIds, groupCount.value)
}

function cancelManualDraw() {
  showManualDraw.value = false
  showGroupDraw.value = false
}
function closeFormatModal() {
  showFormatModal.value = false
}

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
              @keyup.enter="openFormatModal"
            />
            <BtnGroup v-model="drawType" :options="drawOptions" />
            <button
              class="primary"
              :disabled="!newName.trim() || selected.length < 2"
              @click="openFormatModal"
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

    <p v-else-if="teamsStore.teams.length >= 2" class="empty-text">No tournaments yet.</p>

    <!-- ─── Format selection modal ─────────────────────────────── -->
    <AppModal
      v-if="showFormatModal"
      :title="`Tournament Format — ${newName}`"
      width="420px"
      @close="closeFormatModal"
    >
      <p class="modal-desc">Choose the format for this tournament</p>

      <div class="format-cards">
        <button
          class="format-card"
          :class="{ 'format-card--active': chosenFormat === 'bracket' }"
          @click="chosenFormat = 'bracket'"
        >
          <span class="format-icon">🏆</span>
          <span class="format-title">Knockout Bracket</span>
          <span class="format-desc">Single-elimination bracket only</span>
        </button>

        <button
          class="format-card"
          :class="{ 'format-card--active': chosenFormat === 'group+bracket' }"
          :disabled="selected.length < 4"
          @click="chosenFormat = 'group+bracket'"
        >
          <span class="format-icon">⚽</span>
          <span class="format-title">Groups + Knockout</span>
          <span class="format-desc">Group stage → top 2 advance to knockout</span>
        </button>
      </div>

      <div v-if="chosenFormat === 'group+bracket'" class="group-count-row">
        <label class="gc-label">Number of groups</label>
        <div class="gc-stepper">
          <button
            class="gc-btn"
            :disabled="groupCount <= minGroups"
            @click="groupCount = Math.max(minGroups, groupCount - 1)"
          >
            −
          </button>
          <span class="gc-val">{{ groupCount }}</span>
          <button
            class="gc-btn"
            :disabled="groupCount >= maxGroups"
            @click="groupCount = Math.min(maxGroups, groupCount + 1)"
          >
            +
          </button>
        </div>
        <span class="gc-hint">
          {{ Math.ceil(selected.length / groupCount) }}–{{
            Math.ceil(selected.length / groupCount)
          }}
          teams/group · {{ groupCount * 2 }} qualifiers
        </span>
      </div>

      <div class="modal-actions">
        <button class="primary" @click="proceedFromFormat">Confirm</button>
        <button @click="closeFormatModal">Cancel</button>
      </div>
    </AppModal>

    <!-- Manual Draw modal (bracket only) -->
    <AppModal
      v-if="showManualDraw"
      :title="`Manual Draw — ${newName || 'New Tournament'}`"
      @close="cancelManualDraw"
    >
      <ManualDraw
        :teams="selectedTeams"
        @confirm="handleManualConfirm"
        @cancel="cancelManualDraw"
      />
    </AppModal>

    <!-- Group Draw modal (group+bracket create) -->
    <AppModal
      v-if="showGroupDraw"
      :title="`Group Draw — ${newName || 'New Tournament'}`"
      width="min(680px, calc(100vw - 32px))"
      @close="cancelManualDraw"
    >
      <GroupDraw
        :teams="selectedTeams"
        :group-count="groupCount"
        @confirm="handleGroupDrawConfirm"
        @cancel="cancelManualDraw"
      />
    </AppModal>

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

/* Team chips */
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

/* Format modal */
.format-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 14px;
}
.format-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 14px 10px;
  border: 2px solid var(--border-light);
  background: var(--bg);
  cursor: pointer;
  text-align: center;
  border-radius: var(--radius);
  transition:
    border-color 0.15s,
    background 0.15s;
}
.format-card:hover:not(:disabled) {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 6%, var(--bg));
}
.format-card--active {
  border-color: var(--accent) !important;
  background: color-mix(in srgb, var(--accent) 10%, var(--bg)) !important;
}
.format-card:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.format-icon {
  font-size: 24px;
}
.format-title {
  font-size: 13px;
  font-weight: 600;
}
.format-desc {
  font-size: 11px;
  color: var(--text-muted);
}

/* Group count */
.group-count-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
  border-top: 1px solid var(--border-light);
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.gc-label {
  font-size: 13px;
  color: var(--text-muted);
}
.gc-stepper {
  display: flex;
  align-items: center;
  gap: 8px;
}
.gc-btn {
  width: 28px;
  height: 28px;
  padding: 0;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.gc-val {
  font-size: 18px;
  font-weight: 700;
  min-width: 24px;
  text-align: center;
}
.gc-hint {
  font-size: 11px;
  color: var(--text-muted);
}

@media (max-width: 600px) {
  .form-row {
    flex-direction: column;
    align-items: stretch;
  }
  .name-input {
    width: 100%;
  }
  .t-row {
    flex-wrap: wrap;
    row-gap: 4px;
  }
  .t-row .ml-auto {
    margin-left: 0;
    width: 100%;
  }
  .format-cards {
    grid-template-columns: 1fr;
  }
}
</style>
