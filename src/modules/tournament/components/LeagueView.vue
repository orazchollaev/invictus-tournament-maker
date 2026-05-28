<script setup lang="ts">
import { ref, computed } from "vue"
import type { Tournament } from "@/modules/tournament/types"
import type { Team } from "@/modules/teams/types"
import { Trophy, Zap, ChevronLeft, ChevronRight } from "lucide-vue-next"

const props = defineProps<{
  tournament: Tournament
  teams: Team[]
}>()

const emit = defineEmits<{
  setResult: [matchdayIdx: number, matchIdx: number, home: number, away: number]
  simMatch: [matchdayIdx: number, matchIdx: number]
  simMatchday: [matchdayIdx: number]
  simAll: []
}>()

const league = computed(() => props.tournament.league!)
const matchdays = computed(() => league.value.matchdays)
const standings = computed(() => league.value.standings)

const currentMatchdayIdx = ref(() => {
  const idx = matchdays.value.findIndex((md) => md.matches.some((m) => !m.result))
  return idx === -1 ? Math.max(0, matchdays.value.length - 1) : idx
})

// Flatten to a plain ref
const activeIdx = ref(
  (() => {
    const idx = matchdays.value.findIndex((md) => md.matches.some((m) => !m.result))
    return idx === -1 ? Math.max(0, matchdays.value.length - 1) : idx
  })()
)

const activeMatchday = computed(() => matchdays.value[activeIdx.value])
const isFirstMatchday = computed(() => activeIdx.value === 0)
const isLastMatchday = computed(() => activeIdx.value === matchdays.value.length - 1)
const isFinished = computed(() => !!props.tournament.winnerId)

function teamById(id: string) {
  return props.teams.find((t) => t.id === id)
}

function matchdayDone(idx: number) {
  return matchdays.value[idx]?.matches.every((m) => m.result !== null) ?? false
}

// Result input state
const editing = ref<{ mdIdx: number; mIdx: number; home: string; away: string } | null>(null)

function startEdit(mdIdx: number, mIdx: number, curHome: number | null, curAway: number | null) {
  editing.value = {
    mdIdx,
    mIdx,
    home: curHome != null ? String(curHome) : "",
    away: curAway != null ? String(curAway) : "",
  }
}

function commitEdit() {
  if (!editing.value) return
  const h = parseInt(editing.value.home)
  const a = parseInt(editing.value.away)
  if (isNaN(h) || isNaN(a) || h < 0 || a < 0) {
    editing.value = null
    return
  }
  emit("setResult", editing.value.mdIdx, editing.value.mIdx, h, a)
  editing.value = null
}

function cancelEdit() {
  editing.value = null
}

const totalMatchdays = computed(() => matchdays.value.length)
const playedMatchdays = computed(
  () => matchdays.value.filter((md) => matchdayDone(matchdays.value.indexOf(md))).length
)
</script>

