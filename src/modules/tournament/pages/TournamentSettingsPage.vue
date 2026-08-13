<script setup lang="ts">
import { ref, computed } from "vue"
import { useRoute, useRouter } from "vue-router"
import { useI18n } from "vue-i18n"
import { useTeamsStore } from "@/modules/teams/store"
import { useTournamentStore } from "@/modules/tournament/store"
import ManualDraw from "@/modules/tournament/components/ManualDraw.vue"
import GroupDraw from "@/modules/tournament/components/GroupDraw.vue"
import TeamSelector from "@/modules/tournament/components/TeamSelector.vue"
import TeamSelectorFullscreenModal from "@/modules/tournament/components/TeamSelectorFullscreenModal.vue"
import { AppButton, AppCard, AppChip, AppConfigButton, AppIcon, AppModal } from "@/components/ui"
import { ArrowLeft, LayoutGrid, List, Lock, Maximize2, Save, Settings, Trophy } from "@lucide/vue"
import {
  SettingsDangerZone,
  SettingsGroupConfigModal,
  SettingsKnockoutConfigModal,
  SettingsLeagueConfigModal,
  SettingsSimulation,
  SettingsTeamAdjustments,
} from "../components/settings"
import type { GroupConfigPayload } from "../components/settings/SettingsGroupConfigModal.vue"
import type { KnockoutConfigPayload } from "../components/settings/SettingsKnockoutConfigModal.vue"
import type { LeagueConfigPayload } from "../components/settings/SettingsLeagueConfigModal.vue"
import { useTournamentSettingsDraft } from "../composables/useTournamentSettingsDraft"
import { useUnsavedChangesGuard } from "@/composables/useUnsavedChangesGuard"

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const teamsStore = useTeamsStore()
const store = useTournamentStore()

const tournamentId = computed(() => route.params.id as string)
const tournament = computed(() => store.getById(tournamentId.value))
const allTeams = computed(() => teamsStore.teams)
const hasAnyResults = computed(() => store.hasAnyResults(tournamentId.value))

const draft = useTournamentSettingsDraft(tournamentId, tournament)

const seasonCount = computed(
  () => store.tournaments.filter((tn) => tn.name === tournament.value?.name).length
)

const winnerTeam = computed(() => allTeams.value.find((tm) => tm.id === tournament.value?.winnerId))
const dateStr = computed(() =>
  tournament.value ? new Date(tournament.value.createdAt).toLocaleDateString() : ""
)

const localTeams = computed(() =>
  allTeams.value.filter((tm) => draft.teamIds.value.includes(tm.id))
)

const totalTeams = computed(() => tournament.value?.teamIds.length ?? 0)
const maxTierCount = computed(() => Math.floor(totalTeams.value / 2))
const minTierSize = computed(() => Math.floor(totalTeams.value / draft.tierCount.value))
const maxPromotionCount = computed(() => Math.max(1, minTierSize.value - 1))

const showManualDraw = ref(false)
const showTeamsFullscreen = ref(false)
const showGroupModal = ref(false)
const showKnockoutModal = ref(false)
const showLeagueModal = ref(false)

const { open: showLeaveModal, choose: chooseLeave } = useUnsavedChangesGuard({
  hasChanges: draft.hasChanges,
  onSave: draft.save,
})

const groupConfigSummary = computed(() => {
  const base = t("tournament.create.config.groupsAndAdvance", {
    groups: draft.groupCount.value,
    advance: draft.qualifiersPerGroup.value * draft.groupCount.value,
  })
  if (draft.wildcardCount.value <= 0) return base
  return `${base} · ${t("tournament.create.config.wildcardsShort", { n: draft.wildcardCount.value })}`
})
const knockoutConfigSummary = computed(() => {
  if (draft.isLeagueFormat.value) {
    return draft.playoffEnabled.value
      ? t("tournament.create.config.playoffShort", { n: draft.playoffQualifierCount.value })
      : t("tournament.create.config.playoffOff")
  }
  const thirdPlace = draft.hasThirdPlace.value
    ? t("tournament.create.config.thirdPlaceOn")
    : t("tournament.create.config.noThirdPlace")
  return `${t(`common.${draft.drawType.value}`)} · ${thirdPlace}`
})
const leagueConfigSummary = computed(() =>
  draft.tierCount.value > 1
    ? t("tournament.create.config.divisionsShort", { n: draft.tierCount.value })
    : t("tournament.create.config.singleDivisionShort")
)

