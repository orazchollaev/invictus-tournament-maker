<script setup lang="ts">
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import type { League, Tournament } from "@/modules/tournament/types"
import type { Team } from "@/modules/teams/types"
import { LeagueMatchdayPanel, LeagueStandingsTable } from "./league"
import { SubTabBar } from "@/components/ui"

const { t } = useI18n()

const props = defineProps<{
  tournament: Tournament
  teams: Team[]
  leagueOverride?: League
  relegationCountOverride?: number
  promotionCount?: number
  playoffQualifierCount?: number
  /** True once the league playoff bracket has started — this tier's own
   *  matches are frozen, same as a finished group stage. */
  locked?: boolean
}>()

defineEmits<{
  setResult: [matchdayIdx: number, matchIdx: number, home: number, away: number]
  clearResult: [matchdayIdx: number, matchIdx: number]
  simMatch: [matchdayIdx: number, matchIdx: number]
  simMatchday: [matchdayIdx: number]
  simAll: []
}>()

const league = computed(() => props.leagueOverride ?? props.tournament.league!)
const matchdays = computed(() => league.value.matchdays)
const standings = computed(() => league.value.standings)
const relegationCount = computed(() => props.relegationCountOverride ?? 0)
const isFinished = computed(() => !!props.tournament.winnerId)

function matchdayDone(idx: number) {
  return matchdays.value[idx]?.matches.every((m) => m.result !== null) ?? false
}

const totalMatchdays = computed(() => matchdays.value.length)
const playedMatchdays = computed(() => matchdays.value.filter((_, i) => matchdayDone(i)).length)

const subTab = ref<"standings" | "fixtures">("standings")
</script>

<template>
  <div class="lv-root">
    <div class="lv-subtab-row">
      <SubTabBar
        v-model="subTab"
        :options="[
          { value: 'standings', label: t('tournament.tabs.standings') },
          { value: 'fixtures', label: t('tournament.tabs.fixtures') },
        ]"
      />
    </div>
    <LeagueStandingsTable
      v-if="subTab === 'standings'"
      :standings="standings"
      :teams="teams"
      :is-finished="isFinished"
      :played-matchdays="playedMatchdays"
      :total-matchdays="totalMatchdays"
      :promotion-count="promotionCount"
      :playoff-qualifier-count="playoffQualifierCount"
      :relegation-count="relegationCount"
    />
    <LeagueMatchdayPanel
      v-else
      :matchdays="matchdays"
      :teams="teams"
      :tournament-id="tournament.id"
      :locked="locked"
      @set-result="(md, m, h, a) => $emit('setResult', md, m, h, a)"
      @clear-result="(md, m) => $emit('clearResult', md, m)"
      @sim-match="(md, m) => $emit('simMatch', md, m)"
    />
  </div>
</template>

<style scoped>
.lv-root {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

.lv-subtab-row {
  margin-bottom: var(--sp-1);
}
</style>
