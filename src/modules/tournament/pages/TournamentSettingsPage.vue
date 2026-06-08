<script setup lang="ts">
import { ref, computed } from "vue"
import { useRoute, useRouter } from "vue-router"
import { useTeamsStore } from "@/modules/teams/store"
import { useTournamentStore } from "@/modules/tournament/store"
import type { PlayoffSeedMode, LegMode, Tiebreaker } from "@/modules/tournament/types"
import ManualDraw from "@/modules/tournament/components/ManualDraw.vue"
import GroupDraw from "@/modules/tournament/components/GroupDraw.vue"
import TeamSelector from "@/modules/tournament/components/TeamSelector.vue"
import BtnGroup from "@/components/BtnGroup.vue"
import { Settings, Lock, Save, ArrowLeft, Play, BarChart2 } from "@lucide/vue"
import { showConfirm } from "@/composables/useDialog"
import { useMonteCarlo } from "@/modules/tournament/composables/useMonteCarlo"
import { cacheSimResult } from "@/modules/tournament/composables/simulationCache"
import { useI18n } from "vue-i18n"

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

const otherLeagues = computed(() =>
  store.tournaments
    .filter((tn) => tn.format === "league" && tn.id !== tournamentId.value)
    .map((tn) => ({ id: tn.id, name: tn.name, season: tn.season }))
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
const localRelegationCount = ref(tournament.value?.relegationCount ?? 0)
const localLinkedLeagueId = ref<string>(tournament.value?.linkedLeagueId ?? "")
const localTiebreaker = ref<Tiebreaker>(tournament.value?.tiebreaker ?? "goal-diff")
const localPromotionCount = ref(tournament.value?.promotionCount ?? 1)
const localTierCount = ref(tournament.value?.tiers?.length ?? 1)

const isLeagueFormat = computed(() => tournament.value?.format === "league")
const isGroupFormat = computed(() => tournament.value?.format === "group+bracket")
const isMultiTier = computed(() => (tournament.value?.tiers?.length ?? 0) > 1)

// Monte Carlo simulation
const {
  isRunning: simRunning,
  progress: simProgress,
  run: runSim,
  cancel: cancelSim,
} = useMonteCarlo()
const showSimModal = ref(false)
const simDone = ref(false)

async function handleSimulate() {
  if (!tournament.value) return
  showSimModal.value = true
  simDone.value = false
  const teams = teamsStore.teams
  const result = await runSim(tournament.value, teams, 10_000)
  if (result) {
    cacheSimResult(tournamentId.value, result)
    simDone.value = true
  }
}

function handleCancelSim() {
  cancelSim()
  showSimModal.value = false
  simDone.value = false
}

function goToSimResults() {
  showSimModal.value = false
  router.push(`/tournaments/${tournamentId.value}/simulation`)
}

const totalTeams = computed(() => tournament.value?.teamIds.length ?? 0)
const maxTierCount = computed(() => Math.floor(totalTeams.value / 2))
const minTierSize = computed(() => Math.floor(totalTeams.value / localTierCount.value))
const maxPromotionCount = computed(() => Math.max(1, minTierSize.value - 1))

const legOptions = computed(() => [
  { value: "single", label: t("common.single") },
  { value: "double", label: t("common.double") },
])
const multiLegOptions = computed(() => [
  { value: "single", label: t("common.single") },
  { value: "double", label: t("common.double") },
  { value: "triple", label: t("common.triple") },
  { value: "quadruple", label: t("common.quadruple") },
])
const drawOptions = computed(() => [
  { value: "random", label: t("common.random") },
  { value: "seeded", label: t("common.seeded") },
  { value: "manual", label: t("common.manual") },
])
const playoffOptions = computed(() => [
  { value: "cross", label: t("tournament.create.cross") },
  { value: "no-same-group", label: t("tournament.create.noRematch") },
  { value: "random", label: t("common.random") },
  { value: "manual", label: t("common.manual") },
])

const localTeams = computed(() => allTeams.value.filter((t) => localTeamIds.value.includes(t.id)))

const currentGroupCount = computed(() => localGroupCount.value)
const maxGroups = computed(() => Math.floor(localTeamIds.value.length / 2))
const minGroups = 2
const currentQpg = computed(() => localQpg.value)
const maxQpg = computed(() => Math.floor(localTeamIds.value.length / currentGroupCount.value))
const minQpg = 1

const hasChanges = computed(() => {
  const orig = tournament.value
  if (!orig) return false
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
  if (isLeagueFormat.value && localRelegationCount.value !== (orig.relegationCount ?? 0))
    return true
  if (isLeagueFormat.value && localLinkedLeagueId.value !== (orig.linkedLeagueId ?? "")) return true
  if (isMultiTier.value && localTierCount.value !== (orig.tiers?.length ?? 1)) return true
  if (isMultiTier.value && localPromotionCount.value !== (orig.promotionCount ?? 1)) return true
  if (localTiebreaker.value !== (orig.tiebreaker ?? "goal-diff")) return true
  return false
})

function goBack() {
  router.push(`/tournaments/${tournamentId.value}`)
}

async function handleRedraw() {
  if (drawType.value === "manual") {
    showManualDraw.value = true
    return
  }
  if (
    !(await showConfirm(t("tournament.settingsPage.drawMethod.redrawConfirm"), {
      confirmLabel: t("tournament.settingsPage.drawMethod.redrawConfirmLabel"),
    }))
  )
    return
  store.redrawTournament(tournamentId.value, drawType.value === "seeded")
}

function handleManualConfirm(orderedIds: string[]) {
  showManualDraw.value = false
  store.redrawTournament(tournamentId.value, false, orderedIds)
}

async function handleReset() {
  if (
    !(await showConfirm(t("tournament.settingsPage.dangerZone.resetConfirm"), {
      confirmLabel: t("tournament.settingsPage.dangerZone.resetConfirmLabel"),
      dangerous: true,
    }))
  )
    return
  store.resetResults(tournamentId.value)
}

async function handleDelete() {
  if (
    !(await showConfirm(t("tournament.settingsPage.dangerZone.deleteConfirm"), {
      confirmLabel: t("tournament.settingsPage.dangerZone.deleteConfirmLabel"),
      dangerous: true,
    }))
  )
    return
  store.remove(tournamentId.value)
  router.push("/tournaments")
}

function handleSave() {
  const orig = tournament.value
  if (!orig) return

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
  if (isLeagueFormat.value && localRelegationCount.value !== (orig.relegationCount ?? 0))
    store.setRelegationCount(tournamentId.value, localRelegationCount.value)
  if (isLeagueFormat.value && localLinkedLeagueId.value !== (orig.linkedLeagueId ?? ""))
    store.setLinkedLeague(tournamentId.value, localLinkedLeagueId.value || null)
  if (isMultiTier.value && localTierCount.value !== (orig.tiers?.length ?? 1))
    store.rebuildTiers(tournamentId.value, localTierCount.value)
  if (isMultiTier.value && localPromotionCount.value !== (orig.promotionCount ?? 1))
    store.setPromotionCount(tournamentId.value, localPromotionCount.value)
  if (localTiebreaker.value !== (orig.tiebreaker ?? "goal-diff"))
    store.setTiebreaker(tournamentId.value, localTiebreaker.value)

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
        <div class="tsp-card">
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
        <!-- Manage Teams -->
        <div class="tsp-card">
          <div class="tsp-card-header">
            <div class="tsp-section-title">
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

        <!-- Draw Method (bracket / group+bracket) -->
        <template v-if="!isLeagueFormat">
          <div class="tsp-card">
            <div class="tsp-card-header">
              <div class="tsp-section-title">{{ t("tournament.create.drawMethod") }}</div>
              <span v-if="hasAnyResults" class="tsp-lock-tag">
                <Lock :size="10" />
                {{ t("tournament.settingsPage.locked") }}
              </span>
            </div>
            <template v-if="!hasAnyResults">
              <div class="tsp-row">
                <BtnGroup v-model="drawType" :options="drawOptions" />
                <button @click="handleRedraw">
                  {{ t("tournament.settingsPage.drawMethod.regenerate") }}
                </button>
              </div>
              <div class="tsp-hint-box">
                {{
                  t("tournament.create.drawHint", {
                    random: t("common.random"),
                    seeded: t("common.seeded"),
                    manual: t("common.manual"),
                  })
                }}
              </div>
            </template>
            <div v-else class="tsp-locked-banner">
              <Lock :size="12" />
              {{ t("tournament.settingsPage.drawMethod.lockedBanner") }}
            </div>
          </div>
        </template>

        <!-- Group Structure (group+bracket) -->
        <template v-if="isGroupFormat">
          <div class="tsp-card">
            <div class="tsp-card-header">
              <div class="tsp-section-title">
                {{ t("tournament.settingsPage.groupStructure.title") }}
              </div>
              <span v-if="hasAnyResults" class="tsp-lock-tag">
                <Lock :size="10" />
                {{ t("tournament.settingsPage.locked") }}
              </span>
            </div>
            <template v-if="!hasAnyResults">
              <div class="tsp-stepper-row">
                <span class="tsp-stepper-label">{{ t("tournament.create.groups") }}</span>
                <div class="tsp-stepper">
                  <button
                    :disabled="currentGroupCount <= minGroups"
                    @click="localGroupCount = currentGroupCount - 1"
                  >
                    −
                  </button>
                  <span class="tsp-stepper-val">{{ currentGroupCount }}</span>
                  <button
                    :disabled="currentGroupCount >= maxGroups"
                    @click="localGroupCount = currentGroupCount + 1"
                  >
                    +
                  </button>
                </div>
              </div>
              <div class="tsp-stepper-row">
                <span class="tsp-stepper-label">
                  {{ t("tournament.settingsPage.groupStructure.teamsAdvance") }}
                </span>
                <div class="tsp-stepper">
                  <button :disabled="currentQpg <= minQpg" @click="localQpg = currentQpg - 1">
                    −
                  </button>
                  <span class="tsp-stepper-val">{{ currentQpg }}</span>
                  <button :disabled="currentQpg >= maxQpg" @click="localQpg = currentQpg + 1">
                    +
                  </button>
                </div>
                <span class="tsp-hint">
                  {{
                    t("tournament.settingsPage.groupStructure.reachKnockout", {
                      n: currentQpg * currentGroupCount,
                    })
                  }}
                </span>
              </div>
              <div v-if="currentQpg < maxQpg" class="tsp-stepper-row">
                <span class="tsp-stepper-label">{{ t("tournament.create.wildcards") }}</span>
                <div class="tsp-stepper">
                  <button
                    :disabled="localWildcardCount <= 0"
                    @click="localWildcardCount = Math.max(0, localWildcardCount - 1)"
                  >
                    −
                  </button>
                  <span class="tsp-stepper-val">{{ localWildcardCount }}</span>
                  <button
                    :disabled="localWildcardCount >= currentGroupCount"
                    @click="
                      localWildcardCount = Math.min(currentGroupCount, localWildcardCount + 1)
                    "
                  >
                    +
                  </button>
                </div>
                <span class="tsp-hint">
                  {{
                    t("tournament.settingsPage.groupStructure.total", {
                      n: currentQpg * currentGroupCount + localWildcardCount,
                    })
                  }}
                </span>
              </div>
            </template>
            <div v-else class="tsp-locked-banner">
              <Lock :size="12" />
              {{ t("tournament.settingsPage.groupStructure.lockedBanner") }}
            </div>
          </div>
        </template>

        <!-- Playoff Seeding (group+bracket) -->
        <template v-if="isGroupFormat">
          <div class="tsp-card">
            <div class="tsp-card-header">
              <div class="tsp-section-title">
                {{ t("tournament.settingsPage.playoffSeeding.title") }}
              </div>
              <span v-if="tournament.groupsDone" class="tsp-lock-tag">
                <Lock :size="10" />
                {{ t("tournament.settingsPage.locked") }}
              </span>
            </div>
            <template v-if="!tournament.groupsDone">
              <BtnGroup v-model="localPlayoffSeedMode" :options="playoffOptions" />
              <div class="tsp-hint-box">
                {{
                  t("tournament.create.playoffHint", {
                    cross: t("tournament.create.cross"),
                    noRematch: t("tournament.create.noRematch"),
                    random: t("common.random"),
                  })
                }}
              </div>
            </template>
            <div v-else class="tsp-locked-banner">
              <Lock :size="12" />
              {{ t("tournament.settingsPage.playoffSeeding.lockedBanner") }}
            </div>
          </div>
        </template>

        <!-- Format Options (bracket only) -->
        <template v-if="!isLeagueFormat && tournament.rounds.length >= 2">
          <div class="tsp-card">
            <div class="tsp-card-header">
              <div class="tsp-section-title">
                {{ t("tournament.settingsPage.formatOptions.title") }}
              </div>
              <span v-if="hasAnyResults" class="tsp-lock-tag">
                <Lock :size="10" />
                {{ t("tournament.settingsPage.locked") }}
              </span>
            </div>
            <template v-if="!hasAnyResults">
              <label class="tsp-toggle-row">
                <input v-model="localHasThirdPlace" type="checkbox" />
                <span class="tsp-toggle-label">{{ t("tournament.create.thirdPlace") }}</span>
                <span class="tsp-hint">{{ t("tournament.create.thirdPlaceHint") }}</span>
              </label>
            </template>
            <div v-else class="tsp-locked-banner">
              <Lock :size="12" />
              {{ t("tournament.settingsPage.formatOptions.lockedBanner") }}
            </div>
          </div>
        </template>

        <!-- Legs per Match (bracket / group+bracket) -->
        <template v-if="!isLeagueFormat">
          <div class="tsp-card">
            <div class="tsp-card-header">
              <div class="tsp-section-title">
                {{ t("tournament.settingsPage.legsPerMatch.title") }}
              </div>
              <span v-if="hasAnyResults" class="tsp-lock-tag">
                <Lock :size="10" />
                {{ t("tournament.settingsPage.locked") }}
              </span>
            </div>
            <template v-if="!hasAnyResults">
              <div class="tsp-hint-box tsp-hint-box--top">
                <strong>{{ t("common.single") }}</strong>
                — {{ t("tournament.settingsPage.legsPerMatch.hintSingle") }} &nbsp;·&nbsp;
                <strong>{{ t("common.double") }}</strong>
                — {{ t("tournament.settingsPage.legsPerMatch.hintDouble") }}
              </div>
              <div class="tsp-leg-rows">
                <div v-if="isGroupFormat" class="tsp-leg-row">
                  <span class="tsp-row-label">{{ t("tournament.create.groupStage") }}</span>
                  <BtnGroup v-model="localGroupLegMode" :options="multiLegOptions" />
                </div>
                <div class="tsp-leg-row">
                  <span class="tsp-row-label">
                    {{ t("tournament.settingsPage.legsPerMatch.knockoutRounds") }}
                  </span>
                  <BtnGroup v-model="localKnockoutLegMode" :options="legOptions" />
                </div>
                <div class="tsp-leg-row">
                  <span class="tsp-row-label">
                    {{ t("tournament.settingsPage.legsPerMatch.final") }}
                  </span>
                  <BtnGroup v-model="localFinalLegMode" :options="legOptions" />
                </div>
              </div>
            </template>
            <div v-else class="tsp-locked-banner">
              <Lock :size="12" />
              {{ t("tournament.settingsPage.legsPerMatch.lockedBanner") }}
            </div>
          </div>
        </template>

        <!-- League Format -->
        <template v-if="isLeagueFormat">
          <div class="tsp-card">
            <div class="tsp-card-header">
              <div class="tsp-section-title">
                {{ t("tournament.settingsPage.leagueFormat.title") }}
              </div>
              <span v-if="hasAnyResults" class="tsp-lock-tag">
                <Lock :size="10" />
                {{ t("tournament.settingsPage.locked") }}
              </span>
            </div>
            <template v-if="!hasAnyResults">
              <div class="tsp-leg-row" style="margin-bottom: 8px">
                <span class="tsp-row-label">{{ t("tournament.create.roundFormat") }}</span>
                <BtnGroup v-model="localLeagueLegMode" :options="multiLegOptions" />
              </div>
              <div class="tsp-hint-box">
                <strong>{{ t("common.single") }}</strong>
                — {{ t("tournament.settingsPage.leagueFormat.hintSingle") }} &nbsp;·&nbsp;
                <strong>{{ t("common.double") }}</strong>
                — {{ t("tournament.settingsPage.leagueFormat.hintDouble") }} &nbsp;·&nbsp;
                <strong>{{ t("common.triple") }}</strong>
                — {{ t("tournament.settingsPage.leagueFormat.hintTriple") }} &nbsp;·&nbsp;
                <strong>{{ t("common.quadruple") }}</strong>
                — {{ t("tournament.settingsPage.leagueFormat.hintQuad") }}
              </div>
            </template>
            <div v-else class="tsp-locked-banner">
              <Lock :size="12" />
              {{ t("tournament.settingsPage.leagueFormat.lockedBanner") }}
            </div>

            <div class="tsp-stepper-row" style="margin-top: 14px">
              <span class="tsp-stepper-label">
                {{ t("tournament.settingsPage.leagueFormat.relegationZone") }}
              </span>
              <div class="tsp-stepper">
                <button
                  :disabled="localRelegationCount <= 0"
                  @click="localRelegationCount = Math.max(0, localRelegationCount - 1)"
                >
                  −
                </button>
                <span class="tsp-stepper-val">{{ localRelegationCount }}</span>
                <button
                  :disabled="localRelegationCount >= localTeamIds.length - 1"
                  @click="
                    localRelegationCount = Math.min(
                      localTeamIds.length - 1,
                      localRelegationCount + 1
                    )
                  "
                >
                  +
                </button>
              </div>
              <span class="tsp-hint">
                {{
                  localRelegationCount === 0
                    ? t("tournament.settingsPage.leagueFormat.relegationDisabled")
                    : t("tournament.settingsPage.leagueFormat.relegated", {
                        n: localRelegationCount,
                      })
                }}
              </span>
            </div>

            <template v-if="isMultiTier">
              <div class="tsp-stepper-row" style="margin-top: 8px">
                <span class="tsp-stepper-label">
                  {{ t("tournament.settingsPage.leagueFormat.numberOfDivisions") }}
                </span>
                <div class="tsp-stepper">
                  <button
                    :disabled="localTierCount <= 2"
                    @click="localTierCount = Math.max(2, localTierCount - 1)"
                  >
                    −
                  </button>
                  <span class="tsp-stepper-val">{{ localTierCount }}</span>
                  <button
                    :disabled="localTierCount >= maxTierCount"
                    @click="localTierCount = Math.min(maxTierCount, localTierCount + 1)"
                  >
                    +
                  </button>
                </div>
                <span class="tsp-hint">
                  {{ t("tournament.settingsPage.leagueFormat.minTeams") }}
                </span>
              </div>
              <div class="tsp-stepper-row">
                <span class="tsp-stepper-label">
                  {{ t("tournament.create.promotionRelegation") }}
                </span>
                <div class="tsp-stepper">
                  <button
                    :disabled="localPromotionCount <= 1"
                    @click="localPromotionCount = Math.max(1, localPromotionCount - 1)"
                  >
                    −
                  </button>
                  <span class="tsp-stepper-val">{{ localPromotionCount }}</span>
                  <button
                    :disabled="localPromotionCount >= maxPromotionCount"
                    @click="
                      localPromotionCount = Math.min(maxPromotionCount, localPromotionCount + 1)
                    "
                  >
                    +
                  </button>
                </div>
                <span class="tsp-hint">
                  {{ t("tournament.settingsPage.leagueFormat.slotsSwapped") }}
                </span>
              </div>
            </template>

            <template v-if="localRelegationCount > 0 && (otherLeagues?.length ?? 0) > 0">
              <div class="tsp-stepper-row" style="margin-top: 8px">
                <span class="tsp-stepper-label">
                  {{ t("tournament.settingsPage.leagueFormat.linkedLeague") }}
                </span>
                <select v-model="localLinkedLeagueId" class="tsp-linked-select">
                  <option value="">{{ t("tournament.settingsPage.leagueFormat.none") }}</option>
                  <option v-for="l in otherLeagues" :key="l.id" :value="l.id">
                    {{ l.name }} S{{ l.season }}
                  </option>
                </select>
              </div>
              <div v-if="localLinkedLeagueId" class="tsp-hint-box" style="margin-top: 6px">
                {{
                  t("tournament.settingsPage.leagueFormat.linkedLeagueHint", {
                    n: localRelegationCount,
                  })
                }}
              </div>
            </template>
          </div>
        </template>

        <!-- Tiebreaker -->
        <template v-if="isLeagueFormat || isGroupFormat">
          <div class="tsp-card">
            <div class="tsp-section-title">{{ t("tournament.create.tiebreaker") }}</div>
            <div class="tsp-leg-row">
              <span class="tsp-row-label">
                {{ t("tournament.settingsPage.tiebreaker.method") }}
              </span>
              <BtnGroup
                v-model="localTiebreaker"
                :options="[
                  { value: 'head-to-head', label: t('tournament.settingsPage.tiebreaker.h2h') },
                  { value: 'goal-diff', label: t('tournament.settingsPage.tiebreaker.goalDiff') },
                ]"
              />
            </div>
          </div>
        </template>

        <!-- Monte Carlo Simulation -->
        <div class="tsp-card tsp-card--sim">
          <div class="tsp-card-header">
            <div class="tsp-section-title tsp-section-title--sim">
              {{ t("tournament.settingsPage.simulation.title") }}
            </div>
          </div>
          <div class="tsp-sim-row">
            <div class="tsp-sim-desc">{{ t("tournament.settingsPage.simulation.desc") }}</div>
            <button class="primary tsp-sim-btn" @click="handleSimulate">
              <Play :size="13" />
              {{ t("tournament.settingsPage.simulation.run") }}
            </button>
          </div>
        </div>

        <!-- Danger Zone -->
        <div class="tsp-card tsp-card--danger">
          <div class="tsp-section-title tsp-section-title--danger">
            {{ t("tournament.settingsPage.dangerZone.title") }}
          </div>
          <div class="danger-list">
            <div class="danger-item">
              <div class="danger-info">
                <div class="danger-label">
                  {{ t("tournament.settingsPage.dangerZone.resetLabel") }}
                </div>
                <div class="danger-desc">
                  {{ t("tournament.settingsPage.dangerZone.resetDesc") }}
                </div>
              </div>
              <button class="danger" @click="handleReset">{{ t("common.reset") }}</button>
            </div>
            <div class="danger-item">
              <div class="danger-info">
                <div class="danger-label">
                  {{ t("tournament.settingsPage.dangerZone.deleteLabel") }}
                </div>
                <div class="danger-desc">
                  {{ t("tournament.settingsPage.dangerZone.deleteDesc") }}
                </div>
              </div>
              <button class="danger" @click="handleDelete">{{ t("common.delete") }}</button>
            </div>
          </div>
        </div>

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

    <!-- Simulation modal -->
    <Teleport to="body">
      <div v-if="showSimModal" class="sim-overlay" @click.self="!simRunning && handleCancelSim()">
        <div class="sim-modal">
          <div class="sim-modal-header">
            <BarChart2 :size="18" class="sim-modal-icon" />
            <span class="sim-modal-title">{{ t("tournament.settingsPage.simulation.title") }}</span>
          </div>

          <template v-if="!simDone">
            <p class="sim-modal-sub">
              {{ t("tournament.settingsPage.simulation.simulating", { name: tournament?.name }) }}
            </p>
            <div class="sim-progress-track">
              <div class="sim-progress-fill" :style="{ width: simProgress + '%' }" />
            </div>
            <div class="sim-progress-label">{{ simProgress }}%</div>
            <button class="sim-cancel-btn" @click="handleCancelSim">
              {{ t("common.cancel") }}
            </button>
          </template>

          <template v-else>
            <p class="sim-modal-sub sim-done-msg">
              {{ t("tournament.settingsPage.simulation.done") }}
            </p>
            <div class="sim-done-actions">
              <button class="primary" @click="goToSimResults">
                <BarChart2 :size="14" />
                {{ t("tournament.settingsPage.simulation.viewResults") }}
              </button>
              <button @click="handleCancelSim">{{ t("common.close") }}</button>
            </div>
          </template>
        </div>
      </div>
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

.tsp-card {
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  padding: 16px;
  margin-bottom: 12px;
}

.tsp-card--danger {
  border-color: color-mix(in srgb, var(--danger) 25%, transparent);
  background: color-mix(in srgb, var(--danger) 3%, var(--surface));
}

.tsp-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.tsp-card-header .tsp-section-title {
  margin-bottom: 0;
}

.tsp-section-title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 12px;
}
.tsp-section-title--danger {
  color: var(--danger);
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

.tsp-hint {
  font-size: 12px;
  color: var(--text-muted);
}

.tsp-hint-box {
  padding: 8px 10px;
  background: var(--bg);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.6;
}
.tsp-hint-box--top {
  margin-bottom: 10px;
}

.tsp-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.team-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
  max-height: 180px;
  overflow-y: auto;
}
.team-row {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 6px 3px 8px;
  border: 1px solid var(--border-light);
  background: var(--bg);
  border-radius: var(--radius);
}
.team-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.team-name {
  font-size: 13px;
}
.add-team-row {
  display: flex;
  gap: 8px;
  align-items: center;
}
.add-team-row select {
  flex: 1;
  min-width: 0;
}
.team-remove {
  font-size: 10px;
  padding: 0 4px;
  line-height: 18px;
  border-color: transparent;
  color: var(--text-muted);
}
.team-remove:not(:disabled):hover {
  color: var(--danger);
  border-color: var(--danger);
  background: color-mix(in srgb, var(--danger) 8%, var(--surface));
}

