<script setup lang="ts">
import type { Team } from "@/modules/teams/types"
import type { Group } from "@/modules/tournament/types"
import { useTeamLookup } from "@/composables/useTeamLookup"
import { TeamBadge } from "@/modules/teams/components"
import { AppCard, AppTable } from "@/components/ui"
import { useI18n } from "vue-i18n"
import { GROUP_COLUMNS, formatGoalDiff } from "../shared/standingsColumns"
import { useEngineLabels } from "@/composables/useEngineLabels"

const props = defineProps<{
  group: Group
  teams: Team[]
  qualifiersPerGroup: number
  wildcardCount: number
}>()

const { t } = useI18n()
const { engineLabel } = useEngineLabels()
const { teamById } = useTeamLookup(() => props.teams)
</script>

<template>
  <AppCard variant="outlined" :title="engineLabel(group.name)">
    <AppTable dense flush class="gs-table">
      <thead>
        <tr>
          <th class="col-rank">#</th>
          <th class="col-team">{{ t("common.team") }}</th>
          <th
            v-for="col in GROUP_COLUMNS"
            :key="col.key"
            :title="t(col.titleKey)"
            :class="{ 'col-pts': col.key === 'pts' }"
          >
            {{ col.abbr }}
          </th>
        </tr>
      </thead>
      <TransitionGroup tag="tbody" name="standing-row">
        <tr
          v-for="(row, ri) in group.standings"
          :key="row.teamId"
          :class="{
            'row-qualify': ri < qualifiersPerGroup,
            'row-wildcard': ri === qualifiersPerGroup && wildcardCount > 0,
            'row-out': ri > qualifiersPerGroup || (ri === qualifiersPerGroup && !wildcardCount),
          }"
        >
          <td class="col-rank">{{ ri + 1 }}</td>
          <td class="col-team">
            <TeamBadge
              :team="teamById(row.teamId)"
              :fallback="row.teamId"
              class="flex team-cell"
              :size="14"
            />
          </td>
          <td>{{ row.played }}</td>
          <td>{{ row.drawn }}</td>
          <td>{{ row.lost }}</td>
          <td>{{ row.gf }}</td>
          <td>{{ row.ga }}</td>
          <td>{{ formatGoalDiff(row.gd) }}</td>
          <td class="col-pts">{{ row.pts }}</td>
        </tr>
      </TransitionGroup>
    </AppTable>
  </AppCard>
</template>

<style scoped>
.gs-table :deep(thead th),
.gs-table :deep(tbody td) {
  text-align: center;
}
.gs-table .col-rank {
  width: 18px;
  color: var(--text-muted);
}

.gs-table .col-team {
  text-align: start;
  min-width: 0;
  max-width: 120px;
}
.col-pts {
  font-weight: 700;
}
.gs-table .row-qualify {
  background: color-mix(in srgb, var(--accent) 12%, var(--surface-2));
}
.gs-table .row-wildcard {
  background: color-mix(in srgb, var(--accent) 6%, var(--surface-2));
}
.row-out {
  opacity: 0.65;
}

.team-cell {
  gap: 6px;
}
.flex {
  display: flex;
  align-items: center;
}

@media (max-width: 600px) {
  .gs-table .col-team {
    min-width: 90px;
  }

  .gs-table th:nth-child(6),
  .gs-table td:nth-child(6),
  .gs-table th:nth-child(7),
  .gs-table td:nth-child(7) {
    display: none;
  }
}
</style>
