<script setup lang="ts">
import { ref, computed, watch } from "vue"
import { useRouter } from "vue-router"
import { useTeamsStore } from "@/modules/teams/store"
import { useTournamentStore } from "@/modules/tournament/store"
import { useSettingsStore } from "@/modules/settings/store"
import { ManualDraw } from "../components/draw"
import { GroupDraw } from "../components/group"
import { TeamSelector, TeamSelectorFullscreenModal } from "../components/shared"
import { DrawCeremony } from "../components/draw-ceremony"
import { Shuffle, ArrowLeft, ChevronDown, LayoutGrid, Trophy, List, Maximize2 } from "@lucide/vue"
import { randomTournamentName } from "@/composables/useRandomNames"
import { useHaptic } from "@/composables/useHaptic"
import type { CeremonyContext, DrawMode } from "@/engine"
import type {
  KnockoutStage,
  LegMode,
  PlayoffSeedMode,
  Tiebreaker,
  LeaguePlayoffSeedMode,
  TournamentFormat,
} from "@/modules/tournament/types"
import {
  CreateFormatSelector,
  CreateKnockoutConfigModal,
  CreateLeagueConfigModal,
} from "../components/create"
import { GroupConfigModal, SwissConfigModal } from "../components/config"
import type { GroupConfigPayload } from "../components/config"
import type { KnockoutConfigPayload } from "../components/create/CreateKnockoutConfigModal.vue"
import type { LeagueConfigPayload } from "../components/create/CreateLeagueConfigModal.vue"
import type { SwissConfigPayload } from "../components/config"
import { randomSeed, validateSwissConfig } from "@/engine"
import { SettingsTeamAdjustments } from "../components/settings"
import { AppButton, AppConfigButton, AppIcon } from "@/components/ui"
import { useI18n } from "vue-i18n"
import { logEvent } from "@/composables/useAnalytics"

type DrawType = "random" | "seeded" | "manual"

const router = useRouter()
const teamsStore = useTeamsStore()
const store = useTournamentStore()
const settingsStore = useSettingsStore()

const name = ref("")
const selected = ref<string[]>([])
const showTeamsFullscreen = ref(false)
const format = ref<TournamentFormat>("bracket")
const drawType = ref<DrawType>(settingsStore.newSeasonDrawType)
const groupCount = ref(4)
const qualifiersPerGroup = ref(2)
const wildcardCount = ref(0)
const showManualDraw = ref(false)
const showCeremony = ref(false)
const ceremonyContext = ref<CeremonyContext | null>(null)
// Picked when a Swiss ceremony opens so the animated reveal and the fixture
// that gets committed on completion come from one seed; cleared after create.
const pendingSwissSeed = ref<number | null>(null)
const hasThirdPlace = ref(false)
const playoffSeedMode = ref<PlayoffSeedMode>(settingsStore.newSeasonPlayoffSeedMode)
const groupLegMode = ref<LegMode>(settingsStore.groupLegMode)
const KNOCKOUT_STAGES: KnockoutStage[] = ["r64", "r32", "r16", "quarterfinal", "semifinal"]
const roundLegModes = ref<Record<KnockoutStage, LegMode>>(
  Object.fromEntries(KNOCKOUT_STAGES.map((s) => [s, settingsStore.knockoutLegMode])) as Record<
    KnockoutStage,
    LegMode
  >
)
const thirdPlaceLegMode = ref<LegMode>(settingsStore.knockoutLegMode)
const finalLegMode = ref<LegMode>(settingsStore.finalLegMode)
const leagueLegMode = ref<LegMode>("single")
// Swiss defaults mirror the Champions League league phase.
const swissOpponentCount = ref(8)
const swissPotCount = ref(4)
const swissLegMode = ref<LegMode>("single")
const swissBalanceHomeAway = ref(true)
const swissDrawType = ref<"random" | "seeded">("seeded")
const tiebreaker = ref<Tiebreaker>(settingsStore.tiebreaker)
const winPoints = ref(settingsStore.winPoints)
const drawPoints = ref(settingsStore.drawPoints)
const lossPoints = ref(settingsStore.lossPoints)
const tierCount = ref(1)
const tierAssignments = ref<Record<string, number>>({})
const promotionCount = ref(1)
const playoffEnabled = ref(false)
const playoffQualifierCount = ref(4)
const leaguePlayoffSeedMode = ref<LeaguePlayoffSeedMode>("seeded")
const teamPointAdjustments = ref<Record<string, number>>({})
const teamPowerAdjustments = ref<Record<string, number>>({})