<template>
  <div class="lv-root">
    <!-- Champion banner -->
    <Transition name="fade">
      <div
        v-if="isFinished && tournament.winnerId"
        class="lv-champion"
        :style="{ '--c': teamById(tournament.winnerId)?.color ?? '#888' }"
      >
        <Trophy :size="16" />
        <span class="lv-champion-name">{{ teamById(tournament.winnerId)?.name }}</span>
        <span class="lv-champion-label">Champion</span>
      </div>
    </Transition>

    <!-- Two-column layout -->
    <div class="lv-layout">
      <!-- LEFT: Standings table -->
      <div class="lv-left">
        <div class="lv-section-title">
          League Table
          <span class="lv-progress">{{ playedMatchdays }}/{{ totalMatchdays }} matchdays</span>
        </div>
        <div class="lv-table-wrap">
          <table class="lv-table">
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
                <th title="Points" class="col-pts">Pts</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, rank) in standings"
                :key="row.teamId"
                :class="{ 'lv-row--champion': rank === 0 && isFinished }"
              >
                <td class="col-rank">
                  <span v-if="rank === 0 && isFinished" class="lv-crown">🏆</span>
                  <span v-else>{{ rank + 1 }}</span>
                </td>
                <td class="col-team">
                  <span
                    class="lv-team-dot"
                    :style="{ background: teamById(row.teamId)?.color ?? '#888' }"
                  />
                  <span class="lv-team-name">{{ teamById(row.teamId)?.name ?? row.teamId }}</span>
                </td>
                <td>{{ row.played }}</td>
                <td>{{ row.won }}</td>
                <td>{{ row.drawn }}</td>
                <td>{{ row.lost }}</td>
                <td>{{ row.gf }}</td>
                <td>{{ row.ga }}</td>
                <td :class="{ 'gd-pos': row.gd > 0, 'gd-neg': row.gd < 0 }">
                  {{ row.gd > 0 ? "+" : "" }}{{ row.gd }}
                </td>
                <td class="col-pts">
                  <strong>{{ row.pts }}</strong>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- RIGHT: Matchday view -->
      <div class="lv-right">
        <!-- Matchday nav -->
        <div class="lv-md-nav">
          <button :disabled="isFirstMatchday" class="lv-nav-btn" @click="activeIdx--">
            <ChevronLeft :size="14" />
          </button>
          <span class="lv-md-title">
            {{ activeMatchday?.name ?? "" }}
            <span v-if="matchdayDone(activeIdx)" class="lv-done-badge">✓</span>
          </span>
          <button :disabled="isLastMatchday" class="lv-nav-btn" @click="activeIdx++">
            <ChevronRight :size="14" />
          </button>
          <button
            v-if="!matchdayDone(activeIdx)"
            class="lv-sim-md-btn"
            @click="emit('simMatchday', activeIdx)"
          >
            <Zap :size="12" />
            Simulate
          </button>
        </div>

        <!-- Matches -->
        <div class="lv-matches">
          <div
            v-for="(match, mIdx) in activeMatchday?.matches ?? []"
            :key="match.id"
            class="lv-match"
          >
            <!-- Editing mode -->
            <template v-if="editing?.mdIdx === activeIdx && editing?.mIdx === mIdx">
              <span class="lv-match-team lv-match-team--home">
                {{ teamById(match.homeId)?.name }}
              </span>
              <input v-model="editing.home" class="lv-score-input" type="number" min="0" max="20" />
              <span class="lv-match-sep">–</span>
              <input
                v-model="editing.away"
                class="lv-score-input"
                type="number"
                min="0"
                max="20"
                @keyup.enter="commitEdit"
                @keyup.escape="cancelEdit"
              />
              <span class="lv-match-team lv-match-team--away">
                {{ teamById(match.awayId)?.name }}
              </span>
              <div class="lv-match-actions">
                <button class="primary lv-btn-xs" @click="commitEdit">✓</button>
                <button class="lv-btn-xs" @click="cancelEdit">✕</button>
              </div>
            </template>

            <!-- Result / unplayed -->
            <template v-else>
              <span
                class="lv-match-team lv-match-team--home"
                :class="{ 'lv-winner': match.result && match.result.home > match.result.away }"
              >
                {{ teamById(match.homeId)?.name }}
              </span>
              <button
                class="lv-score-btn"
                :class="{ 'lv-score-btn--played': !!match.result }"
                @click="
                  startEdit(activeIdx, mIdx, match.result?.home ?? null, match.result?.away ?? null)
                "
              >
                <template v-if="match.result">
                  {{ match.result.home }} – {{ match.result.away }}
                </template>
                <template v-else>vs</template>
              </button>
              <span
                class="lv-match-team lv-match-team--away"
                :class="{ 'lv-winner': match.result && match.result.away > match.result.home }"
              >
                {{ teamById(match.awayId)?.name }}
              </span>
              <div class="lv-match-actions">
                <button
                  v-if="!match.result"
                  class="lv-btn-xs lv-sim-btn"
                  title="Simulate"
                  @click="emit('simMatch', activeIdx, mIdx)"
                >
                  <Zap :size="11" />
                </button>
              </div>
            </template>
          </div>
        </div>

        <!-- Matchday pills -->
        <div class="lv-md-pills">
          <button
            v-for="(md, idx) in matchdays"
            :key="idx"
            class="lv-pill"
            :class="{ active: idx === activeIdx, done: matchdayDone(idx) }"
            @click="activeIdx = idx"
          >
            {{ idx + 1 }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lv-root {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.lv-champion {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: color-mix(in srgb, var(--c) 10%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--c) 40%, transparent);
  border-radius: var(--radius);
  color: var(--c);
  font-weight: 700;
}
.lv-champion-name {
  font-size: 15px;
}
.lv-champion-label {
  font-size: 11px;
  font-weight: 400;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  opacity: 0.7;
  margin-left: 4px;
}

.lv-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  align-items: start;
}

