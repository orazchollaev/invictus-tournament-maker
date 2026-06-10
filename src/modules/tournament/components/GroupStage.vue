<script setup lang="ts">
import { ref, computed } from "vue"
import type { Team } from "@/modules/teams/types"
import type { Tournament, GroupMatch } from "@/modules/tournament/types"
import AppModal from "@/components/AppModal.vue"
import { useTeamLookup } from "@/composables/useTeamLookup"
import TeamNameAuto from "@/modules/teams/components/TeamNameAuto.vue"
import { Lock, Shuffle, Check } from "@lucide/vue"
import { useI18n } from "vue-i18n"
import { useGradualSim } from "../composables/useGradualSim"

const props = defineProps<{
  tournament: Tournament
  teams: Team[]
}>()

const emit = defineEmits<{
  setResult: [groupIdx: number, matchIdx: number, home: number, away: number]
  simMatch: [groupIdx: number, matchIdx: number]
  simGroup: [groupIdx: number]
  simGroupWeek: [groupIdx: number]
  simAll: []
  simWeek: []
  advance: []
}>()

const { t } = useI18n()
const { runSequential } = useGradualSim()
const locked = computed(() => !!props.tournament.groupsDone)

const editingMatch = ref<{ gi: number; mi: number } | null>(null)
const editHome = ref(0)
const editAway = ref(0)

const { teamById } = useTeamLookup(() => props.teams)

const selectedRound = ref<number[]>([])

