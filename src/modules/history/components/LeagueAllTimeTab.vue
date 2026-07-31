<script setup lang="ts">
import { useI18n } from "vue-i18n"
import { AppCard, AppTable } from "@/components/ui"
import TeamBadge from "@/modules/teams/components/TeamBadge.vue"

export interface AllTimeRow {
  teamId: string
  name: string
  color: string
  flag?: string
  seasons: number
  titles: number
  played: number
  won: number
  drawn: number
  lost: number
  gf: number
  ga: number
  gd: number
  pts: number
}

defineProps<{ rows: AllTimeRow[] }>()

const { t } = useI18n()
</script>

<template>
  <AppCard>
    <AppTable dense class="at-table">
      <thead>
        <tr>
          <th class="col-rank">#</th>
          <th class="col-team">{{ t("history.table.team") }}</th>
          <th :title="t('history.table.seasonsPlayed')">Sns</th>
          <th :title="t('history.table.titles')">Ttl</th>
          <th :title="t('history.table.matchesPlayed')">P</th>
          <th :title="t('history.table.won')">W</th>
          <th :title="t('history.table.drawn')">D</th>
          <th :title="t('history.table.lost')">L</th>
          <th :title="t('history.table.goalsFor')">GF</th>
          <th :title="t('history.table.goalsAgainst')">GA</th>
          <th :title="t('history.table.goalDiff')">GD</th>
          <th :title="t('history.table.points')" class="col-pts">Pts</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, i) in rows" :key="row.teamId" :class="`at-pos--${i + 1}`">
          <td class="col-rank">{{ i + 1 }}</td>
          <td class="col-team">
            <TeamBadge :team="row" :size="7" />
          </td>
          <td class="muted">{{ row.seasons }}</td>
          <td>
            <span v-if="row.titles > 0" class="title-count">{{ row.titles }}</span>
            <span v-else class="muted">—</span>
          </td>
          <td>{{ row.played }}</td>
          <td>{{ row.won }}</td>
          <td>{{ row.drawn }}</td>
          <td>{{ row.lost }}</td>
          <td>{{ row.gf }}</td>
          <td>{{ row.ga }}</td>
          <td :class="{ 'gd-pos': row.gd > 0, 'gd-neg': row.gd < 0 }">
            {{ row.gd > 0 ? "+" : "" }}{{ row.gd }}
          </td>
          <td class="col-pts">
            <strong>{{ row.pts }}</strong>
          </td>
        </tr>
      </tbody>
    </AppTable>
  </AppCard>
</template>

<style scoped>
/* A stats grid, so every column is right-aligned except rank and team.
   Selectors carry the thead/tbody element to outrank AppTable's own
   `th { text-align: left }` regardless of stylesheet order. */
.at-table :deep(thead th),
.at-table :deep(tbody td) {
  text-align: right;
}

.col-rank {
  width: 28px;
  text-align: center;
  color: var(--text-muted);
}
.at-table :deep(tbody td.col-rank),
.at-table :deep(thead th.col-rank) {
  text-align: center;
}

.col-team {
  min-width: 90px;
}
.at-table :deep(tbody td.col-team),
.at-table :deep(thead th.col-team) {
  text-align: left;
}

.col-pts {
  min-width: 32px;
}

.title-count {
  font-weight: 700;
  color: var(--accent);
}

/* Position bands: champion, then the two European places, then playoff. */
.at-pos--1 td:first-child {
  border-left: 3px solid var(--medal-gold);
}
.at-pos--2 td:first-child {
  border-left: 3px solid var(--pos-2);
}
.at-pos--3 td:first-child {
  border-left: 3px solid var(--pos-3);
}
.at-pos--4 td:first-child {
  border-left: 3px solid var(--success);
}

.at-pos--1 .col-rank {
  color: var(--medal-gold);
  font-weight: 700;
}
.at-pos--2 .col-rank {
  color: var(--pos-2);
  font-weight: 600;
}
.at-pos--3 .col-rank {
  color: var(--pos-3);
  font-weight: 600;
}
.at-pos--4 .col-rank {
  color: var(--success);
  font-weight: 600;
}

.gd-pos {
  color: color-mix(in srgb, var(--accent) 80%, var(--text));
}
.gd-neg {
  color: var(--danger);
}
</style>
