<script setup lang="ts">
/**
 * Player rankings for one tournament: scorers, assists, ratings, keepers.
 * One ranking is on screen at a time — four tables stacked would bury the
 * one the reader came for.
 */
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"
import { Goal, Handshake, Shield, Star } from "@lucide/vue"
import { AppCard, AppEmptyState, AppTable, SubTabBar } from "@/components/ui"
import TeamBadge from "@/modules/teams/components/TeamBadge.vue"
import PlayerRatingChip from "@/modules/players/components/PlayerRatingChip.vue"
import type { Team } from "@/modules/teams/types"
import type { Tournament } from "../../types"
import {
  useTournamentPlayerStats,
  MIN_APPS_FOR_RATING,
  type PlayerStatRow,
} from "../../composables/useTournamentPlayerStats"

const props = defineProps<{
  tournament: Tournament
  teams: Team[]
}>()

const { t } = useI18n()
const router = useRouter()

const { hasPlayerStats, topScorers, topAssists, topRated, keepers } = useTournamentPlayerStats(
  () => props.tournament
)

type ListKey = "scorers" | "assists" | "rated" | "keepers"
const active = ref<ListKey>("scorers")

const options = computed(() => [
  { value: "scorers", label: t("playerStats.scorers"), icon: Goal },
  { value: "assists", label: t("playerStats.assists"), icon: Handshake },
  { value: "rated", label: t("playerStats.rated"), icon: Star },
  { value: "keepers", label: t("playerStats.keepers"), icon: Shield },
])

const lists: Record<ListKey, () => PlayerStatRow[]> = {
  scorers: () => topScorers.value,
  assists: () => topAssists.value,
  rated: () => topRated.value,
  keepers: () => keepers.value,
}

const rows = computed(() => lists[active.value]())

/** The lead column: what this particular ranking is ranked by. */
const leadColumn = computed(() => {
  switch (active.value) {
    case "assists":
      return { key: "assists", label: t("playerStats.colAssists") }
    case "rated":
      return { key: "rating", label: t("playerStats.colRating") }
    case "keepers":
      return { key: "cleanSheets", label: t("playerStats.colCleanSheets") }
    default:
      return { key: "goals", label: t("playerStats.colGoals") }
  }
})

const emptyHint = computed(() =>
  active.value === "rated"
    ? t("playerStats.emptyRated", { count: MIN_APPS_FOR_RATING })
    : t("playerStats.emptyHint")
)

function teamOf(teamId: string) {
  return props.teams.find((team) => team.id === teamId)
}

function open(playerId: string) {
  void router.push(`/players/${playerId}`)
}
</script>

<template>
  <div class="player-stats">
    <SubTabBar
      :options="options"
      :model-value="active"
      @update:model-value="(v) => (active = v as ListKey)"
    />

    <AppEmptyState
      v-if="!hasPlayerStats"
      :icon="Goal"
      :title="t('playerStats.emptyTitle')"
      :description="t('playerStats.emptyDesc')"
    />

    <AppCard v-else variant="outlined">
      <AppTable dense class="ps-table">
        <thead>
          <tr>
            <th class="col-rank">#</th>
            <th class="col-player">{{ t("playerStats.player") }}</th>
            <th class="col-lead">{{ leadColumn.label }}</th>
            <template v-if="active === 'keepers'">
              <th>{{ t("playerStats.colConceded") }}</th>
              <th>{{ t("playerStats.colSaves") }}</th>
            </template>
            <template v-else>
              <th>
                {{ active === "assists" ? t("playerStats.colGoals") : t("playerStats.colAssists") }}
              </th>
              <th>{{ t("playerStats.colApps") }}</th>
            </template>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, i) in rows"
            :key="row.playerId"
            class="ps-row"
            @click="open(row.playerId)"
          >
            <td class="col-rank" :data-medal="i < 3 ? i + 1 : undefined">{{ i + 1 }}</td>
            <td class="col-player">
              <span class="player">
                <span class="player-name">{{ row.name }}</span>
                <TeamBadge :team="teamOf(row.teamId)" :size="14" class="player-team" />
              </span>
            </td>
            <td class="col-lead">
              <PlayerRatingChip v-if="leadColumn.key === 'rating'" :rating="row.rating" />
              <template v-else>
                {{ row[leadColumn.key as "goals" | "assists" | "cleanSheets"] }}
              </template>
            </td>
            <template v-if="active === 'keepers'">
              <td class="col-muted">{{ row.conceded }}</td>
              <td class="col-muted">{{ row.saves }}</td>
            </template>
            <template v-else>
              <td class="col-muted">{{ active === "assists" ? row.goals : row.assists }}</td>
              <td class="col-muted">{{ row.apps }}</td>
            </template>
          </tr>
        </tbody>
      </AppTable>

      <p v-if="!rows.length" class="empty-inline">{{ emptyHint }}</p>
    </AppCard>
  </div>
</template>

<style scoped>
.player-stats {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

.ps-table :deep(thead th),
.ps-table :deep(tbody td) {
  text-align: center;
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
}
.ps-table :deep(thead th) {
  font-family: var(--font-ui);
}

.col-rank {
  width: 26px;
  color: var(--text-muted);
}
/* Podium places carry the same medal colours the standings tables use. */
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

.col-lead {
  font-weight: 700;
  color: var(--accent);
}

.col-muted {
  color: var(--text-muted);
}

.ps-row {
  cursor: pointer;
}
.ps-row:hover {
  background: var(--bg-hover);
}
</style>
