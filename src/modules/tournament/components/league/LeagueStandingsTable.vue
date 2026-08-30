<script setup lang="ts">
import type { GroupStanding } from "@/modules/tournament/types"
import type { Team } from "@/modules/teams/types"
import { TeamBadge } from "@/modules/teams/components"
import { AppSectionHeader, AppTable } from "@/components/ui"
import { useI18n } from "vue-i18n"
import { LEAGUE_COLUMNS, formatGoalDiff } from "../shared/standingsColumns"

const props = defineProps<{
  standings: GroupStanding[]
  teams: Team[]
  isFinished: boolean
  playedMatchdays: number
  totalMatchdays: number
  promotionCount?: number
  playoffQualifierCount?: number
  relegationCount: number
}>()

const { t } = useI18n()

function teamById(id: string) {
  return props.teams.find((t) => t.id === id)
}

const playoffCount = () => props.playoffQualifierCount ?? 0
const promoCount = () => props.promotionCount ?? 0

function isRelegated(rank: number) {
  return props.relegationCount > 0 && rank >= props.standings.length - props.relegationCount
}
function isFirstRelegated(rank: number) {
  return props.relegationCount > 0 && rank === props.standings.length - props.relegationCount
}
function isPromoted(rank: number) {
  return promoCount() > 0 && rank < promoCount()
}
function isLastPromoted(rank: number) {
  return promoCount() > 0 && rank === promoCount() - 1
}
function isPlayoffQualifier(rank: number) {
  return playoffCount() > 0 && rank < playoffCount()
}
function isLastPlayoffQualifier(rank: number) {
  return playoffCount() > 0 && rank === playoffCount() - 1
}
</script>

<template>
  <div class="lv-left">
    <AppSectionHeader>
      {{ t("tournament.tabs.standings") }}
      <span class="lv-progress">
        {{ t("tournament.matchdayProgress", { played: playedMatchdays, total: totalMatchdays }) }}
      </span>
    </AppSectionHeader>
    <AppTable dense class="lv-table">
      <thead>
        <tr>
          <th class="col-rank">#</th>
          <th class="col-team">{{ t("common.team") }}</th>
          <th
            v-for="col in LEAGUE_COLUMNS"
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
          v-for="(row, rank) in standings"
          :key="row.teamId"
          :class="{
            'lv-row--champion': rank === 0 && isFinished,
            'lv-pos--1': rank === 0 && !promotionCount && !playoffCount(),
            'lv-pos--2': rank === 1 && !promotionCount && !playoffCount(),
            'lv-pos--3': rank === 2 && !promotionCount && !playoffCount(),
            'lv-pos--4': rank === 3 && !promotionCount && !playoffCount(),
            'lv-pos--playoff': isPlayoffQualifier(rank),
            'lv-pos--playoff-last': isLastPlayoffQualifier(rank),
            'lv-pos--promoted': isPromoted(rank),
            'lv-pos--promoted-last': isLastPromoted(rank),
            'lv-pos--relegated': isRelegated(rank),
            'lv-pos--relegated-first': isFirstRelegated(rank),
          }"
        >
          <td class="col-rank">
            <span v-if="rank === 0 && isFinished" class="lv-crown">🏆</span>
            <span v-else>{{ rank + 1 }}</span>
          </td>
          <td class="col-team" :style="{ '--tc': teamById(row.teamId)?.color ?? 'transparent' }">
            <TeamBadge :team="teamById(row.teamId)" :fallback="row.teamId" />
          </td>
          <td>{{ row.played }}</td>
          <td>{{ row.won }}</td>
          <td>{{ row.drawn }}</td>
          <td>{{ row.lost }}</td>
          <td>{{ row.gf }}</td>
          <td>{{ row.ga }}</td>
          <td :class="{ 'gd-pos': row.gd > 0, 'gd-neg': row.gd < 0 }">
            {{ formatGoalDiff(row.gd) }}
          </td>
          <td class="col-pts">
            <strong>{{ row.pts }}</strong>
          </td>
        </tr>
      </TransitionGroup>
    </AppTable>
  </div>
</template>

<style scoped>
.lv-left {
  min-width: 0;
}

.lv-progress {
  font-weight: 400;
  text-transform: none;
  letter-spacing: 0;
}

.lv-table :deep(thead th),
.lv-table :deep(tbody td) {
  text-align: center;
}
.lv-table .col-rank {
  text-align: center;
  width: 24px;
  color: var(--text-muted);
}

.lv-table .col-team {
  position: relative;
  text-align: start;
  min-width: 90px;
  max-width: 130px;
  padding-inline-start: 11px;
}
.lv-table .col-team::before {
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
  min-width: 32px;
}
.lv-row--champion td {
  background: color-mix(in srgb, var(--accent) 6%, var(--surface));
}
.lv-crown {
  font-size: var(--fs-xs);
}

/* ─── Position zone colors ─── */
.lv-pos--1 td:first-child {
  border-left: 3px solid var(--accent-2);
}
.lv-pos--2 td:first-child {
  border-left: 3px solid var(--pos-2);
}
.lv-pos--3 td:first-child {
  border-left: 3px solid var(--pos-3);
}
.lv-pos--4 td:first-child {
  border-left: 3px solid var(--success);
}
.lv-pos--1 .col-rank {
  color: var(--accent-2) !important;
  font-weight: 700;
}
.lv-pos--2 .col-rank {
  color: var(--pos-2) !important;
  font-weight: 600;
}
.lv-pos--3 .col-rank {
  color: var(--pos-3) !important;
  font-weight: 600;
}
.lv-pos--4 .col-rank {
  color: var(--success) !important;
  font-weight: 600;
}
.lv-pos--playoff td:first-child {
  border-left: 3px solid var(--accent-2);
}
.lv-pos--playoff .col-rank {
  color: var(--accent-2) !important;
  font-weight: 600;
}
.lv-pos--playoff-last td {
  border-bottom: 1px dashed color-mix(in srgb, var(--accent-2) 45%, transparent);
}

.lv-pos--promoted td:first-child {
  border-left: 3px solid var(--success);
}
.lv-pos--promoted .col-rank {
  color: var(--success) !important;
  font-weight: 600;
}
.lv-pos--promoted-last td {
  border-bottom: 1px dashed color-mix(in srgb, var(--success) 40%, transparent);
}
.lv-pos--relegated td:first-child {
  border-left: 3px solid var(--danger);
}
.lv-pos--relegated .col-rank {
  color: var(--danger) !important;
  font-weight: 600;
}
.lv-pos--relegated-first td {
  border-top: 1px dashed color-mix(in srgb, var(--danger) 40%, transparent);
}
.gd-pos {
  color: color-mix(in srgb, var(--accent) 80%, var(--text));
}
.gd-neg {
  color: var(--danger);
}

@media (max-width: 600px) {
  .lv-table th:nth-child(5),
  .lv-table td:nth-child(5),
  .lv-table th:nth-child(6),
  .lv-table td:nth-child(6),
  .lv-table th:nth-child(7),
  .lv-table td:nth-child(7),
  .lv-table th:nth-child(8),
  .lv-table td:nth-child(8) {
    display: none;
  }
}
</style>