function applyGroupConfig(payload: GroupConfigPayload) {
  draft.drawType.value = payload.drawType
  draft.groupCount.value = payload.groupCount
  draft.qualifiersPerGroup.value = payload.qualifiersPerGroup
  draft.wildcardCount.value = payload.wildcardCount
  draft.groupLegMode.value = payload.groupLegMode
  draft.tiebreaker.value = payload.tiebreaker
  draft.winPoints.value = payload.winPoints
  draft.drawPoints.value = payload.drawPoints
  draft.lossPoints.value = payload.lossPoints
}

function applyKnockoutConfig(payload: KnockoutConfigPayload) {
  if (!draft.isGroupFormat.value) draft.drawType.value = payload.drawType
  draft.hasThirdPlace.value = payload.hasThirdPlace
  draft.roundLegModes.value = payload.roundLegModes
  draft.thirdPlaceLegMode.value = payload.thirdPlaceLegMode
  draft.finalLegMode.value = payload.finalLegMode
  draft.playoffEnabled.value = payload.playoffEnabled
  draft.playoffQualifierCount.value = payload.playoffQualifierCount
  draft.leaguePlayoffSeedMode.value = payload.playoffSeedMode
  draft.playoffSeedMode.value = payload.groupPlayoffSeedMode
}

function applyLeagueConfig(payload: LeagueConfigPayload) {
  draft.leagueLegMode.value = payload.leagueLegMode
  draft.tierCount.value = payload.tierCount
  draft.promotionCount.value = payload.promotionCount
  draft.tiebreaker.value = payload.tiebreaker
  draft.winPoints.value = payload.winPoints
  draft.drawPoints.value = payload.drawPoints
  draft.lossPoints.value = payload.lossPoints
}

function handleManualConfirm(orderedIds: string[]) {
  showManualDraw.value = false
  store.redrawTournament(tournamentId.value, false, orderedIds)
}

function handleSave() {
  draft.save()
  router.push(`/tournaments/${tournamentId.value}`)
}
</script>

