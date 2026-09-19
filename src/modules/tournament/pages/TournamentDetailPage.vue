<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { useRouter } from "vue-router"
import { useI18n } from "vue-i18n"
import { Swiper, SwiperSlide } from "swiper/vue"
import "swiper/css"

import { BracketPanel } from "@/modules/tournament/components/bracket"
import { GroupStage, GroupDraw, WildcardRankings } from "@/modules/tournament/components/group"
import { LeagueView } from "@/modules/tournament/components/league"
import { FixturesPanel } from "@/modules/tournament/components/fixture"
import { ParticipantsTable } from "@/modules/tournament/components/participants"
import { ManualDraw, PlayoffManualDraw } from "@/modules/tournament/components/draw"
import { TournamentStats } from "@/modules/tournament/components/stats"
import { DrawCeremony } from "@/modules/tournament/components/draw-ceremony"
import { AppModal, AppSubTabBar } from "@/components/ui"
import { DetailHeader, DetailPhaseTabs, DetailMultiTierModal, phaseIdOf } from "../components/detail"
import { advancablePhases } from "@/engine"
import { phaseTournamentView } from "../utils/phaseView"
import { ManagerTeamPanel, ManagerTeamPickerModal } from "../components/manager"
import { PhasePanel } from "../components/phases"
import { hasPendingManagedFixture } from "../utils/managerFixtures"
import { useTournamentDetail } from "../composables/useTournamentDetail"
import { useTournamentTabs } from "../composables/useTournamentTabs"
import { useTournamentCeremonies } from "../composables/useTournamentCeremonies"
import { useFillViewportHeight } from "@/composables/useFillViewportHeight"

const { t: trns } = useI18n()
const router = useRouter()

const {
  store,
  allTeams,
  tournament,
  seasons,
  switchSeason,
  startNewSeason,
  startNewLeagueSeason,
  hasAnyResults,
} = useTournamentDetail()

const isFinished = computed(
  () => !!tournament.value && store.isTournamentFinished(tournament.value.id)
)

/**
 * Managing a side means managing all of its matches, so "simulate everything"
 * stays out of reach while one of them is outstanding. The store refuses it
 * either way — this is only so the button says why.
 */
const managerBlocked = computed(
  () => !!tournament.value?.manager && hasPendingManagedFixture(tournament.value)
)

/** Taking a job is only on offer before the season has played a match. */
const canBecomeManager = computed(
  () => !tournament.value?.manager && !isFinished.value && !hasAnyResults.value
)

const managedTeamName = computed(() => {
  const teamId = tournament.value?.manager?.teamId
  if (!teamId) return undefined
  return allTeams.value.find((tm) => tm.id === teamId)?.name
})

const showManagerPicker = ref(false)
function onManagerConfirmed() {
  showManagerPicker.value = false
  changeTab("manager")
}

// The tab surface is sized to the rest of the screen, so each panel scrolls
// inside itself instead of growing the page.
const tabSurface = ref<HTMLElement | null>(null)
const { height: tabSurfaceHeight } = useFillViewportHeight(tabSurface)

const {
  isMultiTier,
  activeTierIdx,
  activeTab,
  isCustom,
  orderedPhases,
  groupSubTab,
  isGroupFormat,
  hasWildcards,
  isLeagueFormat,
  isSwissFormat,
  hasLeaguePlayoff,
  bracketAllowed,
  bracketReady,
  changeTab,
  visibleTabs,
  activeIndex,
  isTabRendered,
  onSwiperReady,
  onSlideChange,
} = useTournamentTabs(tournament)

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
  onAdvancePhase,
  handlePlayoffManualConfirm,
} = useTournamentCeremonies(tournament, allTeams, startNewSeason, startNewLeagueSeason, isMultiTier)

const allGroupsDone = computed(
  () => tournament.value?.groups?.every((g) => g.matches.every((m) => m.result !== null)) ?? false
)





/** Phases whose sources are all finished and which have not been drawn yet. */
const readyPhases = computed(() => (tournament.value ? advancablePhases(tournament.value) : []))

