<script setup lang="ts">
import { ref, computed } from "vue"
import { useRoute, useRouter, onBeforeRouteLeave } from "vue-router"
import { useTeamsStore } from "@/modules/teams/store"
import { useTournamentStore } from "@/modules/tournament/store"
import type {
  PlayoffSeedMode,
  LegMode,
  Tiebreaker,
  LeaguePlayoffSeedMode,
} from "@/modules/tournament/types"
import { getLeaguePlayoffData } from "@/engine"
import ManualDraw from "@/modules/tournament/components/ManualDraw.vue"
import GroupDraw from "@/modules/tournament/components/GroupDraw.vue"
import TeamSelector from "@/modules/tournament/components/TeamSelector.vue"
import { Settings, Lock, Save, ArrowLeft } from "@lucide/vue"
import { useI18n } from "vue-i18n"
import {
  SettingsScoringTiebreaker,
  SettingsBracketOptions,
  SettingsDangerZone,
  SettingsLeagueOptions,
  SettingsSimulation,
  SettingsTeamAdjustments,
} from "../components/settings"

type DrawType = "random" | "seeded" | "manual"

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const teamsStore = useTeamsStore()
const store = useTournamentStore()

const tournamentId = computed(() => route.params.id as string)
const tournament = computed(() => store.getById(tournamentId.value))
const allTeams = computed(() => teamsStore.teams)
const hasAnyResults = computed(() => store.hasAnyResults(tournamentId.value))

const localName = ref(tournament.value?.name ?? "")
const seasonCount = computed(
  () => store.tournaments.filter((tn) => tn.name === tournament.value?.name).length
)

const localTeamIds = ref<string[]>([...(tournament.value?.teamIds ?? [])])
const drawType = ref<DrawType>(tournament.value?.drawType ?? "random")
const showManualDraw = ref(false)

const localPlayoffSeedMode = ref<PlayoffSeedMode>(tournament.value?.playoffSeedMode ?? "cross")
const localGroupCount = ref(tournament.value?.groups?.length ?? 2)
const localQpg = ref(tournament.value?.qualifiersPerGroup ?? 2)
const localWildcardCount = ref(tournament.value?.wildcardCount ?? 0)
const localHasThirdPlace = ref(!!tournament.value?.hasThirdPlace)
const localGroupLegMode = ref<LegMode>(tournament.value?.groupLegMode ?? "single")
const localKnockoutLegMode = ref<LegMode>(tournament.value?.knockoutLegMode ?? "single")
const localFinalLegMode = ref<LegMode>(tournament.value?.finalLegMode ?? "single")
const localLeagueLegMode = ref<LegMode>(
  tournament.value?.league?.legMode ?? tournament.value?.tiers?.[0]?.league.legMode ?? "single"
)
const localTiebreaker = ref<Tiebreaker>(tournament.value?.tiebreaker ?? "goal-diff")
const localPromotionCount = ref(tournament.value?.promotionCount ?? 1)
const localTierCount = ref(tournament.value?.tiers?.length ?? 1)
const origLeaguePlayoff = computed(() =>
  tournament.value ? getLeaguePlayoffData(tournament.value) : undefined
)
const localPlayoffEnabled = ref(origLeaguePlayoff.value?.enabled ?? false)
const localPlayoffQualifierCount = ref(origLeaguePlayoff.value?.qualifierCount ?? 4)
const leagueLocalPlayoffSeedMode = ref<LeaguePlayoffSeedMode>(
  origLeaguePlayoff.value?.seedMode ?? "seeded"
)
const localWinPoints = ref(tournament.value?.winPoints ?? 3)
const localDrawPoints = ref(tournament.value?.drawPoints ?? 1)
const localLossPoints = ref(tournament.value?.lossPoints ?? 0)
const localTeamPointAdjustments = ref<Record<string, number>>({
  ...(tournament.value?.teamPointAdjustments ?? {}),
})
const localTeamPowerAdjustments = ref<Record<string, number>>({
  ...(tournament.value?.teamPowerAdjustments ?? {}),
})

const isLeagueFormat = computed(() => tournament.value?.format === "league")
const isGroupFormat = computed(() => tournament.value?.format === "group+bracket")
const isMultiTier = computed(() => (tournament.value?.tiers?.length ?? 0) > 1)

const totalTeams = computed(() => tournament.value?.teamIds.length ?? 0)
const maxTierCount = computed(() => Math.floor(totalTeams.value / 2))
const minTierSize = computed(() => Math.floor(totalTeams.value / localTierCount.value))
const maxPromotionCount = computed(() => Math.max(1, minTierSize.value - 1))