function getRounds(gi: number): { match: GroupMatch; mi: number }[][] {
  const group = props.tournament.groups![gi]
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

function currentRound(gi: number): number {
  if (selectedRound.value[gi] === undefined) selectedRound.value[gi] = 0
  return selectedRound.value[gi]
}

function setRound(gi: number, r: number) {
  selectedRound.value[gi] = r
}

async function handleSimGroupWeek(gi: number) {
  const group = props.tournament.groups![gi]
  const n = group.teamIds.length
  const mpr = Math.floor(n / 2)
  if (mpr < 1) return
  const first = group.matches.findIndex((m) => !m.result)
  if (first === -1) return
  const roundIdx = Math.floor(first / mpr)
  const start = roundIdx * mpr
  const end = Math.min(start + mpr, group.matches.length)
  const cbs: (() => void)[] = []
  for (let mi = start; mi < end; mi++) {
    if (!group.matches[mi].result) {
      const captured = mi
      cbs.push(() => {
        emit("simMatch", gi, captured)
        selectedRound.value[gi] = roundIdx
      })
    }
  }
  await runSequential(cbs)
  const nextFirst = group.matches.findIndex((m) => !m.result)
  if (nextFirst !== -1) selectedRound.value[gi] = Math.floor(nextFirst / mpr)
}

async function handleSimWeek() {
  const groups = props.tournament.groups
  if (!groups) return
  const cbs: (() => void)[] = []
  for (let gi = 0; gi < groups.length; gi++) {
    const group = groups[gi]
    const n = group.teamIds.length
    const mpr = Math.floor(n / 2)
    if (mpr < 1) continue
    const first = group.matches.findIndex((m) => !m.result)
    if (first === -1) continue
    const roundIdx = Math.floor(first / mpr)
    const start = roundIdx * mpr
    const end = Math.min(start + mpr, group.matches.length)
    for (let mi = start; mi < end; mi++) {
      if (!group.matches[mi].result) {
        const cgi = gi,
          cmi = mi
        cbs.push(() => {
          emit("simMatch", cgi, cmi)
          selectedRound.value[cgi] = roundIdx
        })
      }
    }
  }
  await runSequential(cbs)
  for (let gi = 0; gi < groups.length; gi++) {
    const group = groups[gi]
    const n = group.teamIds.length
    const mpr = Math.floor(n / 2)
    if (mpr < 1) continue
    const nextFirst = group.matches.findIndex((m) => !m.result)
    if (nextFirst !== -1) selectedRound.value[gi] = Math.floor(nextFirst / mpr)
  }
}

async function handleSimGroup(gi: number) {
  const group = props.tournament.groups![gi]
  const n = group.teamIds.length
  const mpr = Math.floor(n / 2)
  const cbs = group.matches
    .map((m, mi) => ({ m, mi }))
    .filter(({ m }) => !m.result)
    .map(({ mi }) => {
      const roundIdx = mpr > 0 ? Math.floor(mi / mpr) : 0
      return () => {
        emit("simMatch", gi, mi)
        selectedRound.value[gi] = roundIdx
      }
    })
  await runSequential(cbs)
}

async function handleSimAll() {
  const groups = props.tournament.groups
  if (!groups) return
  const cbs: (() => void)[] = []
  for (let gi = 0; gi < groups.length; gi++) {
    const group = groups[gi]
    const n = group.teamIds.length
    const mpr = Math.floor(n / 2)
    for (let mi = 0; mi < group.matches.length; mi++) {
      if (!group.matches[mi].result) {
        const cgi = gi,
          cmi = mi
        const roundIdx = mpr > 0 ? Math.floor(mi / mpr) : 0
        cbs.push(() => {
          emit("simMatch", cgi, cmi)
          selectedRound.value[cgi] = roundIdx
        })
      }
    }
  }
  await runSequential(cbs)
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
      <button :disabled="allDone" @click="handleSimWeek()">
        <Shuffle :size="14" />
        Sim Week
      </button>
      <button :disabled="allDone" @click="handleSimAll()">
        <Shuffle :size="14" />
        Simulate All
      </button>
      <template v-for="(g, gi) in tournament.groups" :key="gi">
        <button v-if="g.matches.some((m) => !m.result)" @click="handleSimGroup(gi)">
          Sim {{ g.name }}
        </button>
      </template>
      <button
        v-if="allDone"
        class="primary advance-btn"
        style="margin-left: auto"
        @click="emit('advance')"
      >
        <Check :size="14" />
        Advance to Knockout →
      </button>
    </div>

    <div class="gs-legend">
      <span class="legend-qualify">■</span>
      Qualifies
      <template v-if="(tournament.wildcardCount ?? 0) > 0">
        &nbsp;
        <span class="legend-wildcard">╌</span>
        Wildcard (best {{ tournament.wildcardCount }})
      </template>
      &nbsp;
      <span class="legend-out">■</span>
      Eliminated
    </div>

    <!-- Groups grid -->
    <div class="gs-groups">
      <div v-for="(group, gi) in tournament.groups" :key="gi" class="gs-group">
        <div class="gs-group-header">{{ group.name }}</div>

        <!-- Standings -->
        <div class="gs-table-scroll">
          <table class="gs-table">
            <thead>
              <tr>
                <th class="col-rank">#</th>
                <th class="col-team">{{ t("common.team") }}</th>
                <th :title="t('history.table.played')">P</th>
                <th :title="t('history.table.won')">W</th>
                <th :title="t('history.table.drawn')">D</th>
                <th :title="t('history.table.lost')">L</th>
                <th :title="t('history.table.goalsFor')">GF</th>
                <th :title="t('history.table.goalsAgainst')">GA</th>
                <th :title="t('history.table.goalDiff')">GD</th>
                <th :title="t('history.table.points')">Pts</th>
              </tr>
            </thead>
            <TransitionGroup tag="tbody" name="standing-row">
              <tr
                v-for="(row, ri) in group.standings"
                :key="row.teamId"
                :class="{
                  'row-qualify': ri < (tournament.qualifiersPerGroup ?? 2),
                  'row-wildcard':
                    ri === (tournament.qualifiersPerGroup ?? 2) &&
                    (tournament.wildcardCount ?? 0) > 0,
                  'row-out':
                    ri > (tournament.qualifiersPerGroup ?? 2) ||
                    (ri === (tournament.qualifiersPerGroup ?? 2) &&
                      !(tournament.wildcardCount ?? 0)),
                }"
              >
                <td class="col-rank">{{ ri + 1 }}</td>
                <td class="col-team">
                  <span class="flex team-cell">
                    <span
                      class="dot"
                      :style="{ background: teamById(row.teamId)?.color ?? '#888' }"
                    />
                    <TeamNameAuto :team="teamById(row.teamId)" :fallback="row.teamId" />
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
            </TransitionGroup>
          </table>
        </div>

        <!-- Matches -->
        <div class="gs-matches">
          <div class="gs-round-nav">
            <span class="gs-round-label">
              Round {{ currentRound(gi) + 1 }} / {{ getRounds(gi).length }}
            </span>
            <div class="gs-round-btns">
              <button
                v-if="!locked"
                class="btn-xs"
                :disabled="group.matches.every((m) => !!m.result)"
                @click="handleSimGroupWeek(gi)"
              >
                <Shuffle :size="11" />
              </button>
              <button
                class="btn-xs"
                :disabled="currentRound(gi) === 0"
                @click="setRound(gi, currentRound(gi) - 1)"
              >
                ‹
              </button>
              <button
                class="btn-xs"
                :disabled="currentRound(gi) >= getRounds(gi).length - 1"
                @click="setRound(gi, currentRound(gi) + 1)"
              >
                ›
              </button>
            </div>
          </div>
          <div
            v-for="{ match, mi } in getRounds(gi)[currentRound(gi)] ?? []"
            :key="match.id"
            class="gs-match"
          >
            <span class="gs-team gs-team--home">
              <TeamNameAuto :team="teamById(match.homeId)" />
              <span class="dot" :style="{ background: teamById(match.homeId)?.color ?? '#888' }" />
            </span>

            <button
              class="gs-score-btn"
              :class="{ 'gs-score-btn--locked': locked }"
              :style="
                match.result ? { borderColor: scoreAccentColor(match), borderLeftWidth: '3px' } : {}
              "
              :disabled="locked"
              @click="openEdit(gi, mi, match)"
            >
              {{ matchResultStr(match) }}
            </button>

            <span class="gs-team gs-team--away">
              <span class="dot" :style="{ background: teamById(match.awayId)?.color ?? '#888' }" />
              <TeamNameAuto :team="teamById(match.awayId)" />
            </span>

            <button v-if="!locked" class="btn-xs sim-btn" @click="emit('simMatch', gi, mi)">
              <Shuffle :size="13" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Legend -->
  </div>

  <!-- Score edit modal -->
  <Teleport to="body">
    <AppModal
      v-if="editingMatch && !locked"
      :title="t('tournament.setResult')"
      width="360px"
      @close="cancelEdit"
    >
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
        <button class="primary" @click="confirmEdit">{{ t("common.save") }}</button>
        <button @click="cancelEdit">{{ t("common.cancel") }}</button>
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
  grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr));
  gap: 12px;
  padding: 0 8px 8px;
}

