<script setup lang="ts">
import { computed } from "vue"
import type { League, Tournament } from "@/modules/tournament/types"
import type { Team } from "@/modules/teams/types"
import LeagueStandingsTable from "./league/LeagueStandingsTable.vue"
import LeagueMatchdayPanel from "./league/LeagueMatchdayPanel.vue"

const props = defineProps<{
  tournament: Tournament
  teams: Team[]
  leagueOverride?: League
  relegationCountOverride?: number
  promotionCount?: number
  playoffQualifierCount?: number
}>()

defineEmits<{
  setResult: [matchdayIdx: number, matchIdx: number, home: number, away: number]
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
</script>

<template>
  <div class="lv-root">
    <div class="lv-layout">
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
      <LeagueMatchdayPanel
        :matchdays="matchdays"
        :teams="teams"
        :tournament-id="tournament.id"
        @set-result="(md, m, h, a) => $emit('setResult', md, m, h, a)"
        @sim-match="(md, m) => $emit('simMatch', md, m)"
      />
    </div>
  </div>
</template>

<style scoped>
.lv-root {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.lv-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  align-items: start;
}

@media (max-width: 700px) {
  .lv-layout {
    grid-template-columns: 1fr;
  }
}
</style>
