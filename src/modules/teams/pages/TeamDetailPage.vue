<script setup lang="ts">
import { computed, ref } from "vue"
import { useRoute, useRouter } from "vue-router"
import { useI18n } from "vue-i18n"
import { useTeamsStore } from "../store"
import { useTournamentStore } from "@/modules/tournament/store"
import { useTeamLookup } from "@/composables/useTeamLookup"
import { AppButton, AppCard, AppEmptyState, AppIcon } from "@/components/ui"
import { ArrowLeft } from "@lucide/vue"
import SeasonChart from "../components/SeasonChart.vue"
import {
  TeamFormRow,
  TeamHeaderCard,
  TeamMatchList,
  TeamStatsGrid,
  TeamTrophyList,
} from "../components/detail"
import { useTeamMatchHistory } from "../composables/useTeamMatchHistory"
import { useTeamColorOverlay } from "../composables/useTeamColorOverlay"

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const teamsStore = useTeamsStore()
const tournamentStore = useTournamentStore()
const { getTeamName } = useTeamLookup(() => teamsStore.teams)

const teamId = computed(() => route.params.id as string)
const team = computed(() => teamsStore.teams.find((t) => t.id === teamId.value))

useTeamColorOverlay(team)

const { matches, stats, recentForm, tournamentOptions, seasonStats } = useTeamMatchHistory(
  computed(() => tournamentStore.tournaments),
  teamId
)

const tournamentWins = computed(() =>
  tournamentStore.tournaments.filter((t) => t.winnerId === teamId.value)
)

const selectedTournamentKey = ref("all")

const filteredMatches = computed(() => {
  if (selectedTournamentKey.value === "all") return matches.value
  const [name, season] = selectedTournamentKey.value.split("|")
  return matches.value.filter(
    (m) => m.tournamentName === name && m.tournamentSeason === Number(season)
  )
})
</script>

<template>
  <div class="page">
    <AppCard v-if="!team" padding="md">
      <AppEmptyState :description="t('teams.notFound')">
        <template #action>
          <AppButton @click="router.back()">
            <AppIcon :icon="ArrowLeft" />
            {{ t("common.back") }}
          </AppButton>
        </template>
      </AppEmptyState>
    </AppCard>

    <div v-else class="stack" :style="{ '--rail-color': team.color }">
      <TeamHeaderCard :team="team" @back="router.back()" />

      <TeamStatsGrid :stats="stats" :titles="tournamentWins.length" />

      <TeamFormRow v-if="matches.length" :form="recentForm" :get-team-name="getTeamName" />

      <AppCard v-if="seasonStats.length >= 1" padding="md">
        <template #title>
          {{ t("teams.detail.seasonHistory") }}
          <span class="count">
            ({{ seasonStats.length }}
            {{ seasonStats.length === 1 ? t("common.season", 1) : t("common.season", 2) }})
          </span>
        </template>
        <SeasonChart :stats="seasonStats" />
      </AppCard>

      <TeamTrophyList v-if="tournamentWins.length" :wins="tournamentWins" />

      <TeamMatchList
        v-model:selected="selectedTournamentKey"
        :matches="filteredMatches"
        :teams="teamsStore.teams"
        :tournament-options="tournamentOptions"
      />
    </div>
  </div>
</template>

<style scoped>
/* Every card header on this page picks up the team's colour. */
.stack :deep(.card-header) {
  border-left-color: var(--rail-color, var(--accent));
}
</style>
