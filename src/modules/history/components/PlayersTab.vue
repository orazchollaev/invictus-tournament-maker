<script setup lang="ts">
/** All-time player totals for one tournament series. */
import { useRouter } from "vue-router"
import { useI18n } from "vue-i18n"
import { Goal } from "@lucide/vue"
import { AppCard, AppEmptyState, AppTable } from "@/components/ui"
import TeamBadge from "@/modules/teams/components/TeamBadge.vue"
import PlayerRatingChip from "@/modules/players/components/PlayerRatingChip.vue"
import { useTeamsStore } from "@/modules/teams/store"
import type { AllTimePlayerRow } from "../composables/useHistoryPlayerStats"

defineProps<{ players: AllTimePlayerRow[] }>()

const { t } = useI18n()
const router = useRouter()
const teamsStore = useTeamsStore()

function teamOf(teamId: string) {
  return teamsStore.teams.find((team) => team.id === teamId)
}
</script>

<template>
  <AppCard>
    <AppEmptyState
      v-if="!players.length"
      :icon="Goal"
      :title="t('history.players.emptyTitle')"
      :description="t('history.players.emptyDesc')"
    />

    <AppTable v-else dense class="hp-table">
      <thead>
        <tr>
          <th class="col-rank">#</th>
          <th class="col-player">{{ t("playerStats.player") }}</th>
          <th :title="t('playerDetail.goals')">{{ t("playerStats.colGoals") }}</th>
          <th :title="t('playerDetail.assists')">{{ t("playerStats.colAssists") }}</th>
          <th :title="t('playerDetail.apps')">{{ t("playerStats.colApps") }}</th>
          <th :title="t('history.table.seasons')">{{ t("history.players.seasonsShort") }}</th>
          <th>{{ t("playerStats.colRating") }}</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(row, i) in players"
          :key="row.playerId"
          class="hp-row"
          @click="router.push(`/players/${row.playerId}`)"
        >
          <td class="col-rank" :data-medal="i < 3 ? i + 1 : undefined">{{ i + 1 }}</td>
          <td class="col-player">
            <span class="player">
              <span class="player-name">{{ row.name }}</span>
              <TeamBadge :team="teamOf(row.teamId)" :size="14" class="player-team" />
            </span>
          </td>
          <td class="lead">{{ row.goals }}</td>
          <td class="muted">{{ row.assists }}</td>
          <td class="muted">{{ row.apps }}</td>
          <td class="muted">{{ row.seasons }}</td>
          <td><PlayerRatingChip :rating="row.rating" /></td>
        </tr>
      </tbody>
    </AppTable>
  </AppCard>
</template>

<style scoped>
.hp-table :deep(thead th),
.hp-table :deep(tbody td) {
  text-align: center;
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
}
.hp-table :deep(thead th) {
  font-family: var(--font-ui);
}

.col-rank {
  width: 26px;
  color: var(--text-muted);
}
.col-rank[data-medal="1"] {
  color: var(--medal-gold);
  font-weight: 700;
}
.col-rank[data-medal="2"] {
  color: var(--medal-silver);
  font-weight: 700;
}
.col-rank[data-medal="3"] {
  color: var(--medal-bronze);
  font-weight: 700;
}

.col-player {
  text-align: start !important;
  font-family: var(--font) !important;
  min-width: 140px;
}

.player {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.player-name {
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.player-team {
  font-size: var(--fs-xs);
  color: var(--text-muted);
}

.lead {
  font-weight: 700;
  color: var(--accent);
}

.muted {
  color: var(--text-muted);
}

.hp-row {
  cursor: pointer;
}
.hp-row:hover {
  background: var(--bg-hover);
}
</style>