.lv-section-title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.lv-progress {
  font-size: 10px;
  font-weight: 400;
  text-transform: none;
  letter-spacing: 0;
}

/* ─── Table ─── */
.lv-table-wrap {
  overflow-x: auto;
}
.lv-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.lv-table th {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  padding: 4px 6px;
  text-align: right;
  border-bottom: 1px solid var(--border-light);
  white-space: nowrap;
}
.lv-table td {
  padding: 5px 6px;
  text-align: right;
  border-bottom: 1px solid var(--border-light);
  color: var(--text);
}
.col-rank {
  text-align: center !important;
  width: 24px;
  color: var(--text-muted) !important;
  font-size: 11px !important;
}
.col-team {
  text-align: left !important;
  min-width: 90px;
}
.col-pts {
  min-width: 32px;
}
.lv-team-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  margin-right: 5px;
  flex-shrink: 0;
}
.lv-team-name {
  font-size: 12px;
}
.lv-row--champion td {
  background: color-mix(in srgb, var(--accent) 6%, var(--surface));
}
.lv-crown {
  font-size: 11px;
}
.gd-pos {
  color: color-mix(in srgb, var(--accent) 80%, var(--text));
}
.gd-neg {
  color: var(--danger);
}

/* ─── Matchday ─── */
.lv-md-nav {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}
.lv-nav-btn {
  display: flex;
  align-items: center;
  padding: 3px 5px;
  border-color: var(--border-light);
  color: var(--text-muted);
}
.lv-nav-btn:not(:disabled):hover {
  color: var(--text);
  border-color: var(--border);
}
.lv-md-title {
  font-size: 13px;
  font-weight: 700;
  flex: 1;
  text-align: center;
}
.lv-done-badge {
  font-size: 11px;
  color: var(--accent);
  margin-left: 4px;
}
.lv-sim-md-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  padding: 3px 8px;
  border-color: color-mix(in srgb, var(--accent) 40%, transparent);
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 8%, var(--surface));
}
.lv-sim-md-btn:hover {
  background: color-mix(in srgb, var(--accent) 16%, var(--surface));
}

.lv-matches {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 12px;
}
.lv-match {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  background: var(--bg);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  font-size: 12px;
  min-height: 34px;
}
.lv-match-team {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-muted);
}
.lv-match-team--home {
  text-align: right;
}
.lv-match-team--away {
  text-align: left;
}
.lv-winner {
  color: var(--text);
  font-weight: 600;
}
.lv-score-btn {
  min-width: 44px;
  padding: 2px 6px;
  text-align: center;
  font-size: 12px;
  font-weight: 700;
  border-color: var(--border-light);
  color: var(--text-muted);
  font-family: var(--font-ui);
}
.lv-score-btn--played {
  color: var(--text);
  border-color: var(--border);
}
.lv-score-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}
.lv-match-sep {
  font-weight: 700;
  color: var(--text-muted);
}
.lv-score-input {
  width: 36px;
  text-align: center;
  padding: 2px 4px;
  font-size: 12px;
  font-weight: 700;
}
.lv-match-actions {
  display: flex;
  gap: 3px;
  flex-shrink: 0;
}
.lv-btn-xs {
  padding: 2px 5px;
  font-size: 11px;
  line-height: 1.4;
}
.lv-sim-btn {
  color: var(--text-muted);
  border-color: transparent;
  display: inline-flex;
  align-items: center;
}
.lv-sim-btn:hover {
  color: var(--accent);
  border-color: var(--accent);
}

/* ─── Matchday pills ─── */
.lv-md-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.lv-pill {
  min-width: 26px;
  height: 26px;
  padding: 0 4px;
  font-size: 11px;
  border-color: var(--border-light);
  color: var(--text-muted);
  border-radius: var(--radius);
}
.lv-pill.done {
  color: var(--accent);
  border-color: color-mix(in srgb, var(--accent) 40%, transparent);
  background: color-mix(in srgb, var(--accent) 6%, var(--surface));
}
.lv-pill.active {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 15%, var(--surface));
  color: var(--accent);
  font-weight: 700;
}

/* fade transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 700px) {
  .lv-layout {
    grid-template-columns: 1fr;
  }
}
</style>
