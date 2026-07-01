<script setup lang="ts">
import { ref, computed } from "vue"
import type { Tournament, League } from "../types"
import type { Team } from "@/modules/teams/types"
import { useTournamentStats } from "../composables/useTournamentStats"
import LeagueProgressChart from "./LeagueProgressChart.vue"
import FlagCircle from "@/modules/teams/components/FlagCircle.vue"

const props = defineProps<{
  tournament: Tournament
  teams: Team[]
}>()

const { topScorers, bestDefense, hasStats } = useTournamentStats(
  () => props.tournament,
  () => props.teams
)

const isLeague = computed(() => props.tournament.format === "league")
const isGroupBracket = computed(() => props.tournament.format === "group+bracket")
const isMultiTier = computed(() => (props.tournament.tiers?.length ?? 0) > 1)

const activeIdx = ref(0)

// Convert a flat group matches array into League-like matchdays for the chart
function groupToLeague(groupIdx: number): League | undefined {
  const group = props.tournament.groups?.[groupIdx]
  if (!group) return undefined
  const n = group.teamIds.length
  const mpr = Math.max(1, Math.floor(n / 2))
  const matchdays = []
  for (let i = 0; i < group.matches.length; i += mpr) {
    matchdays.push({
      name: `Round ${Math.floor(i / mpr) + 1}`,
      matches: group.matches.slice(i, i + mpr),
    })
  }
  return { matchdays, standings: group.standings, legMode: "single" }
}

const activeLeague = computed<League | undefined>(() => {
  if (isLeague.value) {
    if (isMultiTier.value && props.tournament.tiers)
      return props.tournament.tiers[activeIdx.value]?.league
    return props.tournament.league
  }
  if (isGroupBracket.value) return groupToLeague(activeIdx.value)
  return undefined
})

const showChart = computed(() => isLeague.value || isGroupBracket.value)

const tabs = computed(() => {
  if (isLeague.value && isMultiTier.value && props.tournament.tiers)
    return props.tournament.tiers.map((t) => t.name)
  if (isGroupBracket.value && props.tournament.groups)
    return props.tournament.groups.map((g) => g.name)
  return []
})

const chartTitle = computed(() => {
  if (isLeague.value && isMultiTier.value && props.tournament.tiers)
    return (props.tournament.tiers[activeIdx.value]?.name ?? "League") + " — Standings Progress"
  if (isGroupBracket.value && props.tournament.groups)
    return (props.tournament.groups[activeIdx.value]?.name ?? "Group") + " — Standings Progress"
  return "Standings Progress"
})
</script>

<template>
  <div v-if="hasStats" class="stats-wrap">
    <!-- League / Group progress chart -->
    <template v-if="showChart && activeLeague">
      <div v-if="tabs.length > 1" class="tier-tabs">
        <button
          v-for="(tab, ti) in tabs"
          :key="ti"
          class="tier-tab"
          :class="{ active: activeIdx === ti }"
          @click="activeIdx = ti"
        >
          {{ tab }}
        </button>
      </div>
      <LeagueProgressChart
        :key="activeIdx"
        :league="activeLeague"
        :teams="teams"
        :title="chartTitle"
      />
    </template>

    <div class="stats-grid">
      <!-- Top Scorers -->
      <div class="stats-panel">
        <div class="stats-panel-header">Top Scorers</div>
        <table class="stats-table">
          <thead>
            <tr>
              <th class="col-rank">#</th>
              <th class="col-team">Team</th>
              <th title="Goals For">GF</th>
              <th title="Goals Against">GA</th>
              <th title="Matches Played">MP</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(s, i) in topScorers" :key="s.teamId">
              <td class="col-rank">{{ i + 1 }}</td>
              <td class="col-team">
                <span class="team-cell">
                  <FlagCircle v-if="s.flag" :code="s.flag" :size="14" />
                  <span v-else class="dot" :style="{ background: s.color }" />
                  {{ s.name }}
                </span>
              </td>
              <td class="col-highlight">{{ s.gf }}</td>
              <td class="col-muted">{{ s.ga }}</td>
              <td class="col-muted">{{ s.played }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Best Defense -->
      <div class="stats-panel">
        <div class="stats-panel-header">Best Defense</div>
        <table class="stats-table">
          <thead>
            <tr>
              <th class="col-rank">#</th>
              <th class="col-team">Team</th>
              <th title="Goals Against">GA</th>
              <th title="Goals For">GF</th>
              <th title="Matches Played">MP</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(s, i) in bestDefense" :key="s.teamId">
              <td class="col-rank">{{ i + 1 }}</td>
              <td class="col-team">
                <span class="team-cell">
                  <FlagCircle v-if="s.flag" :code="s.flag" :size="14" />
                  <span v-else class="dot" :style="{ background: s.color }" />
                  {{ s.name }}
                </span>
              </td>
              <td class="col-highlight">{{ s.ga }}</td>
              <td class="col-muted">{{ s.gf }}</td>
              <td class="col-muted">{{ s.played }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stats-wrap {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 8px;
}

.tier-tabs {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.tier-tab {
  font-size: 11px;
  padding: 3px 10px;
  border-radius: var(--radius);
  border: 1px solid var(--border-light);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.15s;
}

.tier-tab.active {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.stats-panel {
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  overflow: hidden;
  background: var(--surface);
}

.stats-panel-header {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  padding: 7px 10px;
  background: var(--bg);
  border-bottom: 1px solid var(--border-light);
  color: var(--text-muted);
  border-left: 3px solid var(--accent);
}

.stats-table {
  border-collapse: collapse;
  width: 100%;
  font-size: 12px;
}

.stats-table th,
.stats-table td {
  border: none;
  border-bottom: 1px solid var(--border-light);
  padding: 4px 6px;
  text-align: center;
}

.stats-table tbody tr:last-child td {
  border-bottom: none;
}

.stats-table th {
  background: var(--bg);
  font-weight: 600;
  font-size: 11px;
  color: var(--text-muted);
}

.col-rank {
  width: 18px;
  color: var(--text-muted);
  font-size: 11px;
}

.col-team {
  text-align: left;
  min-width: 110px;
}

.col-highlight {
  font-weight: 700;
  color: var(--accent);
}

.col-muted {
  color: var(--text-muted);
}

.team-cell {
  display: flex;
  align-items: center;
  gap: 6px;
}

.dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

@media (max-width: 600px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
