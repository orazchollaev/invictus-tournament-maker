<script setup lang="ts">
import { computed } from "vue"
import type { League, Tournament } from "@/modules/tournament/types"
import type { Team } from "@/modules/teams/types"
import LeagueStandingsTable from "./LeagueStandingsTable.vue"

const props = defineProps<{
  tournament: Tournament
  teams: Team[]
  leagueOverride?: League
  relegationCountOverride?: number
  promotionCount?: number
  playoffQualifierCount?: number
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
</script>

<template>
  <div class="lv-root">
    <LeagueStandingsTable
      :standings="standings"
      :teams="teams"
      :is-finished="isFinished"
      :played-matchdays="playedMatchdays"
      :total-matchdays="totalMatchdays"
      :promotion-count="promotionCount"
      :playoff-qualifier-count="playoffQualifierCount"
      :relegation-count="relegationCount"
    />
  </div>
</template>

<style scoped>
.lv-root {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}
</style>
