<script setup lang="ts">
import { computed } from "vue"
import { useRoute, RouterLink } from "vue-router"
import { useTournamentStore } from "@/modules/tournament/store"
import { ArrowLeft, Trophy, Medal, BarChart3, Table2, Users } from "@lucide/vue"
import { useI18n } from "vue-i18n"
import { Swiper, SwiperSlide } from "swiper/vue"
import "swiper/css"
import { AppChip, AppEmptyState, AppIcon, AppTab, AppTabs } from "@/components/ui"
import ChampionsTab from "../components/ChampionsTab.vue"
import AllFinalsTab from "../components/AllFinalsTab.vue"
import LeagueSeasonsTab from "../components/LeagueSeasonsTab.vue"
import LeagueAllTimeTab from "../components/LeagueAllTimeTab.vue"
import StatisticsTab from "../components/StatisticsTab.vue"
import TeamStatsTab from "../components/TeamStatsTab.vue"
import { useTournamentHistoryStats } from "../composables/useTournamentHistoryStats"
import { useHistoryTabs, type HistoryTab } from "../composables/useHistoryTabs"

const route = useRoute()
const store = useTournamentStore()
const { t } = useI18n()

const name = computed(() => decodeURIComponent(route.params.name as string))

const allSeasons = computed(() =>
  store.tournaments.filter((t) => t.name === name.value).sort((a, b) => a.season - b.season)
)

const completedSeasons = computed(() =>
  allSeasons.value.filter((t) => store.isTournamentFinished(t.id))
)

const isLeagueSeries = computed(() => allSeasons.value[0]?.format === "league")

const { champions, finals, leagueSeasons, allTimeRows, stats, teamStats } =
  useTournamentHistoryStats(completedSeasons)

const {
  activeTab,
  changeTab,
  visibleTabs,
  activeIndex,
  isTabRendered,
  onSwiperReady,
  onSlideChange,
  onSlideChangeEnd,
} = useHistoryTabs(isLeagueSeries)

const tabValue = computed({
  get: () => activeTab.value,
  set: (v) => changeTab(v as HistoryTab),
})
</script>

<template>
  <div class="page">
    <div class="t-header">
      <RouterLink to="/history" class="back-link">
        <AppIcon :icon="ArrowLeft" />
        {{ t("history.title") }}
      </RouterLink>
      <div class="t-header-top">
        <h1>
          {{ name }}
          <AppChip square>
            {{ allSeasons.length }}
            {{ allSeasons.length === 1 ? t("common.season", 1) : t("common.season", 2) }}
          </AppChip>
        </h1>
      </div>
    </div>

    <AppEmptyState v-if="!completedSeasons.length" :description="t('history.noCompletedSeasons')" />

    <template v-else>
      <AppTabs v-model="tabValue">
        <AppTab value="champions">
          <AppIcon :icon="Trophy" />
          {{ t("history.tabs.champions") }}
        </AppTab>
        <AppTab value="finals">
          <AppIcon :icon="Medal" />
          {{ isLeagueSeries ? t("history.tabs.allSeasons") : t("history.tabs.allFinals") }}
        </AppTab>
        <AppTab v-if="isLeagueSeries" value="alltime">
          <AppIcon :icon="Table2" />
          {{ t("history.tabs.allTimeTable") }}
        </AppTab>
        <AppTab value="stats">
          <AppIcon :icon="BarChart3" />
          {{ t("history.tabs.statistics") }}
        </AppTab>
        <AppTab value="teams">
          <AppIcon :icon="Users" />
          {{ t("history.tabs.teams") }}
        </AppTab>
      </AppTabs>

      <Swiper
        style="height: 100%"
        :initial-slide="activeIndex"
        :auto-height="true"
        :speed="300"
        :threshold="10"
        @swiper="onSwiperReady"
        @slide-change="onSlideChange"
        @slide-change-transition-end="onSlideChangeEnd"
      >
        <SwiperSlide v-for="tab in visibleTabs" :key="tab">
          <template v-if="isTabRendered(tab)">
            <ChampionsTab
              v-if="tab === 'champions'"
              :champions="champions"
              :finals-label="isLeagueSeries ? 'Runner-up' : undefined"
            />
            <LeagueSeasonsTab
              v-else-if="tab === 'finals' && isLeagueSeries"
              :seasons="leagueSeasons"
            />
            <AllFinalsTab v-else-if="tab === 'finals'" :finals="finals" />
            <LeagueAllTimeTab v-else-if="tab === 'alltime'" :rows="allTimeRows" />
            <StatisticsTab v-else-if="tab === 'stats'" :stats="stats" />
            <TeamStatsTab v-else :teams="teamStats" />
          </template>
        </SwiperSlide>
      </Swiper>
    </template>
  </div>
</template>
