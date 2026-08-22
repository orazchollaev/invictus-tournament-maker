<script setup lang="ts">
/**
 * The Stats tab, now two panels: how the teams did, and how the players
 * did. This file is only the switch — each panel owns its own content, so
 * neither has to know the other exists.
 */
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import { ChartColumn, Users } from "@lucide/vue"
import { SubTabBar } from "@/components/ui"
import type { Tournament } from "../types"
import type { Team } from "@/modules/teams/types"
import TeamStatsPanel from "./stats/TeamStatsPanel.vue"
import PlayerStatsPanel from "./stats/PlayerStatsPanel.vue"

const props = defineProps<{
  tournament: Tournament
  teams: Team[]
}>()

const { t } = useI18n()

type StatsView = "teams" | "players"
const view = ref<StatsView>("teams")

const options = computed(() => [
  { value: "teams", label: t("stats.teamStats"), icon: ChartColumn },
  { value: "players", label: t("stats.playerStats"), icon: Users },
])
</script>

<template>
  <div class="stats-tab">
    <SubTabBar
      :options="options"
      :model-value="view"
      @update:model-value="(v) => (view = v as StatsView)"
    />

    <TeamStatsPanel v-if="view === 'teams'" :tournament="props.tournament" :teams="props.teams" />
    <PlayerStatsPanel v-else :tournament="props.tournament" :teams="props.teams" />
  </div>
</template>

<style scoped>
.stats-tab {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}
</style>
