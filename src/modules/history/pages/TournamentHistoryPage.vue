<script setup lang="ts">
import { computed, ref } from "vue"
import { useRoute, RouterLink } from "vue-router"
import { useTournamentStore } from "@/modules/tournament/store"
import { isLeagueLike } from "@/engine"
import { ArrowLeft, Trophy, Medal, BarChart3, Table2, Users, Goal } from "@lucide/vue"
import { useI18n } from "vue-i18n"
import { Swiper, SwiperSlide } from "swiper/vue"
import "swiper/css"
import { AppChip, AppEmptyState, AppIcon, AppTab, AppTabs } from "@/components/ui"
import {
  ChampionsTab,
  AllFinalsTab,
  LeagueSeasonsTab,
  LeagueAllTimeTab,
  StatisticsTab,
  TeamStatsTab,
  PlayersTab,
} from "@/modules/history/components"
import { useTournamentHistoryStats } from "../composables/useTournamentHistoryStats"
import { useHistoryPlayerStats } from "../composables/useHistoryPlayerStats"
import { useHistoryTabs, type HistoryTab } from "../composables/useHistoryTabs"
import { useFillViewportHeight } from "@/composables/useFillViewportHeight"

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

const first = computed(() => allSeasons.value[0])
const isLeagueSeries = computed(() => !!first.value && isLeagueLike(first.value))

// The tab surface is sized to the rest of the screen, so each panel scrolls
// inside itself instead of growing the page.
const tabSurface = ref<HTMLElement | null>(null)
const { height: tabSurfaceHeight } = useFillViewportHeight(tabSurface)

const { champions, finals, leagueSeasons, allTimeRows, stats, teamStats } =
  useTournamentHistoryStats(completedSeasons)

const { playerRows } = useHistoryPlayerStats(completedSeasons)

const {
  activeTab,
  changeTab,
  visibleTabs,
  activeIndex,
  isTabRendered,
  onSwiperReady,
  onSlideChange,
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
        <AppTab value="players">
          <AppIcon :icon="Goal" />
          {{ t("history.tabs.players") }}
        </AppTab>
      </AppTabs>

      <div ref="tabSurface" class="tab-surface" :style="{ height: tabSurfaceHeight }">
        <Swiper
          :key="visibleTabs.join('|')"
          class="tab-swiper"
          :initial-slide="activeIndex"
          :auto-height="false"
          :speed="300"
          :threshold="10"
          :space-between="10"
          css-mode
          @swiper="onSwiperReady"
          @slide-change="onSlideChange"
        >
          <SwiperSlide v-for="tab in visibleTabs" :key="tab">
            <div v-if="isTabRendered(tab)" class="tab-panel">
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
              <TeamStatsTab v-else-if="tab === 'teams'" :teams="teamStats" />
              <PlayersTab v-else :players="playerRows" />
            </div>
          </SwiperSlide>
        </Swiper>
      </div>
    </template>
  </div>
</template>

<style scoped>
.tab-surface {
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  background: var(--surface);
  box-shadow: var(--elev-1);
  overflow: hidden;
}

/* The surface carries a measured static height, so the swiper's own
   height: 100% chain (swiper → wrapper → slide) resolves without autoHeight. */
.tab-swiper {
  height: 100%;
}

.tab-panel {
  min-width: 0;
  height: 100%;
  padding: var(--sp-3);
  /* Both axes are named on purpose: a lone overflow-y turns overflow-x into
     auto, and a horizontal scroller here would eat the swipe. */
  overflow-x: hidden;
  overflow-y: auto;
}

@media (max-width: 600px) {
  .tab-panel {
    padding: var(--sp-2);
  }
}
</style>