<template>
  <div class="page">
    <AppCard v-if="!tournament" padding="md">
      <p class="muted">{{ t("tournament.settingsPage.notFound") }}</p>
      <RouterLink to="/tournaments" class="back-link">
        <AppIcon :icon="ArrowLeft" />
        {{ t("tournament.settingsPage.backToTournaments") }}
      </RouterLink>
    </AppCard>

    <template v-else>
      <div class="page-top">
        <RouterLink :to="`/tournaments/${tournamentId}`" class="back-link">
          <AppIcon :icon="ArrowLeft" />
          {{ tournament.name }}
        </RouterLink>
        <div class="title-row">
          <h2 class="page-title">
            <AppIcon :icon="Settings" size="lg" class="title-icon" />
            {{ t("tournament.settingsPage.title") }}
          </h2>
          <AppChip>S{{ tournament.season }}</AppChip>
        </div>
      </div>

      <!-- Manual draw takes over the page while it is open -->
      <AppCard v-if="showManualDraw" padding="md">
        <GroupDraw
          v-if="draft.isGroupFormat.value"
          :teams="localTeams"
          :group-count="draft.groupCount.value"
          @confirm="handleManualConfirm"
          @cancel="showManualDraw = false"
        />
        <ManualDraw
          v-else
          :teams="localTeams"
          @confirm="handleManualConfirm"
          @cancel="showManualDraw = false"
        />
      </AppCard>

      <div v-else class="stack">
        <AppCard :title="t('tournament.settingsPage.tournamentName.title')" padding="md">
          <input
            v-model="draft.name.value"
            class="name-input"
            type="text"
            :placeholder="tournament.name"
          />
          <p v-if="seasonCount > 1" class="hint">
            {{ t("tournament.settingsPage.tournamentName.hint", { n: seasonCount }) }}
          </p>

          <p class="info-meta">
            {{ t("tournament.settingsPage.info.teams", { n: totalTeams }) }} ·
            {{ t("tournament.settingsPage.info.created", { date: dateStr }) }}
          </p>
          <p v-if="winnerTeam" class="info-champion">
            <AppIcon :icon="Trophy" size="xs" />
            <span :style="{ color: winnerTeam.color }">{{ winnerTeam.name }}</span>
            {{ t("tournament.settingsPage.info.champion") }}
          </p>
        </AppCard>

        <AppCard padding="md">
          <template #title>{{ t("tournament.settingsPage.manageTeams.title") }}</template>
          <template #actions>
            <AppChip v-if="hasAnyResults">
              <AppIcon :icon="Lock" size="xs" />
              {{ t("tournament.settingsPage.locked") }}
            </AppChip>
            <AppButton
              v-else
              variant="outlined"
              size="xs"
              :title="t('teamSelector.fullView')"
              @click="showTeamsFullscreen = true"
            >
              <AppIcon :icon="Maximize2" size="sm" />
            </AppButton>
          </template>

          <TeamSelector
            v-if="!hasAnyResults"
            :teams="allTeams"
            :selected="draft.teamIds.value"
            @update:selected="draft.teamIds.value = $event"
          />
          <p v-else class="locked-banner">
            <AppIcon :icon="Lock" size="sm" />
            {{ t("tournament.settingsPage.manageTeams.lockedBanner") }}
          </p>
        </AppCard>

        <TeamSelectorFullscreenModal
          v-if="!hasAnyResults"
          v-model:open="showTeamsFullscreen"
          :teams="allTeams"
          :selected="draft.teamIds.value"
          @update:selected="draft.teamIds.value = $event"
        />

        <div class="form-card ctp-config-buttons">
          <AppConfigButton
            v-if="draft.isGroupFormat.value"
            :icon="LayoutGrid"
            :label="t('tournament.create.config.group')"
            :summary="groupConfigSummary"
            @click="showGroupModal = true"
          />
          <AppConfigButton
            v-if="draft.isLeagueFormat.value"
            :icon="List"
            :label="t('tournament.create.config.league')"
            :summary="leagueConfigSummary"
            @click="showLeagueModal = true"
          />
          <AppConfigButton
            :icon="Trophy"
            :label="t('tournament.create.config.knockout')"
            :summary="knockoutConfigSummary"
            @click="showKnockoutModal = true"
          />
        </div>

        <SettingsGroupConfigModal
          v-if="showGroupModal && draft.isGroupFormat.value"
          :draw-type="draft.drawType.value"
          :group-count="draft.groupCount.value"
          :qualifiers-per-group="draft.qualifiersPerGroup.value"
          :wildcard-count="draft.wildcardCount.value"
          :group-leg-mode="draft.groupLegMode.value"
          :tiebreaker="draft.tiebreaker.value"
          :win-points="draft.winPoints.value"
          :draw-points="draft.drawPoints.value"
          :loss-points="draft.lossPoints.value"
          :tournament-id="tournamentId"
          :tournament="tournament"
          :has-any-results="hasAnyResults"
          :team-count="draft.teamIds.value.length"
          @save="applyGroupConfig"
          @close="showGroupModal = false"
          @open-manual-draw="showManualDraw = true"
        />

        <SettingsKnockoutConfigModal
          v-if="showKnockoutModal"
          :variant="draft.isLeagueFormat.value ? 'leaguePlayoff' : 'bracket'"
          :is-group-format="draft.isGroupFormat.value"
          :draw-type="draft.drawType.value"
          :has-third-place="draft.hasThirdPlace.value"
          :round-leg-modes="draft.roundLegModes.value"
          :third-place-leg-mode="draft.thirdPlaceLegMode.value"
          :final-leg-mode="draft.finalLegMode.value"
          :playoff-enabled="draft.playoffEnabled.value"
          :playoff-qualifier-count="draft.playoffQualifierCount.value"
          :playoff-seed-mode="draft.leaguePlayoffSeedMode.value"
          :group-playoff-seed-mode="draft.playoffSeedMode.value"
          :tournament-id="tournamentId"
          :tournament="tournament"
          :has-any-results="hasAnyResults"
          :team-count="draft.teamIds.value.length"
          :league-playoff-started="draft.originalPlayoff.value?.started ?? false"
          @save="applyKnockoutConfig"
          @close="showKnockoutModal = false"
          @open-manual-draw="showManualDraw = true"
        />

        <SettingsLeagueConfigModal
          v-if="showLeagueModal && draft.isLeagueFormat.value"
          :league-leg-mode="draft.leagueLegMode.value"
          :tier-count="draft.tierCount.value"
          :promotion-count="draft.promotionCount.value"
          :tiebreaker="draft.tiebreaker.value"
          :win-points="draft.winPoints.value"
          :draw-points="draft.drawPoints.value"
          :loss-points="draft.lossPoints.value"
          :has-any-results="hasAnyResults"
          :is-multi-tier="draft.isMultiTier.value"
          :max-tier-count="maxTierCount"
          :max-promotion-count="maxPromotionCount"
          @save="applyLeagueConfig"
          @close="showLeagueModal = false"
        />

        <SettingsTeamAdjustments
          v-model:team-point-adjustments="draft.teamPointAdjustments.value"
          v-model:team-power-adjustments="draft.teamPowerAdjustments.value"
          :teams="localTeams"
          :has-any-results="hasAnyResults"
          :show-points="draft.isLeagueFormat.value || draft.isGroupFormat.value"
        />

        <SettingsSimulation :tournament-id="tournamentId" :tournament="tournament" />

        <SettingsDangerZone :tournament-id="tournamentId" />

        <div class="footer">
          <AppButton
            variant="filled"
            size="md"
            :disabled="!draft.hasChanges.value"
            @click="handleSave"
          >
            <AppIcon :icon="Save" />
            {{ t("tournament.settingsPage.saveChanges") }}
          </AppButton>
          <RouterLink :to="`/tournaments/${tournamentId}`" class="cancel-link">
            {{ t("common.cancel") }}
          </RouterLink>
        </div>
      </div>
    </template>

    <AppModal
      v-if="showLeaveModal"
      :title="t('tournament.settingsPage.unsavedChanges.title')"
      width="360px"
      @close="chooseLeave('stay')"
    >
      <p class="leave-msg">{{ t("tournament.settingsPage.unsavedChanges.message") }}</p>
      <div class="modal-actions">
        <AppButton @click="chooseLeave('leave')">
          {{ t("tournament.settingsPage.unsavedChanges.leave") }}
        </AppButton>
        <AppButton variant="filled" @click="chooseLeave('save-leave')">
          {{ t("tournament.settingsPage.unsavedChanges.saveAndLeave") }}
        </AppButton>
        <AppButton @click="chooseLeave('stay')">
          {{ t("tournament.settingsPage.unsavedChanges.close") }}
        </AppButton>
      </div>
    </AppModal>
  </div>
