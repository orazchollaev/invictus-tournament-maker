<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue"
import type { League, Tournament } from "@/modules/tournament/types"
import type { Team } from "@/modules/teams/types"
import { Zap, ChevronLeft, ChevronRight } from "@lucide/vue"
import { useGradualSim } from "@/modules/tournament/composables/useGradualSim"
import TeamBadge from "@/modules/teams/components/TeamBadge.vue"

const props = defineProps<{
  tournament: Tournament
  teams: Team[]
  leagueOverride?: League
  relegationCountOverride?: number
  promotionCount?: number
  playoffQualifierCount?: number
}>()

const emit = defineEmits<{
  setResult: [matchdayIdx: number, matchIdx: number, home: number, away: number]
  simMatch: [matchdayIdx: number, matchIdx: number]
  simMatchday: [matchdayIdx: number]
  simAll: []
}>()

const league = computed(() => props.leagueOverride ?? props.tournament.league!)
const matchdays = computed(() => league.value.matchdays)
const standings = computed(() => league.value.standings)
const relegationCount = computed(
  () => props.relegationCountOverride ?? props.tournament.relegationCount ?? 0
)

function isRelegated(rank: number) {
  return relegationCount.value > 0 && rank >= standings.value.length - relegationCount.value
}

function isFirstRelegated(rank: number) {
  return relegationCount.value > 0 && rank === standings.value.length - relegationCount.value
}

function isPromoted(rank: number) {
  return (props.promotionCount ?? 0) > 0 && rank < (props.promotionCount ?? 0)
}

function isLastPromoted(rank: number) {
  return (props.promotionCount ?? 0) > 0 && rank === (props.promotionCount ?? 0) - 1
}

const playoffCount = computed(() => props.playoffQualifierCount ?? 0)

function isPlayoffQualifier(rank: number) {
  return playoffCount.value > 0 && rank < playoffCount.value
}

function isLastPlayoffQualifier(rank: number) {
  return playoffCount.value > 0 && rank === playoffCount.value - 1
}

function firstUnplayedIdx() {
  const idx = matchdays.value.findIndex((md) => md.matches.some((m) => !m.result))
  return idx === -1 ? Math.max(0, matchdays.value.length - 1) : idx
}

const activeIdx = ref(firstUnplayedIdx())

