<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue"
import type { LeagueMatchday } from "@/modules/tournament/types"
import type { Team } from "@/modules/teams/types"
import { useGradualSim } from "@/modules/tournament/composables/useGradualSim"
import LeagueMatchRow from "./LeagueMatchRow.vue"
import LeagueMatchdayNav from "./LeagueMatchdayNav.vue"

const props = defineProps<{
  matchdays: LeagueMatchday[]
  teams: Team[]
  tournamentId: string
}>()

const emit = defineEmits<{
  setResult: [matchdayIdx: number, matchIdx: number, home: number, away: number]
  simMatch: [matchdayIdx: number, matchIdx: number]
}>()

/** Open on the first matchday that still has fixtures to play. */
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
const doneFlags = computed(() =>
  props.matchdays.map((md) => md.matches.every((m) => m.result !== null))
)

function teamById(id: string) {
  return props.teams.find((t) => t.id === id)
}

// ── Score entry ─────────────────────────────────────────────
// The target is tracked separately from the drafted scores so the inputs can be
// bound unconditionally, even while no row is open.
const editing = ref<{ mdIdx: number; mIdx: number } | null>(null)
const editHome = ref("")
const editAway = ref("")

watch(editing, (val) => {
  if (!val) return
  nextTick(() => {
    const input = document.querySelector<HTMLInputElement>(".lv-score-input")
    input?.focus()
    input?.select()
  })
})

function startEdit(mIdx: number, curHome: number | null, curAway: number | null) {
  editHome.value = curHome != null ? String(curHome) : ""
  editAway.value = curAway != null ? String(curAway) : ""
  editing.value = { mdIdx: activeIdx.value, mIdx }
}

function commitEdit() {
  if (!editing.value) return
  const h = parseInt(editHome.value)
  const a = parseInt(editAway.value)
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

function isEditing(mIdx: number) {
  return editing.value?.mdIdx === activeIdx.value && editing.value?.mIdx === mIdx
}

// ── Matchday simulation ─────────────────────────────────────
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

  // Jump to the next matchday that still has fixtures left.
  const next = props.matchdays.findIndex((m, i) => i > idx && m.matches.some((mm) => !mm.result))
  if (next !== -1) activeIdx.value = next
}
</script>

<template>
  <div class="lv-right">
    <LeagueMatchdayNav
      :title="activeMatchday?.name ?? ''"
      :is-first="activeIdx === 0"
      :is-last="activeIdx === matchdays.length - 1"
      :done="doneFlags[activeIdx] ?? false"
      :done-flags="doneFlags"
      :active-idx="activeIdx"
      @prev="activeIdx--"
      @next="activeIdx++"
      @select="(idx) => (activeIdx = idx)"
      @sim-matchday="handleSimMatchday(activeIdx)"
    >
      <div class="lv-matches">
        <LeagueMatchRow
          v-for="(match, mIdx) in activeMatchday?.matches ?? []"
          :key="match.id"
          v-model:home="editHome"
          v-model:away="editAway"
          :home-team="teamById(match.homeId)"
          :away-team="teamById(match.awayId)"
          :result="match.result"
          :editing="isEditing(mIdx)"
          @edit="startEdit(mIdx, match.result?.home ?? null, match.result?.away ?? null)"
          @commit="commitEdit"
          @cancel="cancelEdit"
          @sim="emit('simMatch', activeIdx, mIdx)"
        />
      </div>
    </LeagueMatchdayNav>
  </div>
</template>

<style scoped>
.lv-right {
  min-width: 0;
}

.lv-matches {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: var(--sp-3);
}
</style>
