<script setup lang="ts">
import { ref, computed } from "vue"
import { useI18n } from "vue-i18n"
import type { Tournament, League } from "@/modules/tournament/types"
import type { Team } from "@/modules/teams/types"
import { useTournamentStats } from "@/modules/tournament/composables/useTournamentStats"
import { isCustomFormat, isLeagueLike } from "@/engine"
import { LeagueProgressChart } from "@/modules/tournament/components/league"
import { TeamBadge } from "@/modules/teams/components"
import { AppCard, AppTable, AppButtonGroup } from "@/components/ui"
import { useEngineLabels } from "@/composables/useEngineLabels"

const props = defineProps<{
  tournament: Tournament
  teams: Team[]
}>()

const { t } = useI18n()

const { topScorers, bestDefense, hasStats } = useTournamentStats(
  () => props.tournament,
  () => props.teams
)

const { engineLabel } = useEngineLabels()

const isCustom = computed(() => isCustomFormat(props.tournament))
const isLeague = computed(() => isLeagueLike(props.tournament))
const isGroupBracket = computed(() => props.tournament.format === "group+bracket")
const isMultiTier = computed(() => (props.tournament.tiers?.length ?? 0) > 1)

const activeIdx = ref(0)

function groupToLeague(groupIdx: number, groups = props.tournament.groups): League | undefined {
  const group = groups?.[groupIdx]
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

/**
 * Every table a custom tournament has a progress chart for: one per league or
 * swiss phase, and one per group of each group phase. A knockout has no table,
 * so it contributes nothing.
 */
const customTables = computed<{ label: string; league: League }[]>(() => {
  if (!isCustom.value) return []
  const out: { label: string; league: League }[] = []
  for (const phase of props.tournament.phases ?? []) {
    if (phase.league) out.push({ label: phase.name, league: phase.league })
    phase.groups?.forEach((group, gi) => {
      const league = groupToLeague(gi, phase.groups)
      if (league) out.push({ label: `${phase.name} · ${engineLabel(group.name)}`, league })
    })
  }
  return out
})

const activeLeague = computed<League | undefined>(() => {
  if (isCustom.value) return customTables.value[activeIdx.value]?.league
  if (isLeague.value) {
    if (isMultiTier.value && props.tournament.tiers)
      return props.tournament.tiers[activeIdx.value]?.league
    return props.tournament.league
  }
  if (isGroupBracket.value) return groupToLeague(activeIdx.value)
  return undefined
})

const showChart = computed(() =>
  isCustom.value ? customTables.value.length > 0 : isLeague.value || isGroupBracket.value
)

const tabs = computed(() => {
  if (isCustom.value) return customTables.value.map((c) => c.label)
  if (isLeague.value && isMultiTier.value && props.tournament.tiers)
    return props.tournament.tiers.map((t) => t.name)
  if (isGroupBracket.value && props.tournament.groups)
    return props.tournament.groups.map((g) => g.name)
  return []
})

const tierOptions = computed(() => tabs.value.map((label, i) => ({ value: String(i), label })))

const chartTitle = computed(() => {
  if (isCustom.value) {
    const name = customTables.value[activeIdx.value]?.label
    return name ? t("stats.standingsProgress", { name }) : t("stats.defaultStandingsProgress")
  }
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
      <AppButtonGroup
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
