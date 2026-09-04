<script setup lang="ts">
import { ref, computed, watch } from "vue"
import type { LeagueMatchday } from "@/modules/tournament/types"
import type { Team } from "@/modules/teams/types"
import { useGradualSim } from "@/modules/tournament/composables/useGradualSim"
import LeagueMatchRow from "./LeagueMatchRow.vue"
import LeagueMatchdayNav from "./LeagueMatchdayNav.vue"
import { useEngineLabels } from "@/composables/useEngineLabels"
import { AppCard } from "@/components/ui"

const props = defineProps<{
  matchdays: LeagueMatchday[]
  teams: Team[]
  tournamentId: string
  locked?: boolean
}>()

const emit = defineEmits<{
  setResult: [matchdayIdx: number, matchIdx: number, home: number, away: number]
  clearResult: [matchdayIdx: number, matchIdx: number]
  simMatch: [matchdayIdx: number, matchIdx: number]
}>()

const { engineLabel } = useEngineLabels()

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
  <AppCard variant="outlined" padding="md" class="lv-right">
    <LeagueMatchdayNav
      :title="engineLabel(activeMatchday?.name)"
      :is-first="activeIdx === 0"
      :is-last="activeIdx === matchdays.length - 1"
      :done="doneFlags[activeIdx] ?? false"
      :done-flags="doneFlags"
      :active-idx="activeIdx"
      :locked="locked"
      @prev="activeIdx--"
      @next="activeIdx++"
      @select="(idx) => (activeIdx = idx)"
      @sim-matchday="handleSimMatchday(activeIdx)"
    >
      <div class="lv-matches">
        <LeagueMatchRow
          v-for="(match, mIdx) in activeMatchday?.matches ?? []"
          :key="match.id"
          :home-team="teamById(match.homeId)"
          :away-team="teamById(match.awayId)"
          :result="match.result"
          :match-id="match.id"
          :label="engineLabel(activeMatchday?.name)"
          :locked="locked"
          @save="(h, a) => emit('setResult', activeIdx, mIdx, h, a)"
          @clear="emit('clearResult', activeIdx, mIdx)"
          @sim="emit('simMatch', activeIdx, mIdx)"
        />
      </div>
    </LeagueMatchdayNav>
  </AppCard>
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