const { t } = useI18n()
const { success: hapticSuccess } = useHaptic()

const allTeams = computed(() => teamsStore.teams)
const selectedTeams = computed(() => allTeams.value.filter((t) => selected.value.includes(t.id)))
// Swiss is the one format whose settings can describe an impossible fixture,
// so creation stays blocked until the shape validates.
const swissErrors = computed(() =>
  format.value === "swiss"
    ? validateSwissConfig(
        selectedTeams.value.length,
        swissOpponentCount.value,
        swissDrawType.value === "seeded" ? swissPotCount.value : 1
      )
    : []
)
const canCreate = computed(
  () => !!name.value.trim() && selected.value.length >= 2 && swissErrors.value.length === 0
)
const showAdjustments = ref(false)

// Phase configuration modals — opened from the AppConfigButton rows below the
// format cards. Each modal edits a local draft and only writes back to these
// page-level refs (via its "save" event) when the user actually hits Save;
// closing any other way (X, backdrop, Escape) discards the draft.
const showGroupModal = ref(false)
const showKnockoutModal = ref(false)
const showLeagueModal = ref(false)
const showSwissModal = ref(false)
const maxPlayoffQualifiers = computed(() => Math.max(2, selectedTeams.value.length))
// Estimated size of the knockout bracket, used only to decide which round
// rows (r64…semifinal) the knockout config modal shows.
const bracketTeamCount = computed(() => {
  if (format.value === "group+bracket") {
    return groupCount.value * qualifiersPerGroup.value + wildcardCount.value
  }
  if (format.value === "league" || format.value === "swiss") return playoffQualifierCount.value
  return selectedTeams.value.length
})

const groupConfigSummary = computed(() => {
  const base = t("tournament.create.config.groupsAndAdvance", {
    groups: groupCount.value,
    advance: qualifiersPerGroup.value * groupCount.value,
  })
  if (wildcardCount.value <= 0) return base
  return `${base} · ${t("tournament.create.config.wildcardsShort", { n: wildcardCount.value })}`
})
const knockoutConfigSummary = computed(() => {
  if (format.value === "league" || format.value === "swiss") {
    return t("tournament.create.config.playoffShort", { n: playoffQualifierCount.value })
  }
  const seedLabels: Record<string, string> = {
    cross: t("tournament.create.cross"),
    "no-same-group": t("tournament.create.noRematch"),
    random: t("common.random"),
    manual: t("common.manual"),
  }
  const drawLabel =
    format.value === "group+bracket"
      ? seedLabels[playoffSeedMode.value]
      : t(`common.${drawType.value}`)
  const thirdPlace = hasThirdPlace.value
    ? t("tournament.create.config.thirdPlaceOn")
    : t("tournament.create.config.noThirdPlace")
  return `${drawLabel} · ${thirdPlace}`
})
const swissConfigSummary = computed(() => {
  const opponents = t("tournament.create.config.swissOpponentsShort", {
    n: swissOpponentCount.value,
  })
  const draw =
    swissDrawType.value === "seeded" && swissPotCount.value > 1
      ? t("tournament.create.config.swissPotsShort", { n: swissPotCount.value })
      : t("common.random")
  return opponents + " · " + draw
})
const leagueConfigSummary = computed(() =>
  tierCount.value > 1
    ? t("tournament.create.config.divisionsShort", { n: tierCount.value })
    : t("tournament.create.config.singleDivisionShort")
)

