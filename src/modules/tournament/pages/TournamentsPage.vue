<script setup lang="ts">
import { useCreateTournament } from "../composables/useCreateTournament"

const {
  router,
  teamsStore,
  store,
  newName,
  selected,
  allSelected,
  toggleAll,
  createTournament,
  winnerName,
  winnerColor,
} = useCreateTournament()
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
          <div class="flex" style="margin-bottom: 10px">
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
          <span class="t-name">{{ t.name }}</span>
          <span class="t-meta">{{ t.teamIds.length }} teams</span>
          <span v-if="t.winnerId" class="tag" :style="{ background: winnerColor(t) }">
            🏆 {{ winnerName(t) }}
          </span>
          <span v-else class="t-meta">In progress</span>
          <div class="ml-auto flex">
            <button
              class="primary ml-auto"
              style="font-size: 11px; padding: 1px 6px"
              @click.stop="router.push(`/tournaments/${t.id}`)"
            >
              Detail
            </button>
            <button
              class="danger ml-auto"
              style="font-size: 11px; padding: 1px 6px"
              @click.stop="store.remove(t.id)"
            >
              Delete
            </button>
          </div>
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
  gap: 10px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-light);
}
.t-row:last-child {
  border-bottom: none;
}
.t-name {
  font-weight: 600;
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
</style>
