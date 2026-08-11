<script setup lang="ts">
import { ref, computed } from "vue"
import type { Team } from "@/modules/teams/types"
import type { Tournament } from "@/modules/tournament/types"
import { Lock } from "@lucide/vue"
import { useGradualSim } from "../composables/useGradualSim"
import { GroupCard, GroupLegend, GroupSimToolbar } from "./group"

const props = defineProps<{
  tournament: Tournament
  teams: Team[]
}>()

const emit = defineEmits<{
  setResult: [groupIdx: number, matchIdx: number, home: number, away: number]
  clearResult: [groupIdx: number, matchIdx: number]
  simMatch: [groupIdx: number, matchIdx: number]
  simGroup: [groupIdx: number]
  simGroupWeek: [groupIdx: number]
  simAll: []
  simWeek: []
  advance: []
}>()

const { runSequential } = useGradualSim()
const locked = computed(() => !!props.tournament.groupsDone)

const selectedRound = ref<number[]>([])

function roundOf(gi: number): number {
  return selectedRound.value[gi] ?? 0
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

const allDone = computed(
  () => props.tournament.groups?.every((g) => g.matches.every((m) => m.result !== null)) ?? false
)
</script>

<template>
  <div class="gs-wrap">
    <div v-if="locked" class="gs-locked-notice">
      <Lock :size="14" />
      Group stage complete — results are locked. Switch to the Knockout tab to continue.
    </div>

    <GroupSimToolbar
      v-else
      :groups="tournament.groups ?? []"
      :all-done="allDone"
      @sim-week="handleSimWeek"
      @sim-all="handleSimAll"
      @sim-group="handleSimGroup"
      @advance="emit('advance')"
    />

    <div class="gs-groups">
      <GroupCard
        v-for="(group, gi) in tournament.groups"
        :key="gi"
        :group="group"
        :teams="teams"
        :locked="locked"
        :qualifiers-per-group="tournament.qualifiersPerGroup ?? 2"
        :wildcard-count="tournament.wildcardCount ?? 0"
        :round="roundOf(gi)"
        @update:round="(r) => (selectedRound[gi] = r)"
        @sim-match="(mi) => emit('simMatch', gi, mi)"
        @sim-group-week="handleSimGroupWeek(gi)"
        @set-result="(mi, h, a) => emit('setResult', gi, mi, h, a)"
        @clear-result="(mi) => emit('clearResult', gi, mi)"
      />
    </div>

    <GroupLegend :wildcard-count="tournament.wildcardCount ?? 0" />
  </div>
</template>

<style scoped>
.gs-wrap {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

.gs-locked-notice {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  font-size: var(--fs-sm);
  color: var(--text-muted);
  background: var(--bg);
  border: 1px solid var(--border-light);
  border-left: 3px solid var(--accent);
  border-radius: var(--radius);
  padding: var(--sp-2) var(--sp-3);
}

.gs-groups {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(320px, 100%), 1fr));
  gap: var(--sp-3);
}

@media (max-width: 600px) {
  .gs-groups {
    grid-template-columns: 1fr;
  }
}
</style>
