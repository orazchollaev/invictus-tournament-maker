<script setup lang="ts">
import { computed } from "vue"
import type { Team } from "@/modules/teams/types"
import type { Tournament } from "@/modules/tournament/types"
import TeamBadge from "@/modules/teams/components/TeamBadge.vue"
import { AppCard, AppTable } from "@/components/ui"
import { useTeamLookup } from "@/composables/useTeamLookup"
import { useI18n } from "vue-i18n"

const props = defineProps<{
  tournament: Tournament
  teams: Team[]
}>()

const { t } = useI18n()
const { teamById } = useTeamLookup(() => props.teams)

const rankIdx = computed(() => props.tournament.qualifiersPerGroup ?? 2)
const wildcardCount = computed(() => props.tournament.wildcardCount ?? 0)

const candidates = computed(() => {
  const groups = props.tournament.groups ?? []
  const rows: {
    teamId: string
    groupName: string
    played: number
    won: number
    drawn: number
    lost: number
    gf: number
    ga: number
    gd: number
    pts: number
  }[] = []

  for (const group of groups) {
    const s = group.standings[rankIdx.value]
    if (!s) continue
    rows.push({
      teamId: s.teamId,
      groupName: group.name,
      played: s.played,
      won: s.won,
      drawn: s.drawn,
      lost: s.lost,
      gf: s.gf,
      ga: s.ga,
      gd: s.gd,
      pts: s.pts,
    })
  }

  rows.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)
  return rows
})
</script>

<template>
  <AppCard variant="outlined" title="Wildcard Race">
    <template #actions>
      <span class="wc-sub">
        Best {{ wildcardCount }} of {{ candidates.length }} runners-up advance
      </span>
    </template>

    <!-- Same shell/theme as the group standings table: AppTable, dense cells,
         the accent rail on the qualifying rows. -->
    <AppTable dense class="wc-table">
      <thead>
        <tr>
          <th class="col-rank">#</th>
          <th class="col-group">Group</th>
          <th class="col-team">{{ t("common.team") }}</th>
          <th :title="t('history.table.played')">P</th>
          <th :title="t('history.table.won')">W</th>
          <th :title="t('history.table.drawn')">D</th>
          <th :title="t('history.table.lost')">L</th>
          <th :title="t('history.table.goalsFor')">GF</th>
          <th :title="t('history.table.goalsAgainst')">GA</th>
          <th :title="t('history.table.goalDiff')">GD</th>
          <th :title="t('history.table.points')">Pts</th>
        </tr>
      </thead>
      <TransitionGroup tag="tbody" name="standing-row">
        <tr
          v-for="(row, ri) in candidates"
          :key="row.teamId"
          :class="ri < wildcardCount ? 'row-qualify' : 'row-out'"
        >
          <td class="col-rank">{{ ri + 1 }}</td>
          <td class="col-group">{{ row.groupName }}</td>
          <td class="col-team" :style="{ '--tc': teamById(row.teamId)?.color ?? 'transparent' }">
            <TeamBadge
              :team="teamById(row.teamId)"
              :fallback="row.teamId"
              class="flex team-cell"
              :size="14"
            />
          </td>
          <td>{{ row.played }}</td>
          <td>{{ row.won }}</td>
          <td>{{ row.drawn }}</td>
          <td>{{ row.lost }}</td>
          <td>{{ row.gf }}</td>
          <td>{{ row.ga }}</td>
          <td>{{ row.gd >= 0 ? "+" + row.gd : row.gd }}</td>
          <td class="col-pts">{{ row.pts }}</td>
        </tr>
      </TransitionGroup>
    </AppTable>

    <div v-if="candidates.length === 0" class="wc-empty">Group stage not started yet.</div>
  </AppCard>
</template>

<style scoped>
.wc-sub {
  font-size: var(--fs-xs);
  color: var(--text-muted);
}

.wc-table :deep(thead th),
.wc-table :deep(tbody td) {
  text-align: center;
}
.wc-table .col-rank {
  width: 18px;
  color: var(--text-muted);
}
.wc-table .col-group {
  font-size: var(--fs-xs);
  color: var(--text-muted);
  white-space: nowrap;
}

.wc-table .col-team {
  position: relative;
  text-align: start;
  min-width: 0;
  max-width: 120px;
  padding-inline-start: 11px;
}
.wc-table .col-team::before {
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
.col-pts {
  font-weight: 700;
}

/* Same treatment as GroupCard's row-qualify/row-out — a wildcard slot reads
   as "would qualify" the same way a group's real qualification line does. */
.row-qualify {
  background: color-mix(in srgb, var(--accent) 6%, transparent);
}
.row-qualify td:first-child {
  border-left: 3px solid var(--accent);
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

.wc-empty {
  font-size: var(--fs-sm);
  color: var(--text-muted);
  padding: var(--sp-3);
  text-align: center;
}

@media (max-width: 600px) {
  .wc-table .col-team {
    min-width: 90px;
  }
  .wc-table th:nth-child(5),
  .wc-table td:nth-child(5) {
    display: none;
  }
}
</style>
