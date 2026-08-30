<script setup lang="ts">
import { ref } from "vue"
import { useSettingsStore } from "@/modules/settings/store"
import { ManualDraw } from "../components/draw"
import { GroupDraw } from "../components/group"
import { TeamSelector, TeamSelectorFullscreenModal } from "../components/shared"
import { DrawCeremony } from "../components/draw-ceremony"
import { Shuffle, ArrowLeft, ChevronDown, LayoutGrid, Trophy, List, Maximize2 } from "@lucide/vue"
import { randomTournamentName } from "@/composables/useRandomNames"
import type { CeremonyContext, DrawMode } from "@/engine"
import {
  CreateFormatSelector,
  CreateKnockoutConfigModal,
  CreateLeagueConfigModal,
} from "../components/create"
import { GroupConfigModal, SwissConfigModal } from "../components/config"
import { randomSeed } from "@/engine"
import { useCreateTournamentDraft } from "../composables/useCreateTournamentDraft"
import { useCreateTournamentSubmit } from "../composables/useCreateTournamentSubmit"
import { SettingsTeamAdjustments } from "../components/settings"
import { AppButton, AppConfigButton, AppIcon } from "@/components/ui"
import { useI18n } from "vue-i18n"

const settingsStore = useSettingsStore()

const draft = useCreateTournamentDraft()
const {
  name,
  selected,
  format,
  drawType,
  groupCount,
  qualifiersPerGroup,
  wildcardCount,
  groupLegMode,
  hasThirdPlace,
  playoffSeedMode,
  roundLegModes,
  thirdPlaceLegMode,
  finalLegMode,
  leagueLegMode,
  tierCount,
  tierAssignments,
  promotionCount,
  playoffEnabled,
  playoffQualifierCount,
  leaguePlayoffSeedMode,
  swissOpponentCount,
  swissPotCount,
  swissLegMode,
  swissBalanceHomeAway,
  swissDrawType,
  tiebreaker,
  winPoints,
  drawPoints,
  lossPoints,
  teamPointAdjustments,
  teamPowerAdjustments,
  allTeams,
  selectedTeams,
  swissErrors,
  canCreate,
  maxPlayoffQualifiers,
  bracketTeamCount,
  groupConfigSummary,
  knockoutConfigSummary,
  swissConfigSummary,
  leagueConfigSummary,
  applyGroupConfig,
  applyKnockoutConfig,
  applySwissConfig,
  applyLeagueConfig,
  pendingSwissSeed,
} = draft
const { doCreate } = useCreateTournamentSubmit(draft)

const showTeamsFullscreen = ref(false)
const showManualDraw = ref(false)
const showCeremony = ref(false)
const ceremonyContext = ref<CeremonyContext | null>(null)
const { t } = useI18n()
const showAdjustments = ref(false)

// Phase configuration modals — opened from the AppConfigButton rows below the
// format cards. Each modal edits a local draft and only writes back to the
// draft above (via its "save" event) when the user actually hits Save;
// closing any other way (X, backdrop, Escape) discards it.
const showGroupModal = ref(false)
const showKnockoutModal = ref(false)
const showLeagueModal = ref(false)
const showSwissModal = ref(false)

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
