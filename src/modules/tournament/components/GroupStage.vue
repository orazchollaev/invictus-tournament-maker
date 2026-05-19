<script setup lang="ts">
import { ref, computed } from "vue"
import type { Team } from "@/modules/teams/types"
import type { Tournament, GroupMatch } from "@/modules/tournament/types"

const props = defineProps<{
  tournament: Tournament
  teams: Team[]
}>()

const emit = defineEmits<{
  setResult: [groupIdx: number, matchIdx: number, home: number, away: number]
  simMatch: [groupIdx: number, matchIdx: number]
  simGroup: [groupIdx: number]
  simAll: []
  advance: []
}>()

// After knockout is seeded, group results are locked
const locked = computed(() => !!props.tournament.groupsDone)

const editingMatch = ref<{ gi: number; mi: number } | null>(null)
const editHome = ref(0)
const editAway = ref(0)

function teamById(id: string) {
  return props.teams.find((t) => t.id === id)
}

function openEdit(gi: number, mi: number, match: GroupMatch) {
  if (locked.value) return
  editingMatch.value = { gi, mi }
  editHome.value = match.result?.home ?? 0
  editAway.value = match.result?.away ?? 0
}

function confirmEdit() {
  if (!editingMatch.value) return
  emit("setResult", editingMatch.value.gi, editingMatch.value.mi, editHome.value, editAway.value)
  editingMatch.value = null
}

function cancelEdit() {
  editingMatch.value = null
}

const allDone = computed(
  () => props.tournament.groups?.every((g) => g.matches.every((m) => m.result !== null)) ?? false
)

function matchResultStr(match: GroupMatch): string {
  if (!match.result) return "–"
  return `${match.result.home} – ${match.result.away}`
}

// W/D/L from home team perspective — used for score button color
function homeOutcome(match: GroupMatch): "W" | "D" | "L" | null {
  if (!match.result) return null
  if (match.result.home > match.result.away) return "W"
  if (match.result.home < match.result.away) return "L"
  return "D"
}
</script>

<template>
  <div class="gs-wrap">
    <!-- Locked notice -->
    <div v-if="locked" class="gs-locked-notice">
      🔒 Group stage complete — results are locked. Switch to the Knockout tab to continue.
    </div>

    <!-- Toolbar (only when not locked) -->
    <div v-else class="gs-toolbar">
      <button @click="emit('simAll')">🎲 Simulate All Groups</button>
      <button v-for="(g, gi) in tournament.groups" :key="gi" @click="emit('simGroup', gi)">
        Sim {{ g.name }}
      </button>
      <button v-if="allDone" class="primary advance-btn" @click="emit('advance')">
        ✔ Advance to Knockout →
      </button>
    </div>

    <!-- Groups grid -->
    <div class="gs-groups">
      <div v-for="(group, gi) in tournament.groups" :key="gi" class="gs-group">
        <div class="gs-group-header">{{ group.name }}</div>

        <!-- Standings -->
        <table class="gs-table">
          <thead>
            <tr>
              <th class="col-rank">#</th>
              <th class="col-team">Team</th>
              <th title="Played">P</th>
              <th title="Won">W</th>
              <th title="Drawn">D</th>
              <th title="Lost">L</th>
              <th title="Goals For">GF</th>
              <th title="Goals Against">GA</th>
              <th title="Goal Difference">GD</th>
              <th title="Points">Pts</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, ri) in group.standings"
              :key="row.teamId"
              :class="{ 'row-qualify': ri < 2, 'row-out': ri >= 2 }"
            >
              <td class="col-rank">{{ ri + 1 }}</td>
              <td class="col-team">
                <span class="flex team-cell">
                  <span
                    class="dot"
                    :style="{ background: teamById(row.teamId)?.color ?? '#888' }"
                  />
                  {{ teamById(row.teamId)?.name ?? row.teamId }}
                </span>
              </td>
              <td>{{ row.played }}</td>
              <td>{{ row.won }}</td>
              <td>{{ row.drawn }}</td>
              <td>{{ row.lost }}</td>
              <td>{{ row.gf }}</td>
              <td>{{ row.ga }}</td>
              <td>{{ row.gd >= 0 ? "+" + row.gd : row.gd }}</td>
              <td class="col-pts">{{ row.pts }}</td>
            </tr>
          </tbody>
        </table>

        <!-- Matches -->
        <div class="gs-matches">
          <div v-for="(match, mi) in group.matches" :key="match.id" class="gs-match">
            <span class="gs-team gs-team--home">
              <span class="dot" :style="{ background: teamById(match.homeId)?.color ?? '#888' }" />
              {{ teamById(match.homeId)?.name }}
            </span>

            <button
              class="gs-score-btn"
              :class="{
                'gs-score-btn--locked': locked,
                'score-w': homeOutcome(match) === 'W',
                'score-l': homeOutcome(match) === 'L',
                'score-d': homeOutcome(match) === 'D',
              }"
              :disabled="locked"
              @click="openEdit(gi, mi, match)"
            >
              {{ matchResultStr(match) }}
            </button>

            <span class="gs-team gs-team--away">
              {{ teamById(match.awayId)?.name }}
              <span class="dot" :style="{ background: teamById(match.awayId)?.color ?? '#888' }" />
            </span>

            <button v-if="!locked" class="btn-xs sim-btn" @click="emit('simMatch', gi, mi)">
              🎲
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Legend -->
    <div class="gs-legend">
      <span class="legend-qualify">■</span>
      Qualifies &nbsp;
      <span class="legend-out">■</span>
      Eliminated
    </div>
  </div>

  <!-- Score edit modal -->
  <Teleport to="body">
    <div v-if="editingMatch && !locked" class="modal-backdrop" @click.self="cancelEdit">
      <div class="modal score-modal">
        <div class="modal-header">Set Result</div>
        <div class="modal-body">
          <div class="score-row">
            <span class="score-team">
              {{
                teamById(tournament.groups![editingMatch.gi].matches[editingMatch.mi].homeId)?.name
              }}
            </span>
            <input v-model.number="editHome" type="number" min="0" class="score-input" />
            <span class="score-sep">–</span>
            <input v-model.number="editAway" type="number" min="0" class="score-input" />
            <span class="score-team">
              {{
                teamById(tournament.groups![editingMatch.gi].matches[editingMatch.mi].awayId)?.name
              }}
            </span>
          </div>
          <div class="modal-actions mt">
            <button class="primary" @click="confirmEdit">Save</button>
            <button @click="cancelEdit">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.gs-wrap {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.gs-locked-notice {
  font-size: 12px;
  color: var(--text-muted);
  background: var(--bg);
  border: 1px solid var(--border-light);
  border-left: 3px solid var(--accent);
  padding: 8px 12px;
  margin: 0 8px;
}

.gs-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 0 8px;
  align-items: center;
}
.advance-btn {
  margin-left: auto;
}