watch(
  () => props.tournament.id,
  () => {
    activeIdx.value = firstUnplayedIdx()
  }
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

const totalMatchdays = computed(() => matchdays.value.length)
const playedMatchdays = computed(() => matchdays.value.filter((_, i) => matchdayDone(i)).length)

// Result input state
const editing = ref<{ mdIdx: number; mIdx: number; home: string; away: string } | null>(null)

watch(editing, (val) => {
  if (!val) return
  nextTick(() => {
    const input = document.querySelector<HTMLInputElement>(".lv-score-input")
    input?.focus()
    input?.select()
  })
})

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

const { runSequential } = useGradualSim()

async function handleSimMatchday(idx: number) {
  const md = matchdays.value[idx]
  if (!md) return
  const cbs = md.matches
    .map((m, mi) => ({ m, mi }))
    .filter(({ m }) => !m.result)
    .map(
      ({ mi }) =>
        () =>
          emit("simMatch", idx, mi)
    )
  await runSequential(cbs)
  const next = matchdays.value.findIndex((m, i) => i > idx && m.matches.some((mm) => !mm.result))
  if (next !== -1) activeIdx.value = next
}
</script>

<template>
  <div class="lv-root">
    <div class="lv-layout">
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
            <TransitionGroup tag="tbody" name="standing-row">
              <tr
                v-for="(row, rank) in standings"
                :key="row.teamId"
                :class="{
                  'lv-row--champion': rank === 0 && isFinished,
                  'lv-pos--1': rank === 0 && !props.promotionCount && !playoffCount,
                  'lv-pos--2': rank === 1 && !props.promotionCount && !playoffCount,
                  'lv-pos--3': rank === 2 && !props.promotionCount && !playoffCount,
                  'lv-pos--4': rank === 3 && !props.promotionCount && !playoffCount,
                  'lv-pos--playoff': isPlayoffQualifier(rank),
                  'lv-pos--playoff-last': isLastPlayoffQualifier(rank),
                  'lv-pos--promoted': isPromoted(rank),
                  'lv-pos--promoted-last': isLastPromoted(rank),
                  'lv-pos--relegated': isRelegated(rank),
                  'lv-pos--relegated-first': isFirstRelegated(rank),
                }"
              >
                <td class="col-rank">
                  <span v-if="rank === 0 && isFinished" class="lv-crown">🏆</span>
                  <span v-else>{{ rank + 1 }}</span>
                </td>
                <td class="col-team">
                  <TeamBadge
                    :team="teamById(row.teamId)"
                    :fallback="row.teamId"
                    class="lv-team-name"
                  />
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
            </TransitionGroup>
          </table>
        </div>
      </div>

      <div class="lv-right">
        <div class="lv-md-nav">
          <button :disabled="isFirstMatchday" class="lv-nav-btn" @click="activeIdx--">
            <ChevronLeft :size="13" />
          </button>
          <span class="lv-md-title">
            {{ activeMatchday?.name ?? "" }}
            <span v-if="matchdayDone(activeIdx)" class="lv-done-badge">✓</span>
          </span>
          <button :disabled="isLastMatchday" class="lv-nav-btn" @click="activeIdx++">
            <ChevronRight :size="13" />
          </button>
          <button
            v-if="!matchdayDone(activeIdx)"
            class="lv-sim-md-btn"
            title="Simulate matchday"
            @click="handleSimMatchday(activeIdx)"
          >
            <Zap :size="12" />
          </button>
        </div>

        <div class="lv-matches">
          <div
            v-for="(match, mIdx) in activeMatchday?.matches ?? []"
            :key="match.id"
            class="lv-match"
          >
            <template v-if="editing?.mdIdx === activeIdx && editing?.mIdx === mIdx">
              <TeamBadge :team="teamById(match.homeId)" class="lv-match-team lv-match-team--home" />
              <input
                v-model="editing.home"
                class="lv-score-input"
                type="number"
                min="0"
                max="20"
                @keyup.enter="commitEdit"
                @keyup.escape="cancelEdit"
              />
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
              <TeamBadge :team="teamById(match.awayId)" class="lv-match-team lv-match-team--away" />
              <button class="primary lv-btn-xs" @click="commitEdit">✓</button>
              <button class="lv-btn-xs" @click="cancelEdit">✕</button>
            </template>

            <template v-else>
              <TeamBadge
                :team="teamById(match.homeId)"
                :class="[
                  'lv-match-team lv-match-team--home',
                  { 'lv-winner': match.result && match.result.home > match.result.away },
                ]"
              />
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
              <TeamBadge
                :team="teamById(match.awayId)"
                :class="[
                  'lv-match-team lv-match-team--away',
                  { 'lv-winner': match.result && match.result.away > match.result.home },
                ]"
              />
              <button
                class="lv-sim-btn"
                title="Simulate"
                @click="emit('simMatch', activeIdx, mIdx)"
              >
                <Zap :size="10" />
              </button>
            </template>
          </div>
        </div>

        <!-- Matchday pills -->
        <div class="lv-md-pills">
          <button
            v-for="(_, idx) in matchdays"
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
.lv-left,
.lv-right {
  min-width: 0;
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
  vertical-align: middle;
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

/* ─── Position zone colors ─── */
.lv-pos--1 td:first-child {
  border-left: 3px solid var(--accent-2);
}
.lv-pos--2 td:first-child {
  border-left: 3px solid #3b82f6;
}
.lv-pos--3 td:first-child {
  border-left: 3px solid #8b5cf6;
}
.lv-pos--4 td:first-child {
  border-left: 3px solid var(--success);
}
.lv-pos--1 .col-rank {
  color: var(--accent-2) !important;
  font-weight: 700;
}
.lv-pos--2 .col-rank {
  color: #3b82f6 !important;
  font-weight: 600;
}
.lv-pos--3 .col-rank {
  color: #8b5cf6 !important;
  font-weight: 600;
}
.lv-pos--4 .col-rank {
  color: var(--success) !important;
  font-weight: 600;
}
.lv-pos--playoff td:first-child {
  border-left: 3px solid var(--accent-2);
}
.lv-pos--playoff .col-rank {
  color: var(--accent-2) !important;
  font-weight: 600;
}
.lv-pos--playoff-last td {
  border-bottom: 1px dashed color-mix(in srgb, var(--accent-2) 45%, transparent);
}

.lv-pos--promoted td:first-child {
  border-left: 3px solid var(--success);
}
.lv-pos--promoted .col-rank {
  color: var(--success) !important;
  font-weight: 600;
}
.lv-pos--promoted-last td {
  border-bottom: 1px dashed color-mix(in srgb, var(--success) 40%, transparent);
}
.lv-pos--relegated td:first-child {
  border-left: 3px solid var(--danger);
}
.lv-pos--relegated .col-rank {
  color: var(--danger) !important;
  font-weight: 600;
}
.lv-pos--relegated-first td {
  border-top: 1px dashed color-mix(in srgb, var(--danger) 40%, transparent);
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
  gap: 6px;
  margin-bottom: 8px;
}
.lv-nav-btn {
  display: flex;
  align-items: center;
  padding: 2px 4px;
  border-color: var(--border-light);
  color: var(--text-muted);
  flex-shrink: 0;
}
.lv-nav-btn:not(:disabled):hover {
  color: var(--text);
  border-color: var(--border);
}
.lv-md-title {
  font-size: 12px;
  font-weight: 700;
  flex: 1;
  text-align: center;
}
.lv-done-badge {
  font-size: 10px;
  color: var(--accent);
  margin-left: 3px;
}
.lv-sim-md-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 3px 6px;
  border-color: color-mix(in srgb, var(--accent) 35%, transparent);
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 8%, var(--surface));
}
.lv-sim-md-btn:hover {
  background: color-mix(in srgb, var(--accent) 16%, var(--surface));
}

