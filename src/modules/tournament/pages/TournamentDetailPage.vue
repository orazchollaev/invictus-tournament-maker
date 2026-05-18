<script setup lang="ts">
import { ref, computed } from "vue"
import Bracket from "@/modules/tournament/components/Bracket.vue"
import ParticipantsTable from "@/modules/tournament/components/ParticipantsTable.vue"
import ManualDraw from "@/modules/tournament/components/ManualDraw.vue"
import { useTournamentDetail } from "../composables/useTournamentDetail"

const {
  store,
  allTeams,
  tournament,
  winnerTeam,
  dateStr,
  simMatch,
  deleteTournament,
  resetTournament,
  startNewSeason,
} = useTournamentDetail()

const showSeasonChoice = ref(false)
const showManualSeason = ref(false)

const tournamentTeams = computed(() =>
  allTeams.value.filter((t) => tournament.value?.teamIds.includes(t.id) ?? false)
)

function handleNewSeason(seeded: boolean) {
  startNewSeason(seeded)
  showSeasonChoice.value = false
}

function handleManualSeasonConfirm(orderedIds: string[]) {
  startNewSeason(false, orderedIds)
  showSeasonChoice.value = false
  showManualSeason.value = false
}

function cancelSeasonChoice() {
  showSeasonChoice.value = false
  showManualSeason.value = false
}
</script>

<template>
  <div class="page">
    <div v-if="!tournament">
      <p style="color: var(--text-muted)">
        Tournament not found.
        <RouterLink to="/tournaments">← Back</RouterLink>
      </p>
    </div>
    <template v-else>
      <div class="t-header">
        <RouterLink to="/tournaments" class="back">← Tournaments</RouterLink>
        <h1>
          {{ tournament.name }}
          <span class="t-season">S{{ tournament.season }}</span>
        </h1>
        <span class="t-meta">{{ tournament.teamIds.length }} teams · Created {{ dateStr }}</span>
      </div>

      <div
        v-if="tournament.winnerId"
        class="winner-banner"
        :style="{ borderColor: winnerTeam?.color }"
      >
        🏆
        <strong>{{ winnerTeam?.name }}</strong>
        wins the tournament!
      </div>

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

      <div class="section-box">
        <h2>Participants</h2>
        <div class="section-body" style="padding: 0">
          <ParticipantsTable :teams="allTeams" :tournament="tournament" />
        </div>
      </div>

      <div
        class="flex"
        style="justify-content: flex-end; gap: 8px; margin-top: 8px; flex-wrap: wrap"
      >
        <template v-if="tournament.winnerId && showSeasonChoice">
          <template v-if="showManualSeason">
            <div class="manual-season-wrap">
              <ManualDraw
                :teams="tournamentTeams"
                @confirm="handleManualSeasonConfirm"
                @cancel="showManualSeason = false"
              />
            </div>
          </template>
          <template v-else>
            <span style="font-size: 12px; color: var(--text-muted)">Draw:</span>
            <button @click="handleNewSeason(false)">Random</button>
            <button @click="handleNewSeason(true)">Seeded</button>
            <button @click="showManualSeason = true">Manual</button>
            <button @click="cancelSeasonChoice">Cancel</button>
          </template>
        </template>
        <button v-else-if="tournament.winnerId" class="primary" @click="showSeasonChoice = true">
          New Season
        </button>
        <button class="danger" @click="resetTournament">Reset</button>
        <button class="danger" @click="deleteTournament">Delete</button>
      </div>
    </template>
  </div>
</template>

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
  display: flex;
  align-items: center;
  gap: 8px;
}
.t-season {
  font-size: 13px;
  color: var(--text-muted);
  background: var(--bg);
  border: 1px solid var(--border-light);
  border-radius: 2px;
  padding: 1px 6px;
  font-family: var(--font-ui);
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
.manual-season-wrap {
  background: var(--surface);
  border: 1px solid var(--border-light);
  padding: 12px;
  width: 100%;
}
</style>
