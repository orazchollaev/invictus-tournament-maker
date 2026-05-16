<template>
  <div class="page">
    <div v-if="!tournament">
      <p style="color: var(--text-muted)">
        Tournament not found.
        <RouterLink to="/tournaments">← Back</RouterLink>
      </p>
    </div>
    <template v-else>
      <!-- Header -->
      <div class="t-header">
        <RouterLink to="/tournaments" class="back">← Tournaments</RouterLink>
        <h1>{{ tournament.name }}</h1>
        <span class="t-meta">{{ tournament.teamIds.length }} teams · Created {{ dateStr }}</span>
      </div>

      <!-- Winner banner -->
      <div
        v-if="tournament.winnerId"
        class="winner-banner"
        :style="{ borderColor: winnerTeam?.color }"
      >
        🏆
        <strong>{{ winnerTeam?.name }}</strong>
        wins the tournament!
      </div>

      <!-- Bracket section -->
      <div class="section-box">
        <h2>Bracket</h2>
        <div class="section-body" style="padding: 8px 0">
          <div class="flex" style="padding: 0 8px; margin-bottom: 10px; flex-wrap: wrap; gap: 6px">
            <button @click="store.simulateAll(tournament.id)">🎲 Simulate All</button>
            <button
              v-for="(round, ri) in tournament.rounds"
              :key="ri"
              @click="store.simulateRound(tournament.id, ri)"
            >
              Sim {{ round.name }}
            </button>
          </div>
          <Bracket
            :tournament="tournament"
            :teams="allTeams"
            @set-result="(ri, mi, h, a) => store.setResult(tournament!.id, ri, mi, h, a)"
            @sim-match="(ri, mi) => simMatch(ri, mi)"
          />
        </div>
      </div>

      <!-- Teams in this tournament -->
      <div class="section-box">
        <h2>Participants</h2>
        <div class="section-body" style="padding: 0">
          <table>
            <thead>
              <tr>
                <th>Team</th>
                <th>Power</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="team in participantTeams" :key="team.id">
                <td>
                  <span class="flex" style="gap: 6px">
                    <span class="dot" :style="{ background: team.color }"></span>
                    {{ team.name }}
                  </span>
                </td>
                <td>{{ team.power }}</td>
                <td>
                  <span
                    v-if="tournament.winnerId === team.id"
                    class="tag"
                    :style="{ background: team.color }"
                  >
                    Winner
                  </span>
                  <span
                    v-else-if="isEliminated(team.id)"
                    style="color: var(--text-muted); font-size: 12px"
                  >
                    Eliminated
                  </span>
                  <span v-else style="font-size: 12px; color: var(--text-muted)">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Danger zone -->
      <div style="margin-top: 8px; text-align: right">
        <button class="danger" @click="deleteTournament">Delete Tournament</button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { useRoute, useRouter } from "vue-router"
import { useTeamsStore } from "@/modules/teams/store"
import { useTournamentStore } from "@/modules/tournament/store"
import { simulateMatch } from "@/engine/logic"
import Bracket from "@/modules/tournament/components/Bracket.vue"

const route = useRoute()
const router = useRouter()
const teamsStore = useTeamsStore()
const store = useTournamentStore()

const allTeams = computed(() => teamsStore.teams)
const tournament = computed(() => store.getById(route.params.id as string))

const winnerTeam = computed(() => allTeams.value.find((t) => t.id === tournament.value?.winnerId))

const participantTeams = computed(() =>
  allTeams.value.filter((t) => tournament.value?.teamIds.includes(t.id))
)

const dateStr = computed(() => {
  if (!tournament.value) return ""
  return new Date(tournament.value.createdAt).toLocaleDateString()
})

function isEliminated(teamId: string): boolean {
  const t = tournament.value
  if (!t) return false
  for (const round of t.rounds) {
    for (const match of round.matches) {
      if ((match.homeId === teamId || match.awayId === teamId) && match.result) {
        const loser = match.result.home > match.result.away ? match.awayId : match.homeId
        if (loser === teamId) return true
      }
    }
  }
  return false
}

function simMatch(ri: number, mi: number) {
  const t = tournament.value
  if (!t) return
  const match = t.rounds[ri].matches[mi]
  if (!match.homeId || !match.awayId) return
  const result = simulateMatch(match, allTeams.value)
  store.setResult(t.id, ri, mi, result.home, result.away)
}

function deleteTournament() {
  if (!confirm("Delete this tournament?")) return
  store.remove(route.params.id as string)
  router.push("/tournaments")
}
</script>

<style scoped>
.t-header {
  margin-bottom: 16px;
}
.back {
  font-size: 13px;
  color: var(--accent);
}
.t-header h1 {
  font-size: 22px;
  font-weight: normal;
  font-family: var(--font);
  margin: 6px 0 4px;
}
.t-meta {
  font-size: 12px;
  color: var(--text-muted);
}

.winner-banner {
  border: 1px solid var(--border);
  border-left-width: 4px;
  background: var(--surface);
  padding: 10px 14px;
  margin-bottom: 16px;
  font-size: 14px;
}

.dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
</style>