.tsp-stepper-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}
.tsp-stepper-label {
  font-size: 13px;
  color: var(--text);
  width: 200px;
  flex-shrink: 0;
}
.tsp-stepper {
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}
.tsp-stepper button {
  width: 30px;
  height: 30px;
  padding: 0;
  border: none;
  border-radius: 0;
  font-size: 16px;
  line-height: 1;
  display: flex;
  justify-content: center;
}
.tsp-stepper button:first-child {
  border-right: 1px solid var(--border);
}
.tsp-stepper button:last-child {
  border-left: 1px solid var(--border);
}
.tsp-stepper-val {
  width: 36px;
  text-align: center;
  font-size: 15px;
  font-family: var(--font-ui);
  font-weight: 700;
}

.tsp-linked-select {
  flex: 1;
  font-size: 13px;
  padding: 5px 8px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--text);
  min-width: 0;
}
.tsp-linked-select:focus {
  outline: none;
  border-color: var(--accent);
}

.tsp-toggle-row {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  user-select: none;
}
.tsp-toggle-label {
  font-size: 14px;
  font-weight: 600;
}

.tsp-row-label {
  font-size: 13px;
  color: var(--text);
  width: 140px;
  flex-shrink: 0;
}

.tsp-leg-rows {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.tsp-leg-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.danger-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.danger-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid color-mix(in srgb, var(--danger) 25%, transparent);
  background: color-mix(in srgb, var(--danger) 4%, var(--surface));
  border-radius: var(--radius);
}
.danger-info {
  flex: 1;
}
.danger-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--danger);
}
.danger-desc {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 2px;
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

@media (max-width: 600px) {
  .tsp-stepper-label,
  .tsp-row-label {
    width: auto;
    flex: 1 1 100%;
  }
  .tsp-stepper-row {
    row-gap: 6px;
  }
}

/* Simulation card */
.tsp-card--sim {
  border-color: color-mix(in srgb, var(--accent) 30%, var(--border-light));
  background: color-mix(in srgb, var(--accent) 4%, var(--surface));
}
.tsp-section-title--sim {
  color: var(--accent);
}
.tsp-sim-row {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.tsp-sim-desc {
  flex: 1;
  font-size: 12px;
  color: var(--text-muted);
  min-width: 160px;
}
.tsp-sim-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 13px;
  white-space: nowrap;
  padding: 8px 16px;
  flex-shrink: 0;
}

/* Simulation modal overlay */
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
.sim-modal {
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  padding: 28px 28px 24px;
  width: min(380px, calc(100vw - 32px));
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}
.sim-modal-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}
.sim-modal-icon {
  color: var(--accent);
}
.sim-modal-title {
  font-size: 16px;
  font-weight: 700;
}
.sim-modal-sub {
  font-size: 13px;
  color: var(--text-muted);
  margin: 0 0 16px;
}
.sim-progress-track {
  width: 100%;
  height: 8px;
  background: var(--bg);
  border-radius: var(--radius);
  overflow: hidden;
  margin-bottom: 8px;
}
.sim-progress-fill {
  height: 100%;
  background: var(--accent);
  border-radius: var(--radius);
  transition: width 0.15s ease;
}
.sim-progress-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--accent);
  text-align: right;
  margin-bottom: 16px;
  font-variant-numeric: tabular-nums;
}
.sim-cancel-btn {
  font-size: 13px;
  color: var(--text-muted);
  padding: 6px 14px;
}
.sim-done-msg {
  font-size: 14px;
  color: var(--text);
  font-weight: 500;
}
.sim-done-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.sim-done-actions button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  font-size: 13px;
}
</style>
