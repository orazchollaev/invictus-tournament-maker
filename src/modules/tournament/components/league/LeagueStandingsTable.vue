<script setup lang="ts">
import type { GroupStanding } from "@/modules/tournament/types"
import type { Team } from "@/modules/teams/types"
import { TeamBadge } from "@/modules/teams/components"
import { AppTable } from "@/components/ui"
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
    <AppTable dense flush class="lv-table">
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
          <td class="col-team">
            <TeamBadge :team="teamById(row.teamId)" :fallback="row.teamId" />
          </td>
          <td>{{ row.played }}</td>
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
  text-align: start;
  min-width: 90px;
  max-width: 130px;
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
.lv-pos--playoff .col-rank {
  color: var(--accent-2) !important;
  font-weight: 600;
}
.lv-pos--promoted .col-rank {
  color: var(--success) !important;
  font-weight: 600;
}
.lv-pos--relegated .col-rank {
  color: var(--danger) !important;
  font-weight: 600;
}
.gd-pos {
  color: color-mix(in srgb, var(--accent) 80%, var(--text));
}
.gd-neg {
  color: var(--danger);
}

@media (max-width: 600px) {
  /* Rank, team, P, D, L, GD, Pts stay; GF/GA are the columns dropped for width. */
  .lv-table th:nth-child(6),
  .lv-table td:nth-child(6),
  .lv-table th:nth-child(7),
  .lv-table td:nth-child(7) {
    display: none;
  }
}
</style>
