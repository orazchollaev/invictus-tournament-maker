<script setup lang="ts">
import { ref, computed } from "vue"
import { useI18n } from "vue-i18n"
import type { Tournament, League } from "../types"
import type { Team } from "@/modules/teams/types"
import { useTournamentStats } from "../composables/useTournamentStats"
import LeagueProgressChart from "./LeagueProgressChart.vue"
import TeamBadge from "@/modules/teams/components/TeamBadge.vue"
import { AppCard, AppTable, BtnGroup } from "@/components/ui"

const { t } = useI18n()

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

function groupToLeague(groupIdx: number): League | undefined {
  const group = props.tournament.groups?.[groupIdx]
  if (!group) return undefined
  const n = group.teamIds.length
  const mpr = Math.max(1, Math.floor(n / 2))
  const matchdays = []
  for (let i = 0; i < group.matches.length; i += mpr) {
    matchdays.push({
      name: t("stats.round", { round: Math.floor(i / mpr) + 1 }),
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

const tierOptions = computed(() => tabs.value.map((label, i) => ({ value: String(i), label })))

const chartTitle = computed(() => {
  if (isLeague.value && isMultiTier.value && props.tournament.tiers) {
    const name = props.tournament.tiers[activeIdx.value]?.name ?? t("stats.league")
    return t("stats.standingsProgress", { name })
  }
  if (isGroupBracket.value && props.tournament.groups) {
    const name = props.tournament.groups[activeIdx.value]?.name ?? t("stats.group")
    return t("stats.standingsProgress", { name })
  }
  return t("stats.defaultStandingsProgress")
})
</script>

<template>
  <div v-if="hasStats" class="stats-wrap">
    <template v-if="showChart && activeLeague">
      <BtnGroup
        v-if="tabs.length > 1"
        size="xs"
        :model-value="String(activeIdx)"
        :options="tierOptions"
        @update:model-value="(v) => (activeIdx = Number(v))"
      />

      <LeagueProgressChart
        :key="activeIdx"
        :league="activeLeague"
        :teams="teams"
        :title="chartTitle"
      />
    </template>

    <div class="stats-grid">
      <AppCard variant="outlined" :title="t('stats.topScorers')">
        <AppTable dense class="stats-table">
          <thead>
            <tr>
              <th class="col-rank">#</th>
              <th class="col-team">{{ t("stats.team") }}</th>
              <th :title="t('stats.goalsForTitle')">{{ t("stats.gf") }}</th>
              <th :title="t('stats.goalsAgainstTitle')">{{ t("stats.ga") }}</th>
              <th :title="t('stats.matchesPlayedTitle')">{{ t("stats.mp") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(s, i) in topScorers" :key="s.teamId">
              <td class="col-rank">{{ i + 1 }}</td>
              <td class="col-team" :style="{ '--tc': s.color }">
                <TeamBadge :team="s" class="team-cell" />
              </td>
              <td class="col-highlight">{{ s.gf }}</td>
              <td class="col-muted">{{ s.ga }}</td>
              <td class="col-muted">{{ s.played }}</td>
            </tr>
          </tbody>
        </AppTable>
      </AppCard>

      <AppCard variant="outlined" :title="t('stats.bestDefense')">
        <AppTable dense class="stats-table">
          <thead>
            <tr>
              <th class="col-rank">#</th>
              <th class="col-team">{{ t("stats.team") }}</th>
              <th :title="t('stats.goalsAgainstTitle')">{{ t("stats.ga") }}</th>
              <th :title="t('stats.goalsForTitle')">{{ t("stats.gf") }}</th>
              <th :title="t('stats.matchesPlayedTitle')">{{ t("stats.mp") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(s, i) in bestDefense" :key="s.teamId">
              <td class="col-rank">{{ i + 1 }}</td>
              <td class="col-team" :style="{ '--tc': s.color }">
                <TeamBadge :team="s" class="team-cell" />
              </td>
              <td class="col-highlight">{{ s.ga }}</td>
              <td class="col-muted">{{ s.gf }}</td>
              <td class="col-muted">{{ s.played }}</td>
            </tr>
          </tbody>
        </AppTable>
      </AppCard>
    </div>
  </div>
</template>

<style scoped>
.stats-wrap {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}
.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--sp-3);
}
.stats-table :deep(thead th),
.stats-table :deep(tbody td) {
  text-align: center;
}
.stats-table .col-rank {
  width: 18px;
  color: var(--text-muted);
}
.stats-table .col-team {
  position: relative;
  text-align: start;
  min-width: 110px;
  padding-inline-start: 11px;
}
.stats-table .col-team::before {
  content: "";
  position: absolute;
  left: 2px;
  top: 3px;
  bottom: 3px;
  width: 3px;
  border-radius: 1px;
  background: var(--tc, transparent);
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.18);
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
  gap: var(--sp-2);
}
@media (max-width: 600px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