.lv-matches {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 10px;
}
.lv-match {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  background: var(--bg);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  font-size: 11px;
  min-height: 28px;
  min-width: 0;
  overflow: hidden;
}

/* ─── Match team cells ─── */
.lv-match-team {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  color: var(--text-muted);
}
.lv-match-team .name {
  display: none !important;
}
.lv-match-team--home {
  flex-direction: row-reverse;
  justify-content: flex-end;
}
.lv-match-team--away {
  flex-direction: row;
  justify-content: flex-start;
}
.lv-match-team-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.lv-match-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}
.lv-winner {
  color: var(--text);
  font-weight: 600;
}
.lv-score-btn {
  min-width: 40px;
  padding: 1px 5px;
  text-align: center;
  font-size: 11px;
  font-weight: 700;
  border-color: var(--border-light);
  color: var(--text-muted);
  font-family: var(--font-ui);
  flex-shrink: 0;
  display: flex;
  justify-content: center;
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
  flex-shrink: 0;
}
.lv-score-input {
  width: 32px;
  text-align: center;
  padding: 1px 3px;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
}
.lv-btn-xs {
  padding: 1px 5px;
  font-size: 11px;
  line-height: 1.4;
  flex-shrink: 0;
}
.lv-sim-btn {
  color: var(--text-muted);
  border-color: transparent;
  background: transparent;
  display: inline-flex;
  align-items: center;
  padding: 2px 3px;
  flex-shrink: 0;
  opacity: 0.5;
}
.lv-sim-btn:hover {
  color: var(--accent);
  border-color: transparent;
  opacity: 1;
}

/* ─── Matchday pills ─── */
.lv-md-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  /* overflow-x: auto; */
  padding-bottom: 2px;
  /* scrollbar-width: thin; */
  /* scrollbar-color: var(--border-light) transparent; */
}
.lv-pill {
  min-width: 22px;
  height: 22px;
  padding: 0 3px;
  font-size: 10px;
  border-color: var(--border-light);
  color: var(--text-muted);
  border-radius: var(--radius);
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  align-items: center;
}
.lv-pill.done {
  color: var(--accent);
  border-color: color-mix(in srgb, var(--accent) 35%, transparent);
  background: color-mix(in srgb, var(--accent) 5%, var(--surface));
}
.lv-pill.active {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 14%, var(--surface));
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

@media (max-width: 640px) {
  .lv-table th:nth-child(5),
  .lv-table td:nth-child(5),
  .lv-table th:nth-child(6),
  .lv-table td:nth-child(6),
  .lv-table th:nth-child(7),
  .lv-table td:nth-child(7),
  .lv-table th:nth-child(8),
  .lv-table td:nth-child(8) {
    display: none;
  }

  .lv-match {
    font-size: 12px;
    padding: 4px 10px;
  }

  .lv-score-btn {
    min-width: 48px;
    padding: 4px 8px;
    font-size: 12px;
  }

  .lv-score-input {
    width: 40px;
    padding: 4px;
    font-size: 13px;
  }

  .lv-nav-btn {
    padding: 6px 10px;
  }

  .lv-sim-btn {
    padding: 5px 7px;
    opacity: 0.7;
  }
}
</style>