function applyGroupConfig(payload: GroupConfigPayload) {
  drawType.value = payload.drawType
  groupCount.value = payload.groupCount
  qualifiersPerGroup.value = payload.qualifiersPerGroup
  wildcardCount.value = payload.wildcardCount
  groupLegMode.value = payload.groupLegMode
  tiebreaker.value = payload.tiebreaker
  winPoints.value = payload.winPoints
  drawPoints.value = payload.drawPoints
  lossPoints.value = payload.lossPoints
}

function applyKnockoutConfig(payload: KnockoutConfigPayload) {
  if (format.value !== "group+bracket") drawType.value = payload.drawType
  hasThirdPlace.value = payload.hasThirdPlace
  roundLegModes.value = payload.roundLegModes
  thirdPlaceLegMode.value = payload.thirdPlaceLegMode
  finalLegMode.value = payload.finalLegMode
  playoffQualifierCount.value = payload.playoffQualifierCount
  leaguePlayoffSeedMode.value = payload.leaguePlayoffSeedMode
  playoffSeedMode.value = payload.groupPlayoffSeedMode
}

function applySwissConfig(payload: SwissConfigPayload) {
  swissOpponentCount.value = payload.opponentCount
  swissPotCount.value = payload.potCount
  swissLegMode.value = payload.legMode
  swissBalanceHomeAway.value = payload.balanceHomeAway
  swissDrawType.value = payload.drawType === "random" ? "random" : "seeded"
  drawType.value = swissDrawType.value
  tiebreaker.value = payload.tiebreaker
  winPoints.value = payload.winPoints
  drawPoints.value = payload.drawPoints
  lossPoints.value = payload.lossPoints
}

function applyLeagueConfig(payload: LeagueConfigPayload) {
  leagueLegMode.value = payload.leagueLegMode
  tierCount.value = payload.tierCount
  tierAssignments.value = payload.tierAssignments
  promotionCount.value = payload.promotionCount
  tiebreaker.value = payload.tiebreaker
  winPoints.value = payload.winPoints
  drawPoints.value = payload.drawPoints
  lossPoints.value = payload.lossPoints
}

const tierNames = computed(() => {
  const names: string[] = []
  for (let i = 0; i < tierCount.value; i++) {
    names.push(i === 0 ? "Division 1" : `Division ${i + 1}`)
  }
  return names
})

const teamsPerTier = computed(() => {
  const buckets: string[][] = Array.from({ length: tierCount.value }, () => [])
  for (const team of selectedTeams.value) {
    const tier = tierAssignments.value[team.id] ?? 0
    buckets[Math.min(tier, tierCount.value - 1)].push(team.id)
  }
  return buckets
})

/**
 * Picks a Swiss shape that is actually buildable for this many teams,
 * preferring the Champions League defaults (8 opponents, 4 pots) and stepping
 * down from there. Without this, selecting Swiss with, say, 10 teams would
 * leave the form in an invalid state the user has to go and fix by hand.
 */
function pickSwissDefaults(teamCount: number) {
  for (let opp = Math.min(8, teamCount - 1); opp >= 2; opp--) {
    for (const pots of [4, 3, 2, 1]) {
      if (!validateSwissConfig(teamCount, opp, pots).length) return { opp, pots }
    }
  }
  return { opp: 0, pots: 1 }
}

function applySwissDefaults() {
  const { opp, pots } = pickSwissDefaults(selectedTeams.value.length)
  if (!opp) return
  swissOpponentCount.value = opp
  swissPotCount.value = pots
}

watch(format, (f) => {
  if (f === "swiss") {
    drawType.value = swissDrawType.value
    applySwissDefaults()
    playoffQualifierCount.value = Math.max(
      2,
      Math.min(playoffQualifierCount.value, selectedTeams.value.length)
    )
    return
  }
  if (f === "league") return
  drawType.value =
    f === "group+bracket" ? settingsStore.newSeasonGroupDrawType : settingsStore.newSeasonDrawType
  if (f === "group+bracket") {
    playoffSeedMode.value = settingsStore.newSeasonPlayoffSeedMode
  }
})

// Changing the roster changes what shapes are possible, so re-pick rather
// than leaving a now-invalid config behind.
watch(
  () => selected.value.length,
  (count) => {
    if (format.value !== "swiss") return
    if (swissErrors.value.length) applySwissDefaults()
    playoffQualifierCount.value = Math.max(2, Math.min(playoffQualifierCount.value, count))
  }
)

