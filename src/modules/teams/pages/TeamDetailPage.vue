<script setup lang="ts">
import { computed, ref } from "vue"
import { useRoute, useRouter } from "vue-router"
import { useI18n } from "vue-i18n"
import { Swiper, SwiperSlide } from "swiper/vue"
import "swiper/css"
import { ArrowLeft, BarChart3, CalendarDays, Users } from "@lucide/vue"
import { useTeamsStore } from "../store"
import { useTournamentStore } from "@/modules/tournament/store"
import { useTeamLookup } from "@/composables/useTeamLookup"
import {
  AppButton,
  AppCard,
  AppEmptyState,
  AppIcon,
  AppSectionHeader,
  AppTab,
  AppTabs,
} from "@/components/ui"
import { SeasonChart } from "@/modules/teams/components"
import {
  TeamFormRow,
  TeamHeaderCard,
  TeamMatchList,
  TeamSquadCard,
  TeamStatsGrid,
  TeamTrophyList,
} from "../components/detail"
import { useTeamMatchHistory } from "../composables/useTeamMatchHistory"
import { useTeamDetailTabs, type TeamTab } from "../composables/useTeamDetailTabs"
import { useFillViewportHeight } from "@/composables/useFillViewportHeight"

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const teamsStore = useTeamsStore()
const tournamentStore = useTournamentStore()
const { getTeamName } = useTeamLookup(() => teamsStore.teams)

const teamId = computed(() => route.params.id as string)
const team = computed(() => teamsStore.teams.find((t) => t.id === teamId.value))

const { matches, stats, recentForm, tournamentOptions, seasonStats } = useTeamMatchHistory(
  computed(() => tournamentStore.tournaments),
  teamId
)

const tournamentWins = computed(() =>
  tournamentStore.tournaments.filter((t) => t.winnerId === teamId.value)
)

// The tab surface is sized to the rest of the screen, so each panel scrolls
// inside itself instead of growing the page.
const tabSurface = ref<HTMLElement | null>(null)
const { height: tabSurfaceHeight } = useFillViewportHeight(tabSurface)

const selectedTournamentKey = ref("all")

const filteredMatches = computed(() => {
  if (selectedTournamentKey.value === "all") return matches.value
  const [name, season] = selectedTournamentKey.value.split("|")
  return matches.value.filter(
    (m) => m.tournamentName === name && m.tournamentSeason === Number(season)
  )
})

const {
  activeTab,
  changeTab,
  visibleTabs,
  activeIndex,
  isTabRendered,
  onSwiperReady,
  onSlideChange,
} = useTeamDetailTabs()

const tabValue = computed({
  get: () => activeTab.value,
  set: (v) => changeTab(v as TeamTab),
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

    <div v-else class="stack" :style="{ '--rail-color': team.color, gap: 0 }">
      <TeamHeaderCard :team="team" @back="router.back()" />

      <AppTabs v-model="tabValue" style="margin-top: var(--sp-4)">
        <AppTab value="overview">
          <AppIcon :icon="BarChart3" />
          {{ t("teams.detail.tabs.overview") }}
        </AppTab>
        <AppTab value="squad">
          <AppIcon :icon="Users" />
          {{ t("players.squadTitle") }}
        </AppTab>
        <AppTab value="matches">
          <AppIcon :icon="CalendarDays" />
          {{ t("teams.detail.tabs.matches") }}
        </AppTab>
      </AppTabs>

      <div ref="tabSurface" class="tab-surface" :style="{ height: tabSurfaceHeight }">
        <Swiper
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
            <template v-if="isTabRendered(tab)">
              <div v-if="tab === 'overview'" class="tab-panel">
                <TeamStatsGrid :stats="stats" :titles="tournamentWins.length" />

                <TeamFormRow
                  v-if="matches.length"
                  :form="recentForm"
                  :get-team-name="getTeamName"
                />

                <div v-if="seasonStats.length >= 1" class="section">
                  <AppSectionHeader :title="t('teams.detail.seasonHistory')">
                    <template #actions>
                      <span class="count">
                        {{ seasonStats.length }}
                        {{
                          seasonStats.length === 1 ? t("common.season", 1) : t("common.season", 2)
                        }}
                      </span>
                    </template>
                  </AppSectionHeader>
                  <div class="section-body">
                    <SeasonChart :stats="seasonStats" />
                  </div>
                </div>

                <TeamTrophyList v-if="tournamentWins.length" :wins="tournamentWins" />
              </div>

              <div v-else-if="tab === 'squad'" class="tab-panel tab-panel--flush">
                <TeamSquadCard :team-id="team.id" :team-color="team.color" />
              </div>

              <div v-else class="tab-panel tab-panel--flush">
                <TeamMatchList
                  v-model:selected="selectedTournamentKey"
                  :matches="filteredMatches"
                  :teams="teamsStore.teams"
                  :tournament-options="tournamentOptions"
                />
              </div>
            </template>
          </SwiperSlide>
        </Swiper>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tab-surface {
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  background: var(--surface);
  overflow: hidden;
}

/* The surface carries a measured static height, so the swiper's own
   height: 100% chain (swiper → wrapper → slide) resolves without autoHeight. */
.tab-swiper {
  height: 100%;
}

.tab-panel {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  min-width: 0;
  height: 100%;
  padding: var(--sp-3);
  /* Both axes are named on purpose: a lone overflow-y turns overflow-x into
     auto, and a horizontal scroller here would eat the swipe. */
  overflow-x: hidden;
  overflow-y: auto;
}

.tab-panel--flush {
  padding: 0;
}

.section-body {
  padding: var(--sp-3) var(--sp-4);
}

.count {
  font-size: var(--fs-xs);
  font-weight: 400;
  text-transform: none;
  letter-spacing: normal;
  color: var(--text-muted);
}

@media (max-width: 600px) {
  .tab-panel {
    padding: var(--sp-2);
    gap: var(--sp-2);
  }
}
</style>