</template>

<style scoped>
.title-row {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
}

.title-icon {
  color: var(--text-muted);
}

.name-input {
  width: 100%;
  font-size: var(--fs-base);
  font-weight: 600;
  padding: var(--sp-2) var(--sp-3);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg);
  color: var(--text);
  box-sizing: border-box;
}
.name-input:focus {
  outline: none;
  border-color: var(--accent);
}

.hint {
  margin: var(--sp-2) 0 0;
  padding: var(--sp-2) var(--sp-3);
  background: var(--bg);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  font-size: var(--fs-xs);
  color: var(--text-muted);
  line-height: 1.6;
}

.info-meta {
  margin: var(--sp-3) 0 0;
  font-size: var(--fs-sm);
  color: var(--text-muted);
}

.info-champion {
  display: flex;
  align-items: center;
  gap: 5px;
  margin: var(--sp-2) 0 0;
  font-size: var(--fs-sm);
  color: var(--text-muted);
}
.info-champion span {
  font-weight: 600;
}

.locked-banner {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  margin: 0;
  padding: var(--sp-2) var(--sp-3);
  font-size: var(--fs-sm);
  color: var(--text-muted);
  background: var(--bg);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
}

.footer {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-5) 0 var(--sp-2);
  border-top: 1px solid var(--border-light);
}

.cancel-link {
  font-size: var(--fs-base);
  color: var(--text-muted);
  text-decoration: none;
  padding: var(--sp-2) var(--sp-3);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  transition:
    color var(--dur-fast) var(--ease),
    border-color var(--dur-fast) var(--ease);
}
.cancel-link:hover {
  color: var(--text);
  border-color: var(--border);
}

.leave-msg {
  font-size: var(--fs-base);
  color: var(--text-muted);
  margin: 0 0 var(--sp-5);
  line-height: 1.5;
}
</style>