function handleCreate() {
  if (!canCreate.value) return
  if (format.value === "league") {
    doCreate()
    return
  }
  // Swiss has no manual draw, so it goes straight to the ceremony or creation.
  if (format.value === "swiss") {
    if (settingsStore.drawCeremony) openCeremony()
    else doCreate()
    return
  }
  if (drawType.value === "manual") {
    showManualDraw.value = true
    return
  }
  if (settingsStore.drawCeremony) {
    openCeremony()
    return
  }
  doCreate()
}

function openCeremony() {
  if (format.value === "swiss") {
    pendingSwissSeed.value = randomSeed()
    ceremonyContext.value = {
      kind: "swiss",
      teams: selectedTeams.value,
      drawMode: swissDrawType.value as DrawMode,
      swiss: {
        opponentCount: swissOpponentCount.value,
        potCount: swissDrawType.value === "seeded" ? swissPotCount.value : 1,
        balanceHomeAway: swissBalanceHomeAway.value,
        seed: pendingSwissSeed.value,
      },
    }
    showCeremony.value = true
    return
  }
  ceremonyContext.value = {
    kind: format.value === "group+bracket" ? "group" : "bracket",
    teams: selectedTeams.value,
    drawMode: drawType.value as DrawMode,
    groupCount: format.value === "group+bracket" ? groupCount.value : undefined,
  }
  showCeremony.value = true
}

function onCeremonyComplete(orderedIds: string[]) {
  showCeremony.value = false
  doCreate(orderedIds)
}

function applyAdjustments(id: string) {
  for (const [teamId, val] of Object.entries(teamPointAdjustments.value)) {
    if (val !== 0) store.setTeamPointAdjustment(id, teamId, val)
  }
  for (const [teamId, val] of Object.entries(teamPowerAdjustments.value)) {
    if (val !== 0) store.setTeamPowerAdjustment(id, teamId, val)
  }
}

function applyLeaguePlayoffSettings(id: string) {
  if (!playoffEnabled.value) return
  store.changeLeaguePlayoffSettings(id, {
    enabled: true,
    qualifierCount: playoffQualifierCount.value,
    seedMode: leaguePlayoffSeedMode.value,
  })
  store.setLeaguePlayoffLegModes(
    id,
    settingsStore.knockoutLegMode,
    finalLegMode.value,
    roundLegModes.value
  )
}

