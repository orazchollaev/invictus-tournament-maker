<script setup lang="ts">
import { ref, computed } from "vue"
import { useRoute, useRouter } from "vue-router"
import { useI18n } from "vue-i18n"
import { useTeamsStore } from "@/modules/teams/store"
import { useTournamentStore } from "@/modules/tournament/store"
import ManualDraw from "@/modules/tournament/components/ManualDraw.vue"
import GroupDraw from "@/modules/tournament/components/GroupDraw.vue"
import TeamSelector from "@/modules/tournament/components/TeamSelector.vue"
import { AppButton, AppCard, AppChip, AppIcon, AppModal } from "@/components/ui"
import { ArrowLeft, Lock, Save, Settings, Trophy } from "@lucide/vue"
import {
  SettingsScoringTiebreaker,
  SettingsBracketOptions,
  SettingsDangerZone,
  SettingsLeagueOptions,
  SettingsSimulation,
  SettingsTeamAdjustments,
} from "../components/settings"
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

const { open: showLeaveModal, choose: chooseLeave } = useUnsavedChangesGuard({
  hasChanges: draft.hasChanges,
  onSave: draft.save,
})

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
          <template v-if="hasAnyResults" #actions>
            <AppChip>
              <AppIcon :icon="Lock" size="xs" />
              {{ t("tournament.settingsPage.locked") }}
            </AppChip>
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

        <SettingsBracketOptions
          v-if="!draft.isLeagueFormat.value"
          v-model:draw-type="draft.drawType.value"
          v-model:local-playoff-seed-mode="draft.playoffSeedMode.value"
          v-model:local-group-count="draft.groupCount.value"
          v-model:local-qpg="draft.qualifiersPerGroup.value"
          v-model:local-wildcard-count="draft.wildcardCount.value"
          v-model:local-has-third-place="draft.hasThirdPlace.value"
          v-model:local-group-leg-mode="draft.groupLegMode.value"
          v-model:local-knockout-leg-mode="draft.knockoutLegMode.value"
          v-model:local-final-leg-mode="draft.finalLegMode.value"
          :tournament-id="tournamentId"
          :tournament="tournament"
          :has-any-results="hasAnyResults"
          :is-group-format="draft.isGroupFormat.value"
          :team-count="draft.teamIds.value.length"
          @open-manual-draw="showManualDraw = true"
        />

        <SettingsLeagueOptions
          v-if="draft.isLeagueFormat.value"
          v-model:local-league-leg-mode="draft.leagueLegMode.value"
          v-model:local-tier-count="draft.tierCount.value"
          v-model:local-promotion-count="draft.promotionCount.value"
          v-model:local-playoff-enabled="draft.playoffEnabled.value"
          v-model:local-playoff-qualifier-count="draft.playoffQualifierCount.value"
          v-model:local-playoff-seed-mode="draft.leaguePlayoffSeedMode.value"
          :has-any-results="hasAnyResults"
          :is-multi-tier="draft.isMultiTier.value"
          :team-count="draft.teamIds.value.length"
          :max-tier-count="maxTierCount"
          :max-promotion-count="maxPromotionCount"
          :league-playoff-started="draft.originalPlayoff.value?.started ?? false"
        />

        <SettingsScoringTiebreaker
          v-if="draft.isLeagueFormat.value || draft.isGroupFormat.value"
          v-model:local-tiebreaker="draft.tiebreaker.value"
          v-model:local-win-points="draft.winPoints.value"
          v-model:local-draw-points="draft.drawPoints.value"
          v-model:local-loss-points="draft.lossPoints.value"
          :has-any-results="hasAnyResults"
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