const localTeams = computed(() => allTeams.value.filter((t) => localTeamIds.value.includes(t.id)))

const hasChanges = computed(() => {
  const orig = tournament.value
  if (!orig) return false
  if (localName.value.trim() && localName.value.trim() !== orig.name) return true
  const origSet = new Set(orig.teamIds)
  const localSet = new Set(localTeamIds.value)
  if (origSet.size !== localSet.size || [...origSet].some((id) => !localSet.has(id))) return true
  if (drawType.value !== (orig.drawType ?? "random")) return true
  if (localPlayoffSeedMode.value !== (orig.playoffSeedMode ?? "cross")) return true
  if (localGroupCount.value !== (orig.groups?.length ?? 2)) return true
  if (localQpg.value !== (orig.qualifiersPerGroup ?? 2)) return true
  if (localWildcardCount.value !== (orig.wildcardCount ?? 0)) return true
  if (localHasThirdPlace.value !== !!orig.hasThirdPlace) return true
  if (localGroupLegMode.value !== (orig.groupLegMode ?? "single")) return true
  if (localKnockoutLegMode.value !== (orig.knockoutLegMode ?? "single")) return true
  if (localFinalLegMode.value !== (orig.finalLegMode ?? "single")) return true
  if (
    isLeagueFormat.value &&
    localLeagueLegMode.value !==
      (orig.league?.legMode ?? orig.tiers?.[0]?.league.legMode ?? "single")
  )
    return true
  if (isMultiTier.value && localTierCount.value !== (orig.tiers?.length ?? 1)) return true
  if (isMultiTier.value && localPromotionCount.value !== (orig.promotionCount ?? 1)) return true
  if (
    isLeagueFormat.value &&
    (localPlayoffEnabled.value !== (origLeaguePlayoff.value?.enabled ?? false) ||
      localPlayoffQualifierCount.value !== (origLeaguePlayoff.value?.qualifierCount ?? 4) ||
      leagueLocalPlayoffSeedMode.value !== (origLeaguePlayoff.value?.seedMode ?? "seeded"))
  )
    return true
  if (localTiebreaker.value !== (orig.tiebreaker ?? "goal-diff")) return true
  if (
    (isLeagueFormat.value || isGroupFormat.value) &&
    (localWinPoints.value !== (orig.winPoints ?? 3) ||
      localDrawPoints.value !== (orig.drawPoints ?? 1) ||
      localLossPoints.value !== (orig.lossPoints ?? 0))
  )
    return true
  if (
    (isLeagueFormat.value || isGroupFormat.value) &&
    JSON.stringify(localTeamPointAdjustments.value) !==
      JSON.stringify(orig.teamPointAdjustments ?? {})
  )
    return true
  if (
    JSON.stringify(localTeamPowerAdjustments.value) !==
    JSON.stringify(orig.teamPowerAdjustments ?? {})
  )
    return true
  return false
})

// Unsaved changes guard
type LeaveChoice = "leave" | "save-leave" | "stay"
const showLeaveModal = ref(false)
let resolveLeave: ((choice: LeaveChoice) => void) | null = null

onBeforeRouteLeave(async (_to, _from, next) => {
  if (!hasChanges.value) {
    next()
    return
  }
  showLeaveModal.value = true
  const choice = await new Promise<LeaveChoice>((resolve) => {
    resolveLeave = resolve
  })
  showLeaveModal.value = false
  if (choice === "stay") {
    next(false)
  } else if (choice === "save-leave") {
    saveOnly()
    next()
  } else {
    next()
  }
})

function handleLeaveChoice(choice: LeaveChoice) {
  resolveLeave?.(choice)
  resolveLeave = null
}

function handleManualConfirm(orderedIds: string[]) {
  showManualDraw.value = false
  store.redrawTournament(tournamentId.value, false, orderedIds)
}

function goBack() {
  router.push(`/tournaments/${tournamentId.value}`)
}

