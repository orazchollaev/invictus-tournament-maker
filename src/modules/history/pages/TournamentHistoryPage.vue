<script setup lang="ts">
import { computed } from "vue"
import { useRoute, RouterLink } from "vue-router"
import { useTournamentStore } from "@/modules/tournament/store"
import { ArrowLeft, Trophy, Medal, BarChart3, Table2, Users } from "@lucide/vue"
import { useI18n } from "vue-i18n"
import { TabsRoot, TabsList, TabsTrigger } from "reka-ui"
import { Swiper, SwiperSlide } from "swiper/vue"
import "swiper/css"
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

const { activeTab, changeTab, visibleTabs, activeIndex, onSwiperReady, onSlideChange } =
  useHistoryTabs(isLeagueSeries)

const tabValue = computed({
  get: () => activeTab.value,
  set: (v) => changeTab(v as HistoryTab),
})
</script>

<template>
  <div class="page">
    <!-- Header -->
    <div class="t-header">
      <RouterLink to="/history" class="back-link">
        <ArrowLeft :size="13" />
        {{ t("history.title") }}
      </RouterLink>
      <div class="t-header-top">
        <h1>
          {{ name }}
          <span class="t-season">
            {{ allSeasons.length }}
            {{ allSeasons.length === 1 ? t("common.season", 1) : t("common.season", 2) }}
          </span>
        </h1>
      </div>
    </div>

    <p v-if="!completedSeasons.length" class="empty-text">{{ t("history.noCompletedSeasons") }}</p>

    <template v-else>
      <!-- Phase tabs -->
      <TabsRoot v-model:model-value="tabValue">
        <TabsList class="phase-tabs">
          <TabsTrigger class="phase-tab" value="champions">
            <Trophy :size="13" />
            {{ t("history.tabs.champions") }}
          </TabsTrigger>
          <TabsTrigger class="phase-tab" value="finals">
            <Medal :size="13" />
            {{ isLeagueSeries ? t("history.tabs.allSeasons") : t("history.tabs.allFinals") }}
          </TabsTrigger>
          <TabsTrigger v-if="isLeagueSeries" class="phase-tab" value="alltime">
            <Table2 :size="13" />
            {{ t("history.tabs.allTimeTable") }}
          </TabsTrigger>
          <TabsTrigger class="phase-tab" value="stats">
            <BarChart3 :size="13" />
            {{ t("history.tabs.statistics") }}
          </TabsTrigger>
          <TabsTrigger class="phase-tab" value="teams">
            <Users :size="13" />
            {{ t("history.tabs.teams") }}
          </TabsTrigger>
        </TabsList>
      </TabsRoot>

      <Swiper
        :initial-slide="activeIndex"
        :auto-height="true"
        :speed="300"
        :threshold="10"
        @swiper="onSwiperReady"
        @slide-change="onSlideChange"
      >
        <SwiperSlide v-for="tab in visibleTabs" :key="tab">
          <ChampionsTab
            v-if="tab === 'champions'"
            :champions="champions"
            :finals-label="isLeagueSeries ? 'Runner-up' : undefined"
          />
          <LeagueSeasonsTab v-else-if="tab === 'finals' && isLeagueSeries" :seasons="leagueSeasons" />
          <AllFinalsTab v-else-if="tab === 'finals'" :finals="finals" />
          <LeagueAllTimeTab v-else-if="tab === 'alltime'" :rows="allTimeRows" />
          <StatisticsTab v-else-if="tab === 'stats'" :stats="stats" />
          <TeamStatsTab v-else :teams="teamStats" />
        </SwiperSlide>
      </Swiper>
    </template>
  </div>
</template>