.gs-table-scroll {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
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
  min-width: 0;
  max-width: 120px;
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
.row-wildcard {
  background: color-mix(in srgb, var(--accent) 3%, transparent);
}
.row-wildcard td:first-child {
  border-left: 3px dashed var(--accent);
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
}
.gs-round-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 0 4px;
  border-bottom: 1px solid var(--border-light);
  margin-bottom: 4px;
}
.gs-round-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.gs-round-btns {
  display: flex;
  gap: 3px;
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
  text-align: right;
}
.gs-team--away {
  justify-content: flex-start;
}

.gs-score-btn {
  font-family: var(--font);
  font-size: 12px;
  font-weight: 600;
  min-width: 48px;
  justify-content: center;
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
.legend-wildcard {
  color: var(--accent);
  opacity: 0.6;
  letter-spacing: -1px;
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
    padding: 0 4px 8px;
  }
  .gs-matches {
    max-height: none;
  }
  .gs-table .col-team {
    min-width: 90px;
  }

  .gs-toolbar {
    gap: 5px;
    padding: 0 4px;

    button {
      padding: 4px 8px;
      font-size: 12px;
      display: none;
    }

    button:nth-child(1),
    button:nth-child(2) {
      display: inline-flex;
    }

    button.advance-btn {
      display: inline-flex;
    }
  }
}
</style>
