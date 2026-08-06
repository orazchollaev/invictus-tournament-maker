<script setup lang="ts">
import { computed } from "vue"
import { useRouter } from "vue-router"
import { useI18n } from "vue-i18n"
import { Swiper, SwiperSlide } from "swiper/vue"
import "swiper/css"

import BracketPanel from "@/modules/tournament/components/BracketPanel.vue"
import GroupStage from "@/modules/tournament/components/GroupStage.vue"
import LeagueView from "@/modules/tournament/components/LeagueView.vue"
import WildcardRankings from "@/modules/tournament/components/WildcardRankings.vue"
import ParticipantsTable from "@/modules/tournament/components/ParticipantsTable.vue"
import ManualDraw from "@/modules/tournament/components/ManualDraw.vue"
import PlayoffManualDraw from "@/modules/tournament/components/PlayoffManualDraw.vue"
import GroupDraw from "@/modules/tournament/components/GroupDraw.vue"
import TournamentStats from "@/modules/tournament/components/TournamentStats.vue"
import { DrawCeremony } from "@/modules/tournament/components/draw-ceremony"
import { AppCard, AppModal } from "@/components/ui"
import { DetailHeader, DetailPhaseTabs, DetailMultiTierModal } from "../components/detail"
import { useTournamentDetail } from "../composables/useTournamentDetail"
import { useTournamentTabs } from "../composables/useTournamentTabs"
import { useTournamentCeremonies } from "../composables/useTournamentCeremonies"

const { t: trns } = useI18n()
const router = useRouter()

const {
  store,
  allTeams,
  tournament,
  winnerTeam,
  dateStr,
  startNewSeason,
  startNewLeagueSeason,
  hasAnyResults,
} = useTournamentDetail()

const isFinished = computed(
  () => !!tournament.value && store.isTournamentFinished(tournament.value.id)
)

const {
  isMultiTier,
  activeTierIdx,
  activeTab,
  groupSubTab,
  isGroupFormat,
  hasWildcards,
  isLeagueFormat,
  hasLeaguePlayoff,
  changeTab,
  visibleTabs,
  activeIndex,
  isTabRendered,
  onSwiperReady,
  onSlideChange,
  onSlideChangeEnd,
} = useTournamentTabs(tournament, hasAnyResults)

const {
  showSeasonModal,
  showManualSeason,
  showMultiTierModal,
  showPlayoffManualDraw,
  showLeaguePlayoffManualDraw,
  showCeremony,
  ceremonyContext,
  ceremonyPots,
  ceremonyFixedPlan,
  ceremonyAction,
  showLeaguePlayoffControls,
  canStartLeaguePlayoffFlow,
  leaguePlayoffData,
  manualSeasonTeams,
  groupPlayoffQualifiers,
  leaguePlayoffQualifiers,
  openNewSeason,
  onCeremonyUseOldDraw,
  onCeremonyComplete,
  handleMultiTierSeasonConfirm,
  onStartLeaguePlayoff,
  handleLeaguePlayoffManualConfirm,
  handleManualSeasonConfirm,
  closeSeasonModal,
  handleQuickGroupDraw,
  onAdvance,
  handlePlayoffManualConfirm,
} = useTournamentCeremonies(
  tournament,
  allTeams,
  startNewSeason,
  startNewLeagueSeason,
  isMultiTier,
  activeTierIdx
)
</script>