.gs-groups {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 12px;
  padding: 0 8px 8px;
}
.gs-group {
  border: 1px solid var(--border-light);
  background: var(--surface);
}
.gs-group-header {
  font-family: var(--font);
  font-size: 13px;
  font-weight: 600;
  padding: 6px 10px;
  background: var(--bg);
  border-bottom: 1px solid var(--border-light);
  letter-spacing: 0.03em;
}

.gs-table {
  border-collapse: collapse;
  width: 100%;
  font-size: 12px;
}
.gs-table th,
.gs-table td {
  border: none;
  border-bottom: 1px solid var(--border-light);
  padding: 4px 6px;
  text-align: center;
}
.gs-table th {
  background: var(--bg);
  font-weight: 600;
  font-size: 11px;
  color: var(--text-muted);
}
.gs-table .col-rank {
  width: 18px;
  color: var(--text-muted);
  font-size: 11px;
}
.gs-table .col-team {
  text-align: left;
  min-width: 110px;
}
.col-pts {
  font-weight: 700;
}
.row-qualify {
  background: color-mix(in srgb, var(--accent) 6%, transparent);
}
.row-qualify td:first-child {
  border-left: 3px solid var(--accent);
}
.row-out {
  opacity: 0.65;
}

.gs-matches {
  padding: 6px 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  border-top: 1px solid var(--border-light);
}
.gs-match {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  padding: 3px 0;
}
.gs-team {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.gs-team--home {
  justify-content: flex-end;
  text-align: right;
}
.gs-team--away {
  justify-content: flex-start;
  text-align: left;
}

.gs-score-btn {
  font-family: var(--font);
  font-size: 12px;
  font-weight: 600;
  min-width: 48px;
  text-align: center;
  padding: 2px 6px;
  background: var(--bg);
  border: 1px solid var(--border-light);
  cursor: pointer;
  flex-shrink: 0;
}
.gs-score-btn:hover:not(:disabled) {
  background: var(--border-light);
}
.gs-score-btn--locked {
  cursor: default;
  pointer-events: none;
}
.score-w {
  border-color: var(--success);
  color: var(--success);
}
.score-l {
  border-color: var(--danger);
  color: var(--danger);
}
.score-d {
  border-color: var(--text-muted);
}

.sim-btn {
  flex-shrink: 0;
  opacity: 0.55;
  font-size: 11px;
}
.sim-btn:hover {
  opacity: 1;
}

.gs-legend {
  font-size: 11px;
  color: var(--text-muted);
  padding: 0 8px;
}
.legend-qualify {
  color: var(--accent);
}

.score-modal {
  width: 360px;
}
.score-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.score-team {
  flex: 1;
  font-size: 13px;
  font-weight: 600;
  text-align: center;
}
.score-input {
  width: 52px;
  text-align: center;
  font-size: 18px;
  font-weight: 700;
  padding: 4px;
}
.score-sep {
  font-size: 16px;
  color: var(--text-muted);
}
.mt {
  margin-top: 12px;
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
}
.modal-header {
  font-family: var(--font);
  font-size: 15px;
  border-bottom: 1px solid var(--border-light);
  padding: 10px 14px;
  background: var(--bg);
}
.modal-body {
  padding: 14px;
}
.modal-actions {
  display: flex;
  gap: 8px;
}

.dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.team-cell {
  gap: 6px;
}
.flex {
  display: flex;
  align-items: center;
}

@media (max-width: 600px) {
  .gs-groups {
    grid-template-columns: 1fr;
  }
  .score-modal {
    width: calc(100vw - 32px);
  }
}
</style>