function saveOnly() {
  const orig = tournament.value
  if (!orig) return

  if (localName.value.trim() && localName.value.trim() !== orig.name)
    store.renameTournament(tournamentId.value, localName.value.trim())

  const origSet = new Set(orig.teamIds)
  const localSet = new Set(localTeamIds.value)
  for (const id of localSet) {
    if (!origSet.has(id)) store.addTeamToTournament(tournamentId.value, id)
  }
  for (const id of origSet) {
    if (!localSet.has(id)) store.removeTeamFromTournament(tournamentId.value, id)
  }

  if (drawType.value !== (orig.drawType ?? "random"))
    store.setDrawType(tournamentId.value, drawType.value)
  if (localPlayoffSeedMode.value !== (orig.playoffSeedMode ?? "cross"))
    store.setPlayoffSeedMode(tournamentId.value, localPlayoffSeedMode.value)
  if (localGroupCount.value !== (orig.groups?.length ?? 2))
    store.changeGroupCount(tournamentId.value, localGroupCount.value)
  if (localQpg.value !== (orig.qualifiersPerGroup ?? 2))
    store.changeQualifiersPerGroup(tournamentId.value, localQpg.value)
  if (localWildcardCount.value !== (orig.wildcardCount ?? 0))
    store.changeWildcardCount(tournamentId.value, localWildcardCount.value)
  if (localHasThirdPlace.value !== !!orig.hasThirdPlace) store.toggleThirdPlace(tournamentId.value)
  if (localGroupLegMode.value !== (orig.groupLegMode ?? "single"))
    store.setLegMode(tournamentId.value, "group", localGroupLegMode.value)
  if (localKnockoutLegMode.value !== (orig.knockoutLegMode ?? "single"))
    store.setLegMode(tournamentId.value, "knockout", localKnockoutLegMode.value)
  if (localFinalLegMode.value !== (orig.finalLegMode ?? "single"))
    store.setLegMode(tournamentId.value, "final", localFinalLegMode.value)
  if (
    isLeagueFormat.value &&
    localLeagueLegMode.value !==
      (orig.league?.legMode ?? orig.tiers?.[0]?.league.legMode ?? "single")
  )
    store.setLeagueLegMode(tournamentId.value, localLeagueLegMode.value)
  if (isMultiTier.value && localTierCount.value !== (orig.tiers?.length ?? 1))
    store.rebuildTiers(tournamentId.value, localTierCount.value)
  if (isMultiTier.value && localPromotionCount.value !== (orig.promotionCount ?? 1))
    store.setPromotionCount(tournamentId.value, localPromotionCount.value)
  if (
    isLeagueFormat.value &&
    !origLeaguePlayoff.value?.started &&
    (localPlayoffEnabled.value !== (origLeaguePlayoff.value?.enabled ?? false) ||
      localPlayoffQualifierCount.value !== (origLeaguePlayoff.value?.qualifierCount ?? 4) ||
      leagueLocalPlayoffSeedMode.value !== (origLeaguePlayoff.value?.seedMode ?? "seeded"))
  )
    store.changeLeaguePlayoffSettings(tournamentId.value, {
      enabled: localPlayoffEnabled.value,
      qualifierCount: localPlayoffQualifierCount.value,
      seedMode: leagueLocalPlayoffSeedMode.value,
    })
  if (localTiebreaker.value !== (orig.tiebreaker ?? "goal-diff"))
    store.setTiebreaker(tournamentId.value, localTiebreaker.value)
  if (
    (isLeagueFormat.value || isGroupFormat.value) &&
    (localWinPoints.value !== (orig.winPoints ?? 3) ||
      localDrawPoints.value !== (orig.drawPoints ?? 1) ||
      localLossPoints.value !== (orig.lossPoints ?? 0))
  )
    store.setPointsConfig(
      tournamentId.value,
      localWinPoints.value,
      localDrawPoints.value,
      localLossPoints.value
    )
  if (isLeagueFormat.value || isGroupFormat.value) {
    const origPointAdj = orig.teamPointAdjustments ?? {}
    for (const [teamId, val] of Object.entries(localTeamPointAdjustments.value)) {
      if (val !== (origPointAdj[teamId] ?? 0))
        store.setTeamPointAdjustment(tournamentId.value, teamId, val)
    }
    for (const teamId of Object.keys(origPointAdj)) {
      if (!(teamId in localTeamPointAdjustments.value))
        store.setTeamPointAdjustment(tournamentId.value, teamId, 0)
    }
  }
  const origPowerAdj = orig.teamPowerAdjustments ?? {}
  for (const [teamId, val] of Object.entries(localTeamPowerAdjustments.value)) {
    if (val !== (origPowerAdj[teamId] ?? 0))
      store.setTeamPowerAdjustment(tournamentId.value, teamId, val)
  }
  for (const teamId of Object.keys(origPowerAdj)) {
    if (!(teamId in localTeamPowerAdjustments.value))
      store.setTeamPowerAdjustment(tournamentId.value, teamId, 0)
  }
}

function handleSave() {
  saveOnly()
  goBack()
}
</script>

