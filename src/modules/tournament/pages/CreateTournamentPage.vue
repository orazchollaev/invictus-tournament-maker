<script setup lang="ts">
import { ref, computed, watch } from "vue"
import { useRouter } from "vue-router"
import { useTeamsStore } from "@/modules/teams/store"
import { useTournamentStore } from "@/modules/tournament/store"
import { useSettingsStore } from "@/modules/settings/store"
import ManualDraw from "../components/ManualDraw.vue"
import GroupDraw from "../components/GroupDraw.vue"
import TeamSelector from "../components/TeamSelector.vue"
import { DrawCeremony } from "../components/draw-ceremony"
import { Shuffle, ArrowLeft, ChevronDown } from "@lucide/vue"
import { randomTournamentName } from "@/composables/useRandomNames"
import type { CeremonyContext, DrawMode } from "@/engine"
import type {
  LegMode,
  PlayoffSeedMode,
  Tiebreaker,
  LeaguePlayoffSeedMode,
} from "@/modules/tournament/types"
import {
  CreateFormatSelector,
  CreateLeagueOptions,
  CreateMatchRules,
  CreateScoringTiebreaker,
} from "../components/create"
import { SettingsTeamAdjustments } from "../components/settings"

type DrawType = "random" | "seeded" | "manual"
type TournamentFormat = "bracket" | "group+bracket" | "league"

const router = useRouter()
const teamsStore = useTeamsStore()
const store = useTournamentStore()
const settingsStore = useSettingsStore()

const name = ref("")
const selected = ref<string[]>([])
const format = ref<TournamentFormat>("bracket")
const drawType = ref<DrawType>(settingsStore.newSeasonDrawType)
const groupCount = ref(4)
const qualifiersPerGroup = ref(2)
const wildcardCount = ref(0)
const showManualDraw = ref(false)
const showCeremony = ref(false)
const ceremonyContext = ref<CeremonyContext | null>(null)
const hasThirdPlace = ref(false)
const playoffSeedMode = ref<PlayoffSeedMode>(settingsStore.newSeasonPlayoffSeedMode)
const groupLegMode = ref<LegMode>(settingsStore.groupLegMode)
const knockoutLegMode = ref<LegMode>(settingsStore.knockoutLegMode)
const finalLegMode = ref<LegMode>(settingsStore.finalLegMode)
const leagueLegMode = ref<LegMode>("single")
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

const allTeams = computed(() => teamsStore.teams)
const selectedTeams = computed(() => allTeams.value.filter((t) => selected.value.includes(t.id)))
const canCreate = computed(() => !!name.value.trim() && selected.value.length >= 2)
const showAdjustments = ref(false)

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

watch(format, (f) => {
  if (f === "league") return
  drawType.value =
    f === "group+bracket" ? settingsStore.newSeasonGroupDrawType : settingsStore.newSeasonDrawType
  if (f === "group+bracket") {
    playoffSeedMode.value = settingsStore.newSeasonPlayoffSeedMode
  }
})

function handleCreate() {
  if (!canCreate.value) return
  if (format.value === "league") {
    doCreate()
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
}

function doCreate(orderedIds?: string[]) {
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
    knockoutLegMode.value,
    finalLegMode.value,
    tiebreaker.value,
    isGroup ? winPoints.value : undefined,
    isGroup ? drawPoints.value : undefined,
    isGroup ? lossPoints.value : undefined
  )
  // The ceremony commits its result via orderedIds (manual placement under the
  // hood); preserve the user's real draw-method label for display.
  store.setDrawType(id, drawType.value)
  if (isGroup) store.setPlayoffSeedMode(id, playoffSeedMode.value)
  if (hasThirdPlace.value) store.toggleThirdPlace(id)
  applyAdjustments(id)
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
          <button class="btn-random" title="Random name" @click="name = randomTournamentName()">
            <Shuffle :size="14" />
          </button>
        </div>
      </div>

      <!-- Teams -->
      <div class="form-card">
        <div class="form-section-title">{{ $t("tournament.create.teams") }}</div>
        <TeamSelector :teams="allTeams" :selected="selected" @update:selected="selected = $event" />
      </div>

      <!-- Format + Group options -->
      <CreateFormatSelector
        v-model:format="format"
        v-model:group-count="groupCount"
        v-model:qualifiers-per-group="qualifiersPerGroup"
        v-model:wildcard-count="wildcardCount"
        :selected-count="selected.length"
      />

      <!-- League options -->
      <template v-if="format === 'league'">
        <CreateLeagueOptions
          v-model:league-leg-mode="leagueLegMode"
          v-model:tier-count="tierCount"
          v-model:tier-assignments="tierAssignments"
          v-model:promotion-count="promotionCount"
          v-model:playoff-enabled="playoffEnabled"
          v-model:playoff-qualifier-count="playoffQualifierCount"
          v-model:playoff-seed-mode="leaguePlayoffSeedMode"
          :selected-teams="selectedTeams"
          :all-teams="allTeams"
        />
      </template>

      <!-- Match rules (bracket formats) -->
      <template v-if="format !== 'league'">
        <CreateMatchRules
          v-model:draw-type="drawType"
          v-model:playoff-seed-mode="playoffSeedMode"
          v-model:has-third-place="hasThirdPlace"
          v-model:group-leg-mode="groupLegMode"
          v-model:knockout-leg-mode="knockoutLegMode"
          v-model:final-leg-mode="finalLegMode"
          :format="format"
          :selected-count="selected.length"
        />
      </template>

      <!-- Tiebreaker + Scoring -->
      <template v-if="format !== 'bracket'">
        <CreateScoringTiebreaker
          v-model:tiebreaker="tiebreaker"
          v-model:win-points="winPoints"
          v-model:draw-points="drawPoints"
          v-model:loss-points="lossPoints"
        />
      </template>

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
  background: var(--bg-hover, rgba(255, 255, 255, 0.08));
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
  text-align: left;
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
