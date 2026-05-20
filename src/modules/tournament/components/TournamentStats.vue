<script setup lang="ts">
import type { Tournament } from "../types"
import type { Team } from "@/modules/teams/types"
import { useTournamentStats } from "../composables/useTournamentStats"

const props = defineProps<{
  tournament: Tournament
  teams: Team[]
}>()

const { topScorers, bestDefense, hasStats } = useTournamentStats(
  () => props.tournament,
  () => props.teams
)
</script>

<template>
  <div v-if="hasStats" class="stats-grid">
    <!-- Top Scorers -->
    <div class="stats-panel">
      <div class="stats-panel-header">Top Scorers</div>
      <table class="stats-table">
        <thead>
          <tr>
            <th class="col-rank">#</th>
            <th class="col-team">Team</th>
            <th title="Goals For">GF</th>
            <th title="Goals Against">GA</th>
            <th title="Matches Played">MP</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(s, i) in topScorers" :key="s.teamId">
            <td class="col-rank">{{ i + 1 }}</td>
            <td class="col-team">
              <span class="team-cell">
                <span class="dot" :style="{ background: s.color }" />
                {{ s.name }}
              </span>
            </td>
            <td class="col-highlight">{{ s.gf }}</td>
            <td class="col-muted">{{ s.ga }}</td>
            <td class="col-muted">{{ s.played }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Best Defense -->
    <div class="stats-panel">
      <div class="stats-panel-header">Best Defense</div>
      <table class="stats-table">
        <thead>
          <tr>
            <th class="col-rank">#</th>
            <th class="col-team">Team</th>
            <th title="Goals Against">GA</th>
            <th title="Goals For">GF</th>
            <th title="Matches Played">MP</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(s, i) in bestDefense" :key="s.teamId">
            <td class="col-rank">{{ i + 1 }}</td>
            <td class="col-team">
              <span class="team-cell">
                <span class="dot" :style="{ background: s.color }" />
                {{ s.name }}
              </span>
            </td>
            <td class="col-highlight">{{ s.ga }}</td>
            <td class="col-muted">{{ s.gf }}</td>
            <td class="col-muted">{{ s.played }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  padding: 8px;
}

.stats-panel {
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  overflow: hidden;
  background: var(--surface);
}

.stats-panel-header {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  padding: 7px 10px;
  background: var(--bg);
  border-bottom: 1px solid var(--border-light);
  color: var(--text-muted);
  border-left: 3px solid var(--accent);
}

.stats-table {
  border-collapse: collapse;
  width: 100%;
  font-size: 12px;
}

.stats-table th,
.stats-table td {
  border: none;
  border-bottom: 1px solid var(--border-light);
  padding: 4px 6px;
  text-align: center;
}

.stats-table tbody tr:last-child td {
  border-bottom: none;
}

.stats-table th {
  background: var(--bg);
  font-weight: 600;
  font-size: 11px;
  color: var(--text-muted);
}

.col-rank {
  width: 18px;
  color: var(--text-muted);
  font-size: 11px;
}

.col-team {
  text-align: left;
  min-width: 110px;
}

.col-highlight {
  font-weight: 700;
  color: var(--accent);
}

.col-muted {
  color: var(--text-muted);
}

.team-cell {
  display: flex;
  align-items: center;
  gap: 6px;
}

.dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

@media (max-width: 600px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