function advanceNextPhase() {
  const next = readyPhases.value[0]
  if (next) onAdvancePhase(next.id)
}

const showAdvanceButton = computed(() => {
  if (isCustom.value) return readyPhases.value.length > 0
  return isGroupFormat.value && !tournament.value?.groupsDone && allGroupsDone.value
})

/** Phases with a fixture to show — a pending one has nothing yet. */
const startedPhases = computed(() => orderedPhases.value.filter((p) => p.status !== "pending"))

const fixturePhaseId = ref("")
watch(
  startedPhases,
  (phases) => {
    // Follow the graph forward as phases open up, unless the user has picked
    // one themselves and it is still there.
    if (phases.some((p) => p.id === fixturePhaseId.value)) return
    const live = phases.find((p) => p.status !== "done") ?? phases[phases.length - 1]
    fixturePhaseId.value = live?.id ?? ""
  },
  { immediate: true }
)

/** Only the phase whose fixtures are on screen — built here rather than for
 *  every phase at once, so a result in one does not rebuild the others. */
const fixturePhaseView = computed(() => {
  const t = tournament.value
  const phase = t?.phases?.find((x) => x.id === fixturePhaseId.value)
  return t && phase ? phaseTournamentView(t, phase) : undefined
})

const advanceLabel = computed(() => {
  const next = readyPhases.value[0]
  return next ? trns("tournament.phases.advance", { phase: next.name }) : undefined
})

