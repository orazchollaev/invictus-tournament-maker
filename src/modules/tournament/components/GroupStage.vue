<script setup lang="ts">
import { ref, computed } from "vue"
import type { Team } from "@/modules/teams/types"
import type { Tournament, GroupMatch } from "@/modules/tournament/types"
import AppModal from "@/components/AppModal.vue"
import { useTeamLookup } from "@/composables/useTeamLookup"
import { Lock, Shuffle, Check } from "lucide-vue-next"

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

const locked = computed(() => !!props.tournament.groupsDone)

const editingMatch = ref<{ gi: number; mi: number } | null>(null)
const editHome = ref(0)
const editAway = ref(0)

const { teamById } = useTeamLookup(() => props.teams)

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

function getMatchRounds(
  group: (typeof props.tournament.groups)[number]
): { match: GroupMatch; mi: number }[][] {
  const n = group.teamIds.length
  const matchesPerRound = Math.floor(n / 2)
  if (matchesPerRound < 1) return [group.matches.map((match, mi) => ({ match, mi }))]
  const rounds: { match: GroupMatch; mi: number }[][] = []
  for (let i = 0; i < group.matches.length; i += matchesPerRound) {
    rounds.push(
      group.matches.slice(i, i + matchesPerRound).map((match, j) => ({ match, mi: i + j }))
    )
  }
  return rounds
}

function matchResultStr(match: GroupMatch): string {
  if (!match.result) return "–"
  return `${match.result.home} – ${match.result.away}`
}

function scoreAccentColor(match: GroupMatch): string {
  if (!match.result) return ""
  if (match.result.home > match.result.away) return teamById(match.homeId)?.color ?? ""
  if (match.result.away > match.result.home) return teamById(match.awayId)?.color ?? ""
  return "var(--border)"
}
</script>

<template>
  <div class="gs-wrap">
    <!-- Locked notice -->
    <div v-if="locked" class="gs-locked-notice">
      <Lock :size="14" />
      Group stage complete — results are locked. Switch to the Knockout tab to continue.
    </div>

    <!-- Toolbar (only when not locked) -->
    <div v-else class="gs-toolbar">
      <button :disabled="allDone" @click="emit('simAll')">
        <Shuffle :size="14" />
        Simulate All
      </button>
      <template v-for="(g, gi) in tournament.groups" :key="gi">
        <button v-if="g.matches.some((m) => !m.result)" @click="emit('simGroup', gi)">
          Sim {{ g.name }}
        </button>
      </template>
      <button v-if="allDone" class="primary" style="margin-left: auto" @click="emit('advance')">
        <Check :size="14" />
        Advance to Knockout →
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
              :class="{
                'row-qualify': ri < (tournament.qualifiersPerGroup ?? 2),
                'row-out': ri >= (tournament.qualifiersPerGroup ?? 2),
              }"
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

        <!-- Matches grouped by round -->
        <div class="gs-matches">
          <template v-for="(round, roundIdx) in getMatchRounds(group)" :key="roundIdx">
            <div class="gs-round-header">{{ roundIdx + 1 }}. Maçlar</div>
            <div v-for="{ match, mi } in round" :key="match.id" class="gs-match">
              <span class="gs-team gs-team--home">
                <span class="gs-team-name">{{ teamById(match.homeId)?.name }}</span>
                <span
                  class="dot"
                  :style="{ background: teamById(match.homeId)?.color ?? '#888' }"
                />
              </span>

              <button
                class="gs-score-btn"
                :class="{ 'gs-score-btn--locked': locked }"
                :style="
                  match.result
                    ? { borderColor: scoreAccentColor(match), borderLeftWidth: '3px' }
                    : {}
                "
                :disabled="locked"
                @click="openEdit(gi, mi, match)"
              >
                {{ matchResultStr(match) }}
              </button>

              <span class="gs-team gs-team--away">
                <span
                  class="dot"
                  :style="{ background: teamById(match.awayId)?.color ?? '#888' }"
                />
                <span class="gs-team-name">{{ teamById(match.awayId)?.name }}</span>
              </span>

              <button v-if="!locked" class="btn-xs sim-btn" @click="emit('simMatch', gi, mi)">
                <Shuffle :size="13" />
              </button>
            </div>
          </template>
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
    <AppModal v-if="editingMatch && !locked" title="Set Result" width="360px" @close="cancelEdit">
      <div class="score-row">
        <span class="score-team">
          {{ teamById(tournament.groups![editingMatch.gi].matches[editingMatch.mi].homeId)?.name }}
        </span>
        <input v-model.number="editHome" type="number" min="0" class="score-input" />
        <span class="score-sep">–</span>
        <input v-model.number="editAway" type="number" min="0" class="score-input" />
        <span class="score-team">
          {{ teamById(tournament.groups![editingMatch.gi].matches[editingMatch.mi].awayId)?.name }}
        </span>
      </div>
      <div class="modal-actions mt">
        <button class="primary" @click="confirmEdit">Save</button>
        <button @click="cancelEdit">Cancel</button>
      </div>
    </AppModal>
  </Teleport>
</template>

<style scoped>
.gs-wrap {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.gs-locked-notice {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-muted);
  background: var(--bg);
  border: 1px solid var(--border-light);
  border-left: 3px solid var(--accent);
  padding: 6px 10px;
  margin: 0 8px;
}

.gs-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  padding: 0 8px;
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
  border-radius: var(--radius);
  overflow: hidden;
}
.gs-group-header {
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
.gs-table tbody tr:last-child td {
  border-bottom: none;
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
  padding: 4px 8px 6px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  border-top: 1px solid var(--border-light);
  max-height: 300px;
  overflow-y: auto;
}
.gs-round-header {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
  padding: 5px 0 2px;
  border-bottom: 1px solid var(--border-light);
  margin-bottom: 2px;
  margin-top: 4px;
}
.gs-round-header:first-child {
  margin-top: 2px;
}
.gs-match {
  display: grid;
  grid-template-columns: 1fr auto 1fr auto;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  padding: 2px 0;
}
.gs-team {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
}
.gs-team--home {
  justify-content: flex-end;
}
.gs-team--away {
  justify-content: flex-start;
}
.gs-team-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}
.gs-team--home .gs-team-name {
  text-align: right;
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
}
</style>