function doCreate(orderedIds?: string[]) {
  hapticSuccess()
  if (format.value === "swiss") {
    const id = store.createSwiss(name.value.trim(), selected.value, {
      opponentCount: swissOpponentCount.value,
      potCount: swissPotCount.value,
      balanceHomeAway: swissBalanceHomeAway.value,
      legMode: swissLegMode.value,
      drawType: swissDrawType.value,
      seed: pendingSwissSeed.value ?? randomSeed(),
      playoffEnabled: true,
      playoffQualifierCount: playoffQualifierCount.value,
      playoffSeedMode: leaguePlayoffSeedMode.value,
      knockoutLegMode: settingsStore.knockoutLegMode,
      finalLegMode: finalLegMode.value,
      roundLegModes: roundLegModes.value,
      tiebreaker: tiebreaker.value,
      winPoints: winPoints.value,
      drawPoints: drawPoints.value,
      lossPoints: lossPoints.value,
    })
    pendingSwissSeed.value = null
    applyAdjustments(id)
    void logEvent("create_tournament", {
      format: "swiss",
      team_count: selectedTeams.value.length,
    })
    router.push("/tournaments/" + id)
    return
  }
  if (format.value === "league") {
    if (tierCount.value > 1) {
      const tierDefs = teamsPerTier.value.map((ids, i) => ({
        name: tierNames.value[i],
        teamIds: ids,
      }))
      const id = store.createMultiTierLeagueTournament(
        name.value.trim(),
        tierDefs,
        leagueLegMode.value,
        promotionCount.value,
        tiebreaker.value,
        winPoints.value,
        drawPoints.value,
        lossPoints.value
      )
      applyAdjustments(id)
      applyLeaguePlayoffSettings(id)
      void logEvent("create_tournament", {
        format: "league",
        team_count: selectedTeams.value.length,
      })
      router.push(`/tournaments/${id}`)
      return
    }
    const id = store.createLeagueTournament(
      name.value.trim(),
      selected.value,
      leagueLegMode.value,
      tiebreaker.value,
      winPoints.value,
      drawPoints.value,
      lossPoints.value
    )
    applyAdjustments(id)
    applyLeaguePlayoffSettings(id)
    void logEvent("create_tournament", {
      format: "league",
      team_count: selectedTeams.value.length,
    })
    router.push(`/tournaments/${id}`)
    return
  }
  const isGroup = format.value === "group+bracket"
  const gc = isGroup ? groupCount.value : undefined
  const qpg = isGroup ? qualifiersPerGroup.value : undefined
  const isSeeded = drawType.value === "seeded"
  const gLeg = isGroup ? groupLegMode.value : "single"
  const id = store.create(
    name.value.trim(),
    selected.value,
    isSeeded,
    orderedIds,
    gc,
    qpg,
    isGroup ? wildcardCount.value : 0,
    gLeg,
    settingsStore.knockoutLegMode,
    finalLegMode.value,
    tiebreaker.value,
    isGroup ? winPoints.value : undefined,
    isGroup ? drawPoints.value : undefined,
    isGroup ? lossPoints.value : undefined,
    roundLegModes.value,
    thirdPlaceLegMode.value
  )
  store.setDrawType(id, drawType.value)
  if (isGroup) store.setPlayoffSeedMode(id, playoffSeedMode.value)
  if (hasThirdPlace.value) store.toggleThirdPlace(id)
  applyAdjustments(id)
  void logEvent("create_tournament", {
    format: format.value,
    team_count: selectedTeams.value.length,
  })
  router.push(`/tournaments/${id}`)
}
</script>

