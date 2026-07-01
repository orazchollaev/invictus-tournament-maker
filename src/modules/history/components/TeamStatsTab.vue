<script setup lang="ts">
import { ref } from "vue"
import { ChevronDown, ChevronRight, Trophy } from "@lucide/vue"
import { useI18n } from "vue-i18n"
import FlagCircle from "@/modules/teams/components/FlagCircle.vue"

export interface TeamSeasonRow {
  season: number
  played: number
  won: number
  drawn: number
  lost: number
  gf: number
  ga: number
  gd: number
  cleanSheets: number
  title: boolean
}

export interface TeamStatEntry {
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
  cleanSheets: number
  seasonBreakdown: TeamSeasonRow[]
}

defineProps<{ teams: TeamStatEntry[] }>()

const { t } = useI18n()
const expanded = ref<string | null>(null)

function toggle(teamId: string) {
  expanded.value = expanded.value === teamId ? null : teamId
}
</script>

<template>
  <div class="section-box">
    <div class="ts-wrap">
      <table class="ts-table">
        <thead>
          <tr>
            <th class="col-rank">#</th>
            <th class="col-team">{{ t("history.table.team") }}</th>
            <th :title="t('history.table.seasons')">Sns</th>
            <th :title="t('history.table.titles')">Ttl</th>
            <th :title="t('history.table.matchesPlayed')">P</th>
            <th :title="t('history.table.won')">W</th>
            <th :title="t('history.table.drawn')">D</th>
            <th :title="t('history.table.lost')">L</th>
            <th :title="t('history.table.goalsFor')">GF</th>
            <th :title="t('history.table.goalsAgainst')">GA</th>
            <th :title="t('history.table.goalDiff')">GD</th>
            <th :title="t('history.table.cleanSheets')">CS</th>
            <th class="col-expand"></th>
          </tr>
        </thead>
        <tbody>
          <template v-for="(row, i) in teams" :key="row.teamId">
            <tr
              class="ts-row"
              :class="{ 'ts-row--expanded': expanded === row.teamId }"
              @click="toggle(row.teamId)"
            >
              <td class="col-rank muted">{{ i + 1 }}</td>
              <td class="col-team">
                <FlagCircle v-if="row.flag" :code="row.flag" :size="14" />
                <span v-else class="color-dot" :style="{ background: row.color }" />
                {{ row.name }}
              </td>
              <td class="muted">{{ row.seasons }}</td>
              <td>
                <span v-if="row.titles > 0" class="title-badge">
                  <Trophy :size="10" />
                  {{ row.titles }}
                </span>
                <span v-else class="muted">—</span>
              </td>
              <td>{{ row.played }}</td>
              <td>{{ row.won }}</td>
              <td class="muted">{{ row.drawn }}</td>
              <td class="muted">{{ row.lost }}</td>
              <td>{{ row.gf }}</td>
              <td class="muted">{{ row.ga }}</td>
              <td :class="{ 'gd-pos': row.gd > 0, 'gd-neg': row.gd < 0 }">
                {{ row.gd > 0 ? "+" : "" }}{{ row.gd }}
              </td>
              <td>{{ row.cleanSheets }}</td>
              <td class="col-expand">
                <ChevronDown v-if="expanded === row.teamId" :size="12" class="expand-icon" />
                <ChevronRight v-else :size="12" class="expand-icon" />
              </td>
            </tr>
            <tr v-if="expanded === row.teamId" class="ts-breakdown-row">
              <td colspan="13" class="ts-breakdown-cell">
                <table class="ts-sub-table">
                  <thead>
                    <tr>
                      <th>{{ t("history.table.season") }}</th>
                      <th>P</th>
                      <th>W</th>
                      <th>D</th>
                      <th>L</th>
                      <th>GF</th>
                      <th>GA</th>
                      <th>GD</th>
                      <th>CS</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="s in row.seasonBreakdown" :key="s.season">
                      <td class="sub-season">S.{{ s.season }}</td>
                      <td>{{ s.played }}</td>
                      <td>{{ s.won }}</td>
                      <td class="muted">{{ s.drawn }}</td>
                      <td class="muted">{{ s.lost }}</td>
                      <td>{{ s.gf }}</td>
                      <td class="muted">{{ s.ga }}</td>
                      <td :class="{ 'gd-pos': s.gd > 0, 'gd-neg': s.gd < 0 }">
                        {{ s.gd > 0 ? "+" : "" }}{{ s.gd }}
                      </td>
                      <td>{{ s.cleanSheets }}</td>
                      <td>
                        <Trophy v-if="s.title" :size="10" class="sub-trophy" />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.section-box {
  overflow: hidden;
}
.ts-wrap {
  overflow-x: auto;
}
.ts-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.ts-table th {
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
.ts-table td {
  padding: 5px 6px;
  text-align: right;
  border-bottom: 1px solid var(--border-light);
  color: var(--text);
}
.col-rank {
  text-align: center !important;
  width: 28px;
  font-size: 11px;
}
.col-team {
  text-align: left !important;
  min-width: 90px;
}
.col-expand {
  width: 24px;
  text-align: center !important;
}
.ts-row {
  cursor: pointer;
  transition: background 0.1s;
}
.ts-row:hover td {
  background: color-mix(in srgb, var(--border-light) 30%, transparent);
}
.ts-row--expanded td {
  background: color-mix(in srgb, var(--border-light) 20%, transparent);
  border-bottom: none;
}
.expand-icon {
  color: var(--text-muted);
}
.title-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: var(--accent);
  font-weight: 700;
}
.gd-pos {
  color: color-mix(in srgb, var(--accent) 80%, var(--text));
}
.gd-neg {
  color: var(--danger);
}

/* Breakdown sub-table */
.ts-breakdown-row td {
  border-bottom: 1px solid var(--border-light);
  padding: 0;
}
.ts-breakdown-cell {
  padding: 0 !important;
  background: color-mix(in srgb, var(--border-light) 12%, transparent);
}
.ts-sub-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.ts-sub-table th {
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  padding: 4px 8px 4px 6px;
  text-align: right;
  border-bottom: 1px solid var(--border-light);
}
.ts-sub-table th:first-child {
  text-align: left;
  padding-left: 32px;
}
.ts-sub-table td {
  padding: 4px 8px 4px 6px;
  text-align: right;
  border-bottom: 1px solid var(--border-light);
  color: var(--text);
}
.ts-sub-table tbody tr:last-child td {
  border-bottom: none;
}
.sub-season {
  text-align: left !important;
  padding-left: 32px !important;
  color: var(--text-muted);
  font-weight: 600;
}
.sub-trophy {
  color: var(--accent);
}
</style>
