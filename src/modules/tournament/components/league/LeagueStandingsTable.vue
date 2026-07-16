<script setup lang="ts">
import type { GroupStanding } from "@/modules/tournament/types"
import type { Team } from "@/modules/teams/types"
import TeamBadge from "@/modules/teams/components/TeamBadge.vue"

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
    <div class="lv-section-title">
      League Table
      <span class="lv-progress">{{ playedMatchdays }}/{{ totalMatchdays }} matchdays</span>
    </div>
    <div class="lv-table-wrap">
      <table class="lv-table">
        <thead>
          <tr>
            <th class="col-rank">#</th>
            <th class="col-team">Team</th>
            <th title="Played">P</th>
            <th title="Won">W</th>
            <th title="Drawn">D</th>
            <th title="Lost">L</th>
            <th title="Goals For">GF</th>
            <th title="Goals Against">GA</th>
            <th title="Goal Difference">GD</th>
            <th title="Points" class="col-pts">Pts</th>
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
              <TeamBadge :team="teamById(row.teamId)" :fallback="row.teamId" class="lv-team-name" />
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
        </TransitionGroup>
      </table>
    </div>
  </div>
</template>

<style scoped>
.lv-left {
  min-width: 0;
}

.lv-section-title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.lv-progress {
  font-size: 10px;
  font-weight: 400;
  text-transform: none;
  letter-spacing: 0;
}

/* ─── Table ─── */
.lv-table-wrap {
  overflow-x: auto;
}
.lv-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.lv-table th {
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
.lv-table td {
  padding: 5px 6px;
  text-align: right;
  border-bottom: 1px solid var(--border-light);
  color: var(--text);
}
.col-rank {
  text-align: center !important;
  width: 24px;
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
.lv-team-name {
  font-size: 12px;
}
.lv-row--champion td {
  background: color-mix(in srgb, var(--accent) 6%, var(--surface));
}
.lv-crown {
  font-size: 11px;
}

/* ─── Position zone colors ─── */
.lv-pos--1 td:first-child {
  border-left: 3px solid var(--accent-2);
}
.lv-pos--2 td:first-child {
  border-left: 3px solid #3b82f6;
}
.lv-pos--3 td:first-child {
  border-left: 3px solid #8b5cf6;
}
.lv-pos--4 td:first-child {
  border-left: 3px solid var(--success);
}
.lv-pos--1 .col-rank {
  color: var(--accent-2) !important;
  font-weight: 700;
}
.lv-pos--2 .col-rank {
  color: #3b82f6 !important;
  font-weight: 600;
}
.lv-pos--3 .col-rank {
  color: #8b5cf6 !important;
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

@media (max-width: 640px) {
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
