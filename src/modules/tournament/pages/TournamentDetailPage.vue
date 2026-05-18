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

const showSeasonModal = ref(false)
const showManualSeason = ref(false)

const tournamentTeams = computed(() =>
  allTeams.value.filter((t) => tournament.value?.teamIds.includes(t.id) ?? false)
)

function handleNewSeason(seeded: boolean) {
  startNewSeason(seeded)
  showSeasonModal.value = false
}

function handleManualSeasonConfirm(orderedIds: string[]) {
  startNewSeason(false, orderedIds)
  showSeasonModal.value = false
  showManualSeason.value = false
}

function closeSeasonModal() {
  showSeasonModal.value = false
  showManualSeason.value = false
}
</script>

<template>
  <div class="page">
    <div v-if="!tournament">
      <p class="not-found">
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
        <div class="section-body bracket-body">
          <div class="flex sim-toolbar">
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
        <div class="section-body flush">
          <ParticipantsTable :teams="allTeams" :tournament="tournament" />
        </div>
      </div>

      <div class="flex t-actions">
        <button v-if="tournament.winnerId" class="primary" @click="showSeasonModal = true">
          New Season
        </button>
        <button class="danger" @click="resetTournament">Reset</button>
        <button class="danger" @click="deleteTournament">Delete</button>
      </div>
    </template>

    <!-- New Season modal -->
    <div v-if="showSeasonModal" class="modal-backdrop" @click.self="closeSeasonModal">
      <div class="modal">
        <div class="modal-header">New Season — {{ tournament?.name }}</div>
        <div class="modal-body">
          <template v-if="showManualSeason">
            <ManualDraw
              :teams="tournamentTeams"
              @confirm="handleManualSeasonConfirm"
              @cancel="showManualSeason = false"
            />
          </template>
          <template v-else>
            <p class="modal-desc">
              Choose draw type for Season {{ (tournament?.season ?? 1) + 1 }}
            </p>
            <div class="modal-actions">
              <button class="primary" @click="handleNewSeason(false)">Random draw</button>
              <button class="primary" @click="handleNewSeason(true)">Seeded</button>
              <button class="primary" @click="showManualSeason = true">Manual</button>
              <button @click="closeSeasonModal">Cancel</button>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.not-found {
  color: var(--text-muted);
}
.bracket-body {
  padding: 8px 0;
}
.sim-toolbar {
  padding: 0 8px;
  margin-bottom: 10px;
  flex-wrap: wrap;
  gap: 6px;
}
.flush {
  padding: 0;
}
.t-actions {
  justify-content: flex-end;
  margin-top: 8px;
}
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
