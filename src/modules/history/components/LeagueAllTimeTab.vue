<script setup lang="ts">
import { useI18n } from "vue-i18n"

export interface AllTimeRow {
  teamId: string
  name: string
  color: string
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
  <div class="section-box">
    <div class="at-table-wrap">
      <table class="at-table">
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
          <tr
            v-for="(row, i) in rows"
            :key="row.teamId"
            :class="{
              'at-pos--1': i === 0,
              'at-pos--2': i === 1,
              'at-pos--3': i === 2,
              'at-pos--4': i === 3,
            }"
          >
            <td class="col-rank">{{ i + 1 }}</td>
            <td class="col-team">
              <span class="at-dot" :style="{ background: row.color }" />
              {{ row.name }}
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
      </table>
    </div>
  </div>
</template>

<style scoped>
.section-box {
  overflow: hidden;
}
.at-table-wrap {
  overflow-x: auto;
}
.at-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.at-table th {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  padding: 4px 6px;
  text-align: right;
  border-bottom: 1px solid var(--border-light);
  white-space: nowrap;
}
.at-table td {
  padding: 5px 6px;
  text-align: right;
  border-bottom: 1px solid var(--border-light);
  color: var(--text);
}
.col-rank {
  text-align: center !important;
  width: 28px;
  color: var(--text-muted) !important;
  font-size: 11px !important;
}
.col-team {
  text-align: left !important;
  min-width: 90px;
}
.col-pts {
  min-width: 32px;
}
.at-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  margin-right: 5px;
  vertical-align: middle;
  flex-shrink: 0;
}
.title-count {
  font-weight: 700;
  color: var(--accent);
}
.at-pos--1 td:first-child {
  border-left: 3px solid var(--accent-2);
}
.at-pos--2 td:first-child {
  border-left: 3px solid #3b82f6;
}
.at-pos--3 td:first-child {
  border-left: 3px solid #8b5cf6;
}
.at-pos--4 td:first-child {
  border-left: 3px solid var(--success);
}
.at-pos--1 .col-rank {
  color: var(--accent-2) !important;
  font-weight: 700;
}
.at-pos--2 .col-rank {
  color: #3b82f6 !important;
  font-weight: 600;
}
.at-pos--3 .col-rank {
  color: #8b5cf6 !important;
  font-weight: 600;
}
.at-pos--4 .col-rank {
  color: var(--success) !important;
  font-weight: 600;
}
.gd-pos {
  color: color-mix(in srgb, var(--accent) 80%, var(--text));
}
.gd-neg {
  color: var(--danger);
}
</style>
