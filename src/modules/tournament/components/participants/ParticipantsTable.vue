<script setup lang="ts">
import { computed, toRef } from "vue"
import { useI18n } from "vue-i18n"
import type { Team } from "@/modules/teams/types"
import type { Tournament } from "@/modules/tournament/types"
import TeamBadge from "@/modules/teams/components/TeamBadge.vue"
import { AppChip, AppTable } from "@/components/ui"
import ParticipantResultCell from "./ParticipantResultCell.vue"
import { finishRank, goalDiff } from "./formatters"
import type { SortKey } from "./types"
import { useParticipantRows } from "@/modules/tournament/composables/useParticipantRows"

const props = defineProps<{ teams: Team[]; tournament: Tournament }>()

const { t } = useI18n()

const { toggleSort, sortIcon, sortedRows } = useParticipantRows(
  toRef(props, "tournament"),
  toRef(props, "teams")
)

const isGroupFormat = computed(() => props.tournament.format === "group+bracket")

const columns = computed(() => {
  const cols: { key: SortKey; label: string; cls: string }[] = [
    { key: "result", label: t("participants.rank"), cls: "col-rank" },
    { key: "name", label: t("participants.team"), cls: "col-team" },
    { key: "group", label: t("participants.group"), cls: "col-group" },
    { key: "wins", label: t("participants.wins"), cls: "col-stat" },
    { key: "draws", label: t("participants.draws"), cls: "col-stat" },
    { key: "losses", label: t("participants.losses"), cls: "col-stat" },
    { key: "gf", label: t("participants.gf"), cls: "col-stat" },
    { key: "ga", label: t("participants.ga"), cls: "col-stat" },
    { key: "gd", label: t("participants.gd"), cls: "col-gd" },
    { key: "power", label: t("participants.power"), cls: "col-power" },
    { key: "result", label: t("participants.result"), cls: "col-result" },
  ]
  return cols.filter((c) => c.cls !== "col-group" || isGroupFormat.value)
})
</script>

<template>
  <AppTable class="pt swiper-no-swiping">
    <thead>
      <tr>
        <th
          v-for="col in columns"
          :key="col.cls + col.label"
          class="sortable"
          :class="col.cls"
          @click="toggleSort(col.key)"
        >
          {{ col.label }}
          <span class="sort-icon">{{ sortIcon(col.key) }}</span>
        </th>
      </tr>
    </thead>
    <tbody>
      <tr
        v-for="(row, i) in sortedRows"
        :key="row.team.id"
        :class="{
          'row--winner': row.isWinner,
          'row--top4': row.isSecondPlace || row.isThirdPlace || row.isFourthPlace,
        }"
      >
        <td class="col-rank">
          <span class="rank-badge" :class="`rank-badge--${finishRank(row) ?? 'none'}`">
            {{ finishRank(row) ?? i + 1 }}
          </span>
        </td>
        <td class="col-team">
          <TeamBadge :team="row.team" class="team-cell" :size="16" />
        </td>
        <td v-if="isGroupFormat" class="col-group">
          <AppChip square>{{ row.groupName ?? "—" }}</AppChip>
        </td>
        <td class="col-stat stat-wins">{{ row.stats.wins }}</td>
        <td class="col-stat stat-draws">{{ row.stats.draws }}</td>
        <td class="col-stat stat-losses">{{ row.stats.losses }}</td>
        <td class="col-stat">{{ row.stats.gf }}</td>
        <td class="col-stat">{{ row.stats.ga }}</td>
        <td
          class="col-gd"
          :class="{
            'gd--pos': row.stats.gf > row.stats.ga,
            'gd--neg': row.stats.gf < row.stats.ga,
          }"
        >
          {{ row.stats.played > 0 ? goalDiff(row.stats) : "—" }}
        </td>
        <td class="col-power">{{ row.team.power }}</td>
        <td class="col-result">
          <ParticipantResultCell :row="row" />
        </td>
      </tr>
    </tbody>
  </AppTable>
</template>

<style scoped>
.pt :deep(tbody tr:hover) {
  background: var(--bg-hover);
}

.row--winner td {
  background: color-mix(in srgb, var(--accent-2) 6%, transparent);
}

.sortable {
  cursor: pointer;
  user-select: none;
}
.sortable:hover {
  color: var(--text);
}

.sort-icon {
  font-size: var(--fs-xs);
  opacity: 0.6;
}

/* ── Design languages ────────────────────────────────────────────
   The table shell itself is handled in AppTable; this is what is
   specific to the participants list. */
[data-design="ios"] .sort-icon {
  color: var(--accent);
  opacity: 1;
}
[data-design="ios"] .row--winner td {
  background: color-mix(in srgb, var(--accent-2) 10%, transparent);
}

[data-design="android"] .sort-icon {
  color: var(--accent);
  opacity: 1;
}
[data-design="android"] .rank-badge {
  border-radius: var(--radius-sm);
  font-weight: 600;
}
[data-design="android"] .row--winner td {
  background: color-mix(in srgb, var(--accent-2) 14%, transparent);
}

.col-rank,
.col-stat {
  width: 36px;
  text-align: center;
}

.col-gd {
  width: 40px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.col-power {
  width: 48px;
  text-align: center;
}

.col-group {
  width: 64px;
}

.col-result {
  text-align: start;
  white-space: nowrap;
}

.rank-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  font-size: var(--fs-xs);
  font-weight: 700;
  color: var(--text-muted);
  background: transparent;
}
.rank-badge--1 {
  background: var(--medal-gold);
  color: var(--on-accent);
}
.rank-badge--2 {
  background: color-mix(in srgb, var(--medal-silver) 70%, transparent);
  color: var(--on-accent);
}
.rank-badge--3 {
  background: color-mix(in srgb, var(--medal-bronze) 70%, transparent);
  color: var(--on-accent);
}
.rank-badge--4 {
  color: var(--text-muted);
  background: var(--border-light);
}

.team-cell {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}

.stat-wins {
  color: color-mix(in srgb, var(--success) 80%, var(--text));
  font-weight: 600;
}
.stat-draws {
  color: var(--text-muted);
}
.stat-losses {
  color: color-mix(in srgb, var(--danger) 80%, var(--text));
}

.gd--pos {
  color: color-mix(in srgb, var(--success) 80%, var(--text));
  font-weight: 600;
}
.gd--neg {
  color: color-mix(in srgb, var(--danger) 80%, var(--text));
}
</style>
