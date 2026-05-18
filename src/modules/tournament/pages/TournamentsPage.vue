<script setup lang="ts">
import { ref } from "vue"
import { useCreateTournament } from "../composables/useCreateTournament"
import type { Tournament } from "../types"

const {
  router,
  teamsStore,
  store,
  newName,
  selected,
  seeded,
  allSelected,
  toggleAll,
  createTournament,
  winnerName,
  winnerColor,
} = useCreateTournament()

const editingId = ref<string | null>(null)
const editName = ref("")
const pendingSeasonId = ref<string | null>(null)

function startEdit(t: Tournament) {
  editingId.value = t.id
  editName.value = t.name
}

function saveEdit(id: string) {
  store.rename(id, editName.value)
  editingId.value = null
}

function doNewSeason(t: Tournament, isSeeded: boolean) {
  pendingSeasonId.value = null
  const id = store.newSeason(t.id, isSeeded)
  if (id) router.push(`/tournaments/${id}`)
}
</script>

<template>
  <div class="page">
    <div class="section-box">
      <h2>New Tournament</h2>
      <div class="section-body">
        <div v-if="teamsStore.teams.length < 2" class="notice">
          Add at least 2 teams on the Teams tab first.
        </div>
        <template v-else>
          <div class="flex" style="margin-bottom: 8px">
            <input
              v-model="newName"
              placeholder="Tournament name"
              style="width: 200px"
              @keyup.enter="createTournament"
            />
            <button
              class="primary"
              :disabled="!newName.trim() || selected.length < 2"
              @click="createTournament"
            >
              Create ({{ selected.length }} teams)
            </button>
          </div>
          <div class="flex" style="margin-bottom: 10px; gap: 12px">
            <label class="radio-opt">
              <input v-model="seeded" type="radio" :value="false" />
              Random draw
            </label>
            <label class="radio-opt">
              <input v-model="seeded" type="radio" :value="true" />
              Seeded (strong–weak)
            </label>
          </div>
          <div class="flex-wrap">
            <label class="team-check select-all">
              <input type="checkbox" :checked="allSelected" @change="toggleAll" />
              <span>All</span>
            </label>
            <label v-for="team in teamsStore.teams" :key="team.id" class="team-check">
              <input v-model="selected" type="checkbox" :value="team.id" />
              <span class="dot" :style="{ background: team.color }" />
              {{ team.name }}
              <span style="color: var(--text-muted)">({{ team.power }})</span>
            </label>
          </div>
          <p
            v-if="selected.length === 1"
            style="color: var(--danger); font-size: 12px; margin-top: 6px"
          >
            Select at least 2 teams.
          </p>
        </template>
      </div>
    </div>

    <div v-if="store.tournaments.length" class="section-box">
      <h2>Tournaments</h2>
      <div class="section-body" style="padding: 0">
        <div v-for="t in store.tournaments" :key="t.id" class="t-row">
          <!-- Rename mode -->
          <template v-if="editingId === t.id">
            <input
              v-model="editName"
              style="width: 160px"
              @keyup.enter="saveEdit(t.id)"
              @keyup.escape="editingId = null"
            />
            <button
              class="primary"
              style="font-size: 11px; padding: 1px 8px"
              @click="saveEdit(t.id)"
            >
              Save
            </button>
            <button style="font-size: 11px; padding: 1px 8px" @click="editingId = null">
              Cancel
            </button>
          </template>
          <!-- New Season seeding choice -->
          <template v-else-if="pendingSeasonId === t.id">
            <span class="t-name">{{ t.name }}</span>
            <span class="t-season">S{{ t.season }}</span>
            <span class="t-meta" style="margin-left: auto">Draw:</span>
            <button style="font-size: 11px; padding: 1px 8px" @click="doNewSeason(t, false)">
              Random
            </button>
            <button style="font-size: 11px; padding: 1px 8px" @click="doNewSeason(t, true)">
              Seeded
            </button>
            <button style="font-size: 11px; padding: 1px 8px" @click="pendingSeasonId = null">
              Cancel
            </button>
          </template>
          <!-- Normal row -->
          <template v-else>
            <span class="t-name">{{ t.name }}</span>
            <span class="t-season">S{{ t.season }}</span>
            <span class="t-meta">{{ t.teamIds.length }} teams</span>
            <span v-if="t.winnerId" class="tag" :style="{ background: winnerColor(t) }">
              🏆 {{ winnerName(t) }}
            </span>
            <span v-else class="t-meta">In progress</span>
            <div class="ml-auto flex">
              <button style="font-size: 11px; padding: 1px 8px" @click.stop="startEdit(t)">
                Edit
              </button>
              <button
                v-if="t.winnerId"
                class="primary"
                style="font-size: 11px; padding: 1px 8px"
                @click.stop="pendingSeasonId = t.id"
              >
                New Season
              </button>
              <button
                class="primary"
                style="font-size: 11px; padding: 1px 8px"
                @click.stop="router.push(`/tournaments/${t.id}`)"
              >
                Detail
              </button>
              <button
                class="danger"
                style="font-size: 11px; padding: 1px 8px"
                @click.stop="store.remove(t.id)"
              >
                Delete
              </button>
            </div>
          </template>
        </div>
      </div>
    </div>

    <p
      v-else-if="teamsStore.teams.length >= 2"
      style="color: var(--text-muted); margin-top: 8px; font-size: 13px"
    >
      No tournaments yet.
    </p>
  </div>
</template>

<style scoped>
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
.team-check {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  cursor: pointer;
  padding: 3px 8px;
  border: 1px solid var(--border-light);
  background: var(--surface);
  border-radius: 2px;
}
.team-check:hover {
  background: var(--bg);
}
.select-all {
  font-style: italic;
}
.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
.radio-opt {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  cursor: pointer;
}
</style>
