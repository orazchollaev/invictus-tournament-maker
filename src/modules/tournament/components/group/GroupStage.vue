<script setup lang="ts">
import { ref, computed } from "vue"
import type { Team } from "@/modules/teams/types"
import type { Tournament } from "@/modules/tournament/types"
import { useGradualSim } from "@/modules/tournament/composables/useGradualSim"
import GroupCard from "./GroupCard.vue"
import GroupLegend from "./GroupLegend.vue"
import GroupSimToolbar from "./GroupSimToolbar.vue"

const props = withDefaults(
  defineProps<{
    tournament: Tournament
    teams: Team[]
    /** Groups tab shows standings only; Fixtures tab shows matches only. */
    section?: "standings" | "fixtures"
  }>(),
  { section: "standings" }
)

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

/** Round of the first unplayed match in the group, mirroring the league's
 *  "open on first unplayed matchday" — so leaving and returning to the tab
 *  lands on the current round instead of resetting to round 1. */
function firstUnplayedRoundOf(gi: number): number {
  const group = props.tournament.groups?.[gi]
  if (!group) return 0
  const mpr = Math.floor(group.teamIds.length / 2)
  if (mpr < 1) return 0
  const first = group.matches.findIndex((m) => !m.result)
  if (first === -1) return Math.max(0, Math.ceil(group.matches.length / mpr) - 1)
  return Math.floor(first / mpr)
}

function roundOf(gi: number): number {
  return selectedRound.value[gi] ?? firstUnplayedRoundOf(gi)
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
    <GroupSimToolbar
      v-if="section === 'fixtures' && !locked"
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
        :section="section"
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

    <GroupLegend v-if="section === 'standings'" :wildcard-count="tournament.wildcardCount ?? 0" />
  </div>
</template>

<style scoped>
.gs-wrap {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
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