const showStartPlayoffButton = computed(
  () =>
    isLeagueFormat.value &&
    !!leaguePlayoffData.value?.enabled &&
    !hasLeaguePlayoff.value &&
    canStartLeaguePlayoffFlow.value
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
        :is-finished="isFinished"
        :show-advance="showAdvanceButton"
        :advance-label="advanceLabel"
        :show-start-playoff="showStartPlayoffButton"
        :seasons="seasons"
        :current-season-id="tournament.id"
        :manager-blocked="managerBlocked"
        :can-become-manager="canBecomeManager"
        @back="router.push('/tournaments')"
        @open-new-season="openNewSeason"
        @open-manager-picker="showManagerPicker = true"
        @simulate-all="store.simulateTournament(tournament!.id)"
        @open-settings="router.push(`/tournaments/${tournament!.id}/settings`)"
        @advance="isCustom ? advanceNextPhase() : onAdvance()"
        @start-playoff="onStartLeaguePlayoff"
        @switch-season="switchSeason"
      />

      <DetailPhaseTabs
        :active-tab="activeTab"
        :is-league-format="isLeagueFormat"
        :is-group-format="isGroupFormat"
        :is-swiss-format="isSwissFormat"
        :bracket-allowed="bracketAllowed"
        :manager-team-name="managedTeamName"
        :phases="isCustom ? orderedPhases.map((p) => ({ id: p.id, name: p.name })) : undefined"
        @change-tab="changeTab"
      />

      <div ref="tabSurface" class="tab-surface" :style="{ height: tabSurfaceHeight }">
        <Swiper
          class="tab-swiper"
          :initial-slide="activeIndex"
          :auto-height="false"
          :speed="300"
          :threshold="10"
          :space-between="10"
          :no-swiping="true"
          no-swiping-class="swiper-no-swiping"
          css-mode
          @swiper="onSwiperReady"
          @slide-change="onSlideChange"
        >
          <SwiperSlide v-for="tab in visibleTabs" :key="tab">
            <template v-if="isTabRendered(tab)">
              <div v-if="tab === 'manager'" class="tab-panel">
                <ManagerTeamPanel :tournament-id="tournament.id" />
              </div>
              <!-- Custom format: one slide per phase. The panel resolves the
                   phase itself, so this page asks for it once instead of a
                   dozen times, and each phase re-renders on its own. -->
              <div v-else-if="phaseIdOf(tab)" class="tab-panel">
                <PhasePanel
                  :tournament="tournament"
                  :phase-id="phaseIdOf(tab)!"
                  :teams="allTeams"
                />
              </div>
              <div v-else-if="tab === 'league'" class="tab-panel">
                <template v-if="isMultiTier && tournament.tiers">
                  <div class="gs-subtab-row">
                    <AppSubTabBar
                      :options="
                        tournament.tiers.map((tier, ti) => ({
                          value: String(ti),
                          label: tier.name,
                        }))
                      "
                      :model-value="String(activeTierIdx)"
                      @update:model-value="(v) => changeTab('league', Number(v))"
                    />
                  </div>
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
                  />
                </template>
              </div>
              <div v-else-if="tab === 'groups'" class="tab-panel">
                <div v-if="hasWildcards" class="gs-subtab-row">
                  <AppSubTabBar
                    v-model="groupSubTab"
                    :options="[
                      { value: 'groups', label: trns('tournament.tabs.groups') },
                      { value: 'wildcards', label: trns('tournament.tabs.wildcards') },
                    ]"
                  />
                </div>
                <div class="gs-body">
                  <GroupStage
                    v-if="!hasWildcards || groupSubTab === 'groups'"
                    :tournament="tournament"
                    :teams="allTeams"
                  />
                  <WildcardRankings v-else :tournament="tournament" :teams="allTeams" />
                </div>
              </div>
              <div v-else-if="tab === 'fixtures'" class="tab-panel">
                <!-- Custom: one phase's fixtures at a time, picked the same way
                     a multi-tier league picks a division. -->
                <template v-if="isCustom">
                  <div v-if="startedPhases.length > 1" class="gs-subtab-row">
                    <AppSubTabBar
                      v-model="fixturePhaseId"
                      :options="startedPhases.map((p) => ({ value: p.id, label: p.name }))"
                    />
                  </div>
                  <FixturesPanel
                    v-if="fixturePhaseView"
                    :key="fixturePhaseId"
                    :tournament="fixturePhaseView"
                    :teams="allTeams"
                    :phase-id="fixturePhaseId"
                  />
                  <div v-else class="locked-panel">
                    {{ trns("tournament.phases.notStarted") }}
                  </div>
                </template>
                <FixturesPanel v-else :tournament="tournament" :teams="allTeams" />
              </div>
              <div v-else-if="tab === 'bracket'" class="tab-panel">
                <BracketPanel
                  v-if="bracketReady"
                  :tournament="tournament"
                  :teams="allTeams"
                  :title="trns('tournament.tabs.bracket')"
                />
                <div v-else class="locked-panel">
                  {{
                    trns(
                      isGroupFormat
                        ? "tournament.locked.bracketNeedsGroups"
                        : "tournament.locked.bracketNeedsPlayoff"
                    )
                  }}
                </div>
              </div>
              <div v-else-if="tab === 'stats'" class="tab-panel">
                <TournamentStats v-if="hasAnyResults" :tournament="tournament" :teams="allTeams" />
                <div v-else class="locked-panel">{{ trns("tournament.locked.stats") }}</div>
              </div>
              <!-- The table draws its own cell padding. -->
              <div v-else class="tab-panel tab-panel--flush">
                <ParticipantsTable :teams="allTeams" :tournament="tournament" />
              </div>
            </template>
          </SwiperSlide>
        </Swiper>
      </div>
    </template>

    <ManagerTeamPickerModal
      v-if="showManagerPicker && tournament"
      :tournament-id="tournament.id"
      @confirmed="onManagerConfirmed"
      @close="showManagerPicker = false"
    />

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
      :title="trns('leaguePlayoff.playoffDrawTitle')"
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
      :title="`${trns('tournament.newSeason')} — ${tournament?.name}`"
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

.tab-panel--flush {
  padding: 0;
}

.gs-subtab-row {
  margin-bottom: var(--sp-3);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.not-found {
  color: var(--text-muted);
}

.locked-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 160px;
  padding: var(--sp-4);
  text-align: center;
  color: var(--text-muted);
  font-size: var(--fs-sm);
}

@media (max-width: 600px) {
  .tab-panel {
    padding: var(--sp-2);
  }
}
</style>
