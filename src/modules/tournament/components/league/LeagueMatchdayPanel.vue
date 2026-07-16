<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue"
import type { LeagueMatchday } from "@/modules/tournament/types"
import type { Team } from "@/modules/teams/types"
import { Zap, ChevronLeft, ChevronRight } from "@lucide/vue"
import { useGradualSim } from "@/modules/tournament/composables/useGradualSim"
import TeamBadge from "@/modules/teams/components/TeamBadge.vue"

const props = defineProps<{
  matchdays: LeagueMatchday[]
  teams: Team[]
  tournamentId: string
}>()

const emit = defineEmits<{
  setResult: [matchdayIdx: number, matchIdx: number, home: number, away: number]
  simMatch: [matchdayIdx: number, matchIdx: number]
}>()

function firstUnplayedIdx() {
  const idx = props.matchdays.findIndex((md) => md.matches.some((m) => !m.result))
  return idx === -1 ? Math.max(0, props.matchdays.length - 1) : idx
}

const activeIdx = ref(firstUnplayedIdx())

watch(
  () => props.tournamentId,
  () => {
    activeIdx.value = firstUnplayedIdx()
  }
)

const activeMatchday = computed(() => props.matchdays[activeIdx.value])
const isFirstMatchday = computed(() => activeIdx.value === 0)
const isLastMatchday = computed(() => activeIdx.value === props.matchdays.length - 1)

function teamById(id: string) {
  return props.teams.find((t) => t.id === id)
}

function matchdayDone(idx: number) {
  return props.matchdays[idx]?.matches.every((m) => m.result !== null) ?? false
}

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
  const md = props.matchdays[idx]
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
  const next = props.matchdays.findIndex((m, i) => i > idx && m.matches.some((mm) => !mm.result))
  if (next !== -1) activeIdx.value = next
}
</script>

<template>
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
      <div v-for="(match, mIdx) in activeMatchday?.matches ?? []" :key="match.id" class="lv-match">
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
          <button class="lv-sim-btn" title="Simulate" @click="emit('simMatch', activeIdx, mIdx)">
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
</template>

<style scoped>
.lv-right {
  min-width: 0;
}

/* ─── Matchday nav ─── */
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
  padding-bottom: 2px;
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

@media (max-width: 640px) {
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
