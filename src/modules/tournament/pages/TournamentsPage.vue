<template>
  <div class="page">
    <!-- Create new tournament -->
    <div class="section-box">
      <h2>New Tournament</h2>
      <div class="section-body">
        <div v-if="teamsStore.teams.length < 2" class="notice">
          Add at least 2 teams on the Teams tab first.
        </div>
        <template v-else>
          <div class="flex" style="margin-bottom: 10px">
            <input v-model="newName" placeholder="Tournament name" style="width: 200px" />
            <button
              class="primary"
              :disabled="!newName.trim() || selected.length < 2"
              @click="createTournament"
            >
              Create ({{ selected.length }} teams)
            </button>
          </div>
          <div class="flex-wrap">
            <label v-for="team in teamsStore.teams" :key="team.id" class="team-check">
              <input v-model="selected" type="checkbox" :value="team.id" />
              <span class="dot" :style="{ background: team.color }"></span>
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

    <!-- Tournament list -->
    <div v-if="store.tournaments.length" class="section-box">
      <h2>Tournaments</h2>
      <div class="section-body" style="padding: 0">
        <div
          v-for="t in store.tournaments"
          :key="t.id"
          class="t-row"
          :class="{ active: store.active === t.id }"
          @click="store.active = t.id"
        >
          <span class="t-name">{{ t.name }}</span>
          <span class="t-meta">{{ t.teamIds.length }} teams</span>
          <span v-if="t.winnerId" class="tag" :style="{ background: winnerColor(t) }">
            🏆 {{ winnerName(t) }}
          </span>
          <span v-else class="t-meta">In progress</span>
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

    <!-- Active bracket view -->
    <div v-if="activeTournament" class="section-box">
      <h2>{{ activeTournament.name }} — Bracket</h2>
      <div class="section-body" style="padding: 8px 0">
        <div class="flex" style="margin-bottom: 10px; padding: 0 8px">
          <button @click="store.simulateAll(activeTournament.id)">🎲 Simulate All</button>
          <template v-for="(round, ri) in activeTournament.rounds" :key="ri">
            <button @click="store.simulateRound(activeTournament.id, ri)">
              Sim {{ round.name }}
            </button>
          </template>
        </div>
        <div
          v-if="activeTournament.winnerId"
          class="notice"
          style="margin: 0 8px 10px; background: #f0f9f0; border-color: #00af89; color: #005a46"
        >
          🏆 Winner:
          <strong>{{ winnerName(activeTournament) }}</strong>
        </div>
        <Bracket
          :tournament="activeTournament"
          :teams="allTeams"
          @set-result="(ri, mi, h, a) => store.setResult(activeTournament!.id, ri, mi, h, a)"
          @sim-match="(ri, mi) => simMatch(activeTournament!.id, ri, mi)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue"
import { useTeamsStore } from "@/modules/teams/store"
import { useTournamentStore } from "../store"
import { simulateMatch } from "@/engine/logic"
import Bracket from "../components/Bracket.vue"
import type { Tournament } from "../types"

const teamsStore = useTeamsStore()
const store = useTournamentStore()
const allTeams = computed(() => teamsStore.teams)

const newName = ref("")
const selected = ref<string[]>([])

function createTournament() {
  if (!newName.value.trim() || selected.value.length < 2) return
  store.create(newName.value.trim(), selected.value)
  newName.value = ""
  selected.value = []
}

const activeTournament = computed(() => (store.active ? store.getById(store.active) : null))

function winnerName(t: Tournament) {
  return allTeams.value.find((tm) => tm.id === t.winnerId)?.name ?? "?"
}
function winnerColor(t: Tournament) {
  return allTeams.value.find((tm) => tm.id === t.winnerId)?.color ?? "#888"
}

function simMatch(tournamentId: string, ri: number, mi: number) {
  const t = store.getById(tournamentId)
  if (!t) return
  const match = t.rounds[ri].matches[mi]
  if (!match.homeId || !match.awayId) return
  const result = simulateMatch(match, allTeams.value)
  store.setResult(tournamentId, ri, mi, result.home, result.away)
}
</script>

<style scoped>
.t-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-light);
  cursor: pointer;
}
.t-row:last-child {
  border-bottom: none;
}
.t-row:hover,
.t-row.active {
  background: #f0f4ff;
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
.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
</style>