<template>
  <div class="page">
    <div v-if="!tournament" class="tsp-not-found">
      <p>{{ t("tournament.settingsPage.notFound") }}</p>
      <RouterLink to="/tournaments">
        <ArrowLeft :size="14" />
        {{ t("tournament.settingsPage.backToTournaments") }}
      </RouterLink>
    </div>

    <template v-else>
      <!-- Page header -->
      <div class="tsp-header">
        <RouterLink :to="`/tournaments/${tournamentId}`" class="back-link">
          <ArrowLeft :size="14" />
          {{ tournament.name }}
        </RouterLink>
        <div class="tsp-title-row">
          <h2 class="tsp-title">
            <Settings :size="18" class="tsp-title-icon" />
            {{ t("tournament.settingsPage.title") }}
          </h2>
          <span class="tsp-season-badge">S{{ tournament.season }}</span>
        </div>
      </div>

      <!-- Manual draw overlay -->
      <template v-if="showManualDraw">
        <div class="form-card">
          <GroupDraw
            v-if="isGroupFormat"
            :teams="localTeams"
            :group-count="localGroupCount"
            @confirm="handleManualConfirm"
            @cancel="showManualDraw = false"
          />
          <ManualDraw
            v-else
            :teams="localTeams"
            @confirm="handleManualConfirm"
            @cancel="showManualDraw = false"
          />
        </div>
      </template>

      <template v-else>
        <!-- Tournament Name -->
        <div class="form-card">
          <div class="form-section-title">
            {{ t("tournament.settingsPage.tournamentName.title") }}
          </div>
          <input
            v-model="localName"
            class="tsp-name-input"
            type="text"
            :placeholder="tournament.name"
          />
          <div v-if="seasonCount > 1" class="hint-box" style="margin-top: 8px">
            {{ t("tournament.settingsPage.tournamentName.hint", { n: seasonCount }) }}
          </div>
        </div>

        <!-- Manage Teams -->
        <div class="form-card">
          <div class="form-section-header">
            <div class="form-section-title">
              {{ t("tournament.settingsPage.manageTeams.title") }}
            </div>
            <span v-if="hasAnyResults" class="tsp-lock-tag">
              <Lock :size="10" />
              {{ t("tournament.settingsPage.locked") }}
            </span>
          </div>
          <template v-if="!hasAnyResults">
            <TeamSelector
              :teams="allTeams"
              :selected="localTeamIds"
              @update:selected="localTeamIds = $event"
            />
          </template>
          <div v-else class="tsp-locked-banner">
            <Lock :size="12" />
            {{ t("tournament.settingsPage.manageTeams.lockedBanner") }}
          </div>
        </div>

        <!-- Bracket / Group+Bracket options -->
        <template v-if="!isLeagueFormat">
          <SettingsBracketOptions
            v-model:draw-type="drawType"
            v-model:local-playoff-seed-mode="localPlayoffSeedMode"
            v-model:local-group-count="localGroupCount"
            v-model:local-qpg="localQpg"
            v-model:local-wildcard-count="localWildcardCount"
            v-model:local-has-third-place="localHasThirdPlace"
            v-model:local-group-leg-mode="localGroupLegMode"
            v-model:local-knockout-leg-mode="localKnockoutLegMode"
            v-model:local-final-leg-mode="localFinalLegMode"
            :tournament-id="tournamentId"
            :tournament="tournament"
            :has-any-results="hasAnyResults"
            :is-group-format="isGroupFormat"
            :team-count="localTeamIds.length"
            @open-manual-draw="showManualDraw = true"
          />
        </template>

        <!-- League options -->
        <template v-if="isLeagueFormat">
          <SettingsLeagueOptions
            v-model:local-league-leg-mode="localLeagueLegMode"
            v-model:local-tier-count="localTierCount"
            v-model:local-promotion-count="localPromotionCount"
            v-model:local-playoff-enabled="localPlayoffEnabled"
            v-model:local-playoff-qualifier-count="localPlayoffQualifierCount"
            v-model:local-playoff-seed-mode="leagueLocalPlayoffSeedMode"
            :has-any-results="hasAnyResults"
            :is-multi-tier="isMultiTier"
            :team-count="localTeamIds.length"
            :max-tier-count="maxTierCount"
            :max-promotion-count="maxPromotionCount"
            :league-playoff-started="origLeaguePlayoff?.started ?? false"
          />
        </template>

        <!-- Tiebreaker + Scoring -->
        <template v-if="isLeagueFormat || isGroupFormat">
          <SettingsScoringTiebreaker
            v-model:local-tiebreaker="localTiebreaker"
            v-model:local-win-points="localWinPoints"
            v-model:local-draw-points="localDrawPoints"
            v-model:local-loss-points="localLossPoints"
            :has-any-results="hasAnyResults"
          />
        </template>

        <!-- Team Adjustments -->
        <SettingsTeamAdjustments
          v-model:team-point-adjustments="localTeamPointAdjustments"
          v-model:team-power-adjustments="localTeamPowerAdjustments"
          :teams="localTeams"
          :has-any-results="hasAnyResults"
          :show-points="isLeagueFormat || isGroupFormat"
        />

        <!-- Simulation -->
        <SettingsSimulation :tournament-id="tournamentId" :tournament="tournament" />

        <!-- Danger Zone -->
        <SettingsDangerZone :tournament-id="tournamentId" />

        <!-- Footer actions -->
        <div class="tsp-footer">
          <button class="primary tsp-save-btn" :disabled="!hasChanges" @click="handleSave">
            <Save :size="14" />
            {{ t("tournament.settingsPage.saveChanges") }}
          </button>
          <RouterLink :to="`/tournaments/${tournamentId}`" class="tsp-cancel-link">
            {{ t("common.cancel") }}
          </RouterLink>
        </div>
      </template>
    </template>

    <!-- Unsaved changes modal -->
    <Teleport to="body">
      <Transition name="dialog-fade">
        <div v-if="showLeaveModal" class="sim-overlay" @click.self="handleLeaveChoice('stay')">
          <Transition name="dialog-scale" appear>
            <div v-if="showLeaveModal" class="leave-modal" role="dialog" aria-modal="true">
              <p class="leave-modal-title">
                {{ t("tournament.settingsPage.unsavedChanges.title") }}
              </p>
              <p class="leave-modal-msg">
                {{ t("tournament.settingsPage.unsavedChanges.message") }}
              </p>
              <div class="leave-modal-actions">
                <button @click="handleLeaveChoice('leave')">
                  {{ t("tournament.settingsPage.unsavedChanges.leave") }}
                </button>
                <button class="primary" @click="handleLeaveChoice('save-leave')">
                  {{ t("tournament.settingsPage.unsavedChanges.saveAndLeave") }}
                </button>
                <button @click="handleLeaveChoice('stay')">
                  {{ t("tournament.settingsPage.unsavedChanges.close") }}
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.tsp-not-found {
  color: var(--text-muted);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.tsp-header {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 20px;
}

.tsp-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.tsp-title {
  font-size: 22px;
  font-weight: 700;
  margin: 0;
  line-height: 1.2;
  display: flex;
  align-items: center;
  gap: 8px;
}

.tsp-title-icon {
  color: var(--text-muted);
}

.tsp-season-badge {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  background: var(--bg);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  padding: 2px 8px;
}

.form-card {
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  padding: 16px;
  margin-bottom: 12px;
}

.form-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.form-section-header .form-section-title {
  margin-bottom: 0;
}

.form-section-title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 12px;
}