<template>
  <div class="page">
    <!-- Page header -->
    <div class="ctp-header">
      <RouterLink to="/tournaments" class="back-link">
        <ArrowLeft :size="14" />
        {{ $t("tournaments.title") }}
      </RouterLink>
      <h2 class="ctp-title">{{ $t("tournaments.newBtn") }}</h2>
    </div>

    <!-- Manual draw overlay -->
    <template v-if="showManualDraw">
      <div class="form-card">
        <GroupDraw
          v-if="format === 'group+bracket'"
          :teams="selectedTeams"
          :group-count="groupCount"
          @confirm="(ids) => doCreate(ids)"
          @cancel="showManualDraw = false"
        />
        <ManualDraw
          v-else
          :teams="selectedTeams"
          @confirm="(ids) => doCreate(ids)"
          @cancel="showManualDraw = false"
        />
      </div>
    </template>

    <template v-else>
      <!-- Name -->
      <div class="form-card">
        <div class="form-section-title">{{ $t("tournament.create.name") }}</div>
        <div class="ctp-name-wrap">
          <input
            v-model="name"
            class="ctp-name-input"
            placeholder="e.g. Spring Championship 2025"
            @keyup.enter="handleCreate"
          />
          <button
            class="btn-random"
            :title="t('tournament.create.randomName')"
            @click="name = randomTournamentName()"
          >
            <Shuffle :size="14" />
          </button>
        </div>
      </div>

      <!-- Teams -->
      <div class="form-card">
        <div class="form-section-header">
          <div class="form-section-title">{{ $t("tournament.create.teams") }}</div>
          <AppButton
            variant="outlined"
            size="xs"
            :title="t('teamSelector.fullView')"
            @click="showTeamsFullscreen = true"
          >
            <AppIcon :icon="Maximize2" size="sm" />
          </AppButton>
        </div>
        <TeamSelector :teams="allTeams" :selected="selected" @update:selected="selected = $event" />
      </div>

      <TeamSelectorFullscreenModal
        v-model:open="showTeamsFullscreen"
        :teams="allTeams"
        :selected="selected"
        @update:selected="selected = $event"
      />

      <CreateFormatSelector
        v-model:format="format"
        v-model:playoff-enabled="playoffEnabled"
        v-model:group-count="groupCount"
        v-model:qualifiers-per-group="qualifiersPerGroup"
        :selected-count="selected.length"
      />

      <div class="form-card config-button-stack">
        <AppConfigButton
          v-if="format === 'group+bracket'"
          :icon="LayoutGrid"
          :label="t('tournament.create.config.group')"
          :summary="groupConfigSummary"
          @click="showGroupModal = true"
        />
        <AppConfigButton
          v-if="format === 'league'"
          :icon="List"
          :label="t('tournament.create.config.league')"
          :summary="leagueConfigSummary"
          @click="showLeagueModal = true"
        />
        <AppConfigButton
          v-if="format === 'swiss'"
          :icon="Shuffle"
          :label="t('tournament.create.config.swiss')"
          :summary="swissConfigSummary"
          @click="showSwissModal = true"
        />
        <p v-for="key in swissErrors" :key="key" class="ctp-swiss-error">
          {{ t(`tournament.create.swissConfig.errors.${key}`, { teams: selected.length }) }}
        </p>
        <AppConfigButton
          v-if="(format !== 'league' && format !== 'swiss') || playoffEnabled"
          :icon="Trophy"
          :label="t('tournament.create.config.knockout')"
          :summary="knockoutConfigSummary"
          @click="showKnockoutModal = true"
        />
      </div>

      <GroupConfigModal
        v-if="showGroupModal"
        :draw-type="drawType"
        :group-count="groupCount"
        :qualifiers-per-group="qualifiersPerGroup"
        :wildcard-count="wildcardCount"
        :group-leg-mode="groupLegMode"
        :tiebreaker="tiebreaker"
        :win-points="winPoints"
        :draw-points="drawPoints"
        :loss-points="lossPoints"
        :team-count="selected.length"
        @save="applyGroupConfig"
        @close="showGroupModal = false"
      />

      <CreateKnockoutConfigModal
        v-if="showKnockoutModal"
        :variant="format === 'league' || format === 'swiss' ? 'leaguePlayoff' : 'bracket'"
        :is-group-format="format === 'group+bracket'"
        :draw-type="drawType"
        :has-third-place="hasThirdPlace"
        :round-leg-modes="roundLegModes"
        :final-leg-mode="finalLegMode"
        :third-place-leg-mode="thirdPlaceLegMode"
        :playoff-qualifier-count="playoffQualifierCount"
        :league-playoff-seed-mode="leaguePlayoffSeedMode"
        :group-playoff-seed-mode="playoffSeedMode"
        :max-playoff-qualifiers="maxPlayoffQualifiers"
        :bracket-team-count="bracketTeamCount"
        :selected-count="selected.length"
        @save="applyKnockoutConfig"
        @close="showKnockoutModal = false"
      />

      <SwissConfigModal
        v-if="showSwissModal"
        :opponent-count="swissOpponentCount"
        :pot-count="swissPotCount"
        :leg-mode="swissLegMode"
        :balance-home-away="swissBalanceHomeAway"
        :draw-type="swissDrawType"
        :tiebreaker="tiebreaker"
        :win-points="winPoints"
        :draw-points="drawPoints"
        :loss-points="lossPoints"
        :team-count="selected.length"
        @save="applySwissConfig"
        @close="showSwissModal = false"
      />

      <CreateLeagueConfigModal
        v-if="showLeagueModal"
        :league-leg-mode="leagueLegMode"
        :tier-count="tierCount"
        :tier-assignments="tierAssignments"
        :promotion-count="promotionCount"
        :tiebreaker="tiebreaker"
        :win-points="winPoints"
        :draw-points="drawPoints"
        :loss-points="lossPoints"
        :selected-teams="selectedTeams"
        :all-teams="allTeams"
        @save="applyLeagueConfig"
        @close="showLeagueModal = false"
      />

      <!-- Team Adjustments (collapsible, advanced) -->
      <template v-if="selected.length >= 2">
        <div class="ctp-adj-wrap">
          <div class="ctp-collapse-btn" @click="showAdjustments = !showAdjustments">
            <span>{{ $t("tournament.settingsPage.teamAdjustments.title") }}</span>
            <ChevronDown
              :size="14"
              class="ctp-collapse-icon"
              :class="{ 'ctp-collapse-icon--open': showAdjustments }"
            />
          </div>
          <div v-if="showAdjustments">
            <SettingsTeamAdjustments
              v-model:team-point-adjustments="teamPointAdjustments"
              v-model:team-power-adjustments="teamPowerAdjustments"
              :teams="selectedTeams"
              :has-any-results="false"
              :show-points="format !== 'bracket'"
            />
          </div>
        </div>
      </template>

      <!-- Footer actions -->
      <div class="ctp-footer">
        <button class="primary ctp-create-btn" :disabled="!canCreate" @click="handleCreate">
          {{ $t("tournament.create.createBtn") }}
          <span v-if="selected.length >= 2" class="ctp-badge">
            {{ $t("common.teams", { n: selected.length }) }}
          </span>
        </button>
        <RouterLink to="/tournaments" class="ctp-cancel-link">{{ $t("common.cancel") }}</RouterLink>
      </div>
    </template>

    <DrawCeremony
      v-if="showCeremony && ceremonyContext"
      :title="$t('drawCeremony.title')"
      :context="ceremonyContext"
      :teams="selectedTeams"
      @complete="onCeremonyComplete"
      @cancel="showCeremony = false"
    />
  </div>