<template>
  <div class="page">
    <div v-if="!tournament">
      <p class="not-found">
        {{ trns("tournament.notFound") }}
        <RouterLink to="/tournaments">
          {{ trns("common.back") }}
        </RouterLink>
      </p>
    </div>
    <template v-else>
      <DetailHeader
        :tournament="tournament"
        :winner-team="winnerTeam"
        :date-str="dateStr"
        :is-finished="isFinished"
        @open-new-season="openNewSeason"
        @simulate-all="store.simulateTournament(tournament!.id)"
        @open-settings="router.push(`/tournaments/${tournament!.id}/settings`)"
      />

      <DetailPhaseTabs
        :tournament="tournament"
        :active-tab="activeTab"
        :is-league-format="isLeagueFormat"
        :is-group-format="isGroupFormat"
        :is-multi-tier="isMultiTier"
        :active-tier-idx="activeTierIdx"
        :has-any-results="hasAnyResults"
        :has-league-playoff="hasLeaguePlayoff"
        @change-tab="changeTab"
      />

      <Swiper
        :key="visibleTabs.join('|')"
        style="height: 100%"
        :initial-slide="activeIndex"
        :auto-height="true"
        :speed="300"
        :threshold="10"
        :space-between="10"
        :no-swiping="true"
        no-swiping-class="swiper-no-swiping"
        css-mode
        @swiper="onSwiperReady"
        @slide-change="onSlideChange"
        @slide-change-transition-end="onSlideChangeEnd"
      >
        <SwiperSlide v-for="tab in visibleTabs" :key="tab">
          <template v-if="isTabRendered(tab)">
            <AppCard v-if="tab === 'league'" padding="md">
              <div
                v-if="
                  showLeaguePlayoffControls &&
                  leaguePlayoffData?.enabled &&
                  !hasLeaguePlayoff &&
                  canStartLeaguePlayoffFlow
                "
                class="lpc-actions"
              >
                <button
                  class="primary"
                  :disabled="!canStartLeaguePlayoffFlow"
                  @click="onStartLeaguePlayoff"
                >
                  {{ trns("leaguePlayoff.startPlayoff") }}
                </button>
                <span v-if="!canStartLeaguePlayoffFlow" class="lpc-hint">
                  {{ trns("leaguePlayoff.finishSeasonFirst") }}
                </span>
              </div>
              <template v-if="isMultiTier && tournament.tiers">
                <Transition name="tab" mode="out-in">
                  <LeagueView
                    :key="activeTierIdx"
                    :tournament="tournament"
                    :teams="allTeams"
                    :league-override="tournament.tiers[activeTierIdx]?.league"
                    :relegation-count-override="
                      activeTierIdx < tournament.tiers.length - 1
                        ? (tournament.promotionCount ?? 0)
                        : 0
                    "
                    :promotion-count="activeTierIdx > 0 ? (tournament.promotionCount ?? 0) : 0"
                    :playoff-qualifier-count="
                      activeTierIdx === 0 && leaguePlayoffData?.enabled
                        ? leaguePlayoffData.qualifierCount
                        : 0
                    "
                    @set-result="
                      (mdi, mi, h, a) =>
                        store.setTierResult(tournament!.id, activeTierIdx, mdi, mi, h, a)
                    "
                    @sim-match="
                      (mdi, mi) => store.simTierMatch(tournament!.id, activeTierIdx, mdi, mi)
                    "
                    @sim-matchday="
                      (mdi) => store.simTierMatchday(tournament!.id, activeTierIdx, mdi)
                    "
                    @sim-all="store.simAllTier(tournament!.id, activeTierIdx)"
                  />
                </Transition>
              </template>
              <template v-else>
                <LeagueView
                  :tournament="tournament"
                  :teams="allTeams"
                  :playoff-qualifier-count="
                    leaguePlayoffData?.enabled ? leaguePlayoffData.qualifierCount : 0
                  "
                  @set-result="
                    (mdi, mi, h, a) => store.setLeagueResult(tournament!.id, mdi, mi, h, a)
                  "
                  @sim-match="(mdi, mi) => store.simLeagueMatch(tournament!.id, mdi, mi)"
                  @sim-matchday="(mdi) => store.simLeagueMatchday(tournament!.id, mdi)"
                  @sim-all="store.simAllLeague(tournament!.id)"
                />
              </template>
            </AppCard>
            <AppCard v-else-if="tab === 'groups'" padding="none">
              <div v-if="hasWildcards" class="gs-subtab-row">
                <button
                  class="gs-subtab"
                  :class="{ active: groupSubTab === 'groups' }"
                  @click="groupSubTab = 'groups'"
                >
                  {{ trns("tournament.tabs.groups") }}
                </button>
                <button
                  class="gs-subtab"
                  :class="{ active: groupSubTab === 'wildcards' }"
                  @click="groupSubTab = 'wildcards'"
                >
                  {{ trns("tournament.tabs.wildcards") }}
                </button>
              </div>
              <div class="gs-body">
                <GroupStage
                  v-if="!hasWildcards || groupSubTab === 'groups'"
                  :tournament="tournament"
                  :teams="allTeams"
                  @set-result="(gi, mi, h, a) => store.setGroupResult(tournament!.id, gi, mi, h, a)"
                  @sim-match="(gi, mi) => store.simGroupMatch(tournament!.id, gi, mi)"
                  @sim-group="(gi) => store.simGroup(tournament!.id, gi)"
                  @sim-group-week="(gi) => store.simGroupWeek(tournament!.id, gi)"
                  @sim-week="store.simWeek(tournament!.id)"
                  @sim-all="store.simAllGroups(tournament!.id)"
                  @advance="onAdvance"
                />
                <WildcardRankings v-else :tournament="tournament" :teams="allTeams" />
              </div>
            </AppCard>
            <div v-else-if="tab === 'bracket'">
              <BracketPanel
                :tournament="tournament"
                :teams="allTeams"
                :title="
                  isGroupFormat ? trns('tournament.tabs.bracket') : trns('tournament.tabs.bracket')
                "
              />
            </div>
            <AppCard v-else-if="tab === 'stats'">
              <TournamentStats :tournament="tournament" :teams="allTeams" />
            </AppCard>
            <AppCard v-else>
              <ParticipantsTable :teams="allTeams" :tournament="tournament" />
            </AppCard>
          </template>
        </SwiperSlide>
      </Swiper>
    </template>

    <DrawCeremony
      v-if="showCeremony && ceremonyContext"
      :title="trns('drawCeremony.title')"
      :context="ceremonyContext"
      :teams="allTeams"
      :initial-pots="ceremonyPots"
      :fixed-plan="ceremonyFixedPlan"
      :previous-team-ids="ceremonyAction === 'season' ? tournament?.teamIds : undefined"
      :all-available-teams="ceremonyAction === 'season' ? allTeams : undefined"
      @complete="onCeremonyComplete"
      @use-old-draw="onCeremonyUseOldDraw"
      @cancel="showCeremony = false"
    />

    <DetailMultiTierModal
      v-if="showMultiTierModal && tournament?.tiers"
      :tournament="tournament"
      :all-teams="allTeams"
      @confirm="handleMultiTierSeasonConfirm"
      @close="showMultiTierModal = false"
    />

    <AppModal
      v-if="showPlayoffManualDraw && tournament"
      title="Playoff Draw"
      :width="'min(680px, calc(100vw - 32px))'"
      @close="showPlayoffManualDraw = false"
    >
      <PlayoffManualDraw
        :qualifiers="groupPlayoffQualifiers"
        :teams="allTeams"
        @confirm="handlePlayoffManualConfirm"
        @cancel="showPlayoffManualDraw = false"
      />
    </AppModal>

    <AppModal
      v-if="showLeaguePlayoffManualDraw && tournament"
      :title="trns('leaguePlayoff.playoffDrawTitle')"
      :width="'min(680px, calc(100vw - 32px))'"
      @close="showLeaguePlayoffManualDraw = false"
    >
      <PlayoffManualDraw
        :qualifiers="leaguePlayoffQualifiers"
        :teams="allTeams"
        @confirm="handleLeaguePlayoffManualConfirm"
        @cancel="showLeaguePlayoffManualDraw = false"
      />
    </AppModal>

    <AppModal
      v-if="showSeasonModal"
      :title="`New Season — ${tournament?.name}`"
      :width="showManualSeason && isGroupFormat ? 'min(680px, calc(100vw - 32px))' : undefined"
      @close="closeSeasonModal"
    >
      <template v-if="showManualSeason && isGroupFormat">
        <GroupDraw
          :teams="manualSeasonTeams"
          :group-count="tournament?.groups?.length ?? 2"
          @confirm="handleManualSeasonConfirm"
          @cancel="closeSeasonModal"
          @quick-draw="handleQuickGroupDraw"
        />
      </template>
      <template v-else-if="showManualSeason">
        <ManualDraw
          :teams="manualSeasonTeams"
          @confirm="handleManualSeasonConfirm"
          @cancel="closeSeasonModal"
        />
      </template>
    </AppModal>
  </div>
</template>

<style scoped>
.lpc-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.lpc-hint {
  font-size: 12px;
  color: var(--text-muted);
}

.gs-subtab-row {
  display: flex;
  gap: 2px;
  padding: 6px 8px 0;
  border-bottom: 1px solid var(--border-light);
}
.gs-subtab {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 10px 5px;
  border: none;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: 0;
  margin-bottom: -1px;
}
.gs-subtab:hover {
  color: var(--text);
}
.gs-subtab.active {
  color: var(--text);
  border-bottom-color: var(--accent);
}

.not-found {
  color: var(--text-muted);
}

.gs-body {
  padding: 8px 0;
}

@media (max-width: 640px) {
  .page {
    padding-bottom: 40px;
  }
}
</style>

<style>
.swiper-wrapper {
  height: 100%;
}
</style>