.tsp-lock-tag {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
  background: var(--bg);
  border: 1px solid var(--border-light);
  padding: 2px 7px;
  border-radius: var(--radius);
}

.tsp-locked-banner {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  font-size: 12px;
  color: var(--text-muted);
  background: var(--bg);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
}

.hint-box {
  padding: 8px 10px;
  background: var(--bg);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.6;
}

.tsp-name-input {
  width: 100%;
  font-size: 14px;
  font-weight: 600;
  padding: 7px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg);
  color: var(--text);
  box-sizing: border-box;
}
.tsp-name-input:focus {
  outline: none;
  border-color: var(--accent);
}

.tsp-footer {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 0 8px;
  border-top: 1px solid var(--border-light);
  margin-top: 4px;
}

.tsp-save-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  padding: 8px 20px;
}

.tsp-cancel-link {
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
.tsp-cancel-link:hover {
  color: var(--text);
  border-color: var(--border);
}

/* Leave guard modal */
.sim-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(2px);
}
.leave-modal {
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  padding: 24px 24px 20px;
  width: min(360px, calc(100vw - 32px));
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}
.leave-modal-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text);
  margin: 0 0 8px;
}
.leave-modal-msg {
  font-size: 13px;
  color: var(--text-muted);
  margin: 0 0 20px;
  line-height: 1.5;
}
.leave-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
}
.leave-modal-actions button {
  font-size: 13px;
  padding: 7px 14px;
}

.dialog-fade-enter-active,
.dialog-fade-leave-active {
  transition: opacity 0.18s ease;
}
.dialog-fade-enter-from,
.dialog-fade-leave-to {
  opacity: 0;
}
.dialog-scale-enter-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s cubic-bezier(0.34, 1.4, 0.64, 1);
}
.dialog-scale-leave-active {
  transition:
    opacity 0.14s ease,
    transform 0.14s ease;
}
.dialog-scale-enter-from {
  opacity: 0;
  transform: scale(0.9);
}
.dialog-scale-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