</template>

<style scoped>
.ctp-swiss-error {
  margin: 0;
  padding: 0 var(--sp-2);
  font-size: var(--fs-sm);
  color: var(--danger);
}

.ctp-header {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 20px;
}

.ctp-title {
  font-size: 22px;
  font-weight: 700;
  margin: 0;
  line-height: 1.2;
}

.ctp-name-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.ctp-name-input {
  width: 100%;
  box-sizing: border-box;
  font-size: 15px;
  padding: 8px 36px 8px 10px;
}

.btn-random {
  position: absolute;
  right: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: var(--radius);
  cursor: pointer;
  color: var(--text-muted);
  transition:
    color 0.15s,
    background 0.15s;
}
.btn-random:hover {
  color: var(--text);
  background: var(--bg-hover);
}

/* Step indicator */
.ctp-steps {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  margin-bottom: 4px;
  flex-wrap: wrap;
}

.ctp-step {
  font-size: 12px;
  font-weight: 600;
  font-family: var(--font-ui);
  color: var(--text-muted);
  white-space: nowrap;
}

.ctp-step--active {
  color: var(--accent);
}

.ctp-step-sep {
  flex: 1;
  height: 1px;
  background: var(--border-light);
  min-width: 12px;
}

/* Collapsible adjustments */
.ctp-adj-wrap {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ctp-collapse-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 8px 12px;
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  cursor: pointer;
  font-size: 12px;
  font-weight: 700;
  font-family: var(--font-ui);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  text-align: start;
  transition:
    color 0.15s,
    border-color 0.15s;
}

.ctp-collapse-btn:hover {
  color: var(--text);
  border-color: var(--border);
}

.ctp-collapse-icon {
  flex-shrink: 0;
  transition: transform 0.2s;
}

.ctp-collapse-icon--open {
  transform: rotate(180deg);
}

.ctp-footer {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 0 8px;
  border-top: 1px solid var(--border-light);
  margin-top: 4px;
}

.ctp-create-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  padding: 8px 20px;
}

.ctp-badge {
  display: inline-block;
  background: rgba(255, 255, 255, 0.25);
  border-radius: var(--radius);
  padding: 0 8px;
  font-size: 12px;
}

.ctp-cancel-link {
  font-size: 13px;
  color: var(--text-muted);
  text-decoration: none;
  padding: 6px 12px;
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  transition:
    color 0.15s,
    border-color 0.15s;
}
.ctp-cancel-link:hover {
  color: var(--text);
  border-color: var(--border);
}
</style>
