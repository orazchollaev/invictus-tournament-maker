<script setup lang="ts">
import { computed } from "vue"
import { useTournamentStore } from "@/modules/tournament/store"
import type { Tournament, PlayoffSeedMode, LegMode, DrawType } from "@/modules/tournament/types"
import BtnGroup from "@/components/BtnGroup.vue"
import { Lock } from "@lucide/vue"
import { showConfirm } from "@/composables/useDialog"
import { useI18n } from "vue-i18n"

const { t } = useI18n()
const store = useTournamentStore()

const props = defineProps<{
  tournamentId: string
  tournament: Tournament
  hasAnyResults: boolean
  isGroupFormat: boolean
  teamCount: number
}>()

const emit = defineEmits<{
  openManualDraw: []
}>()

const drawType = defineModel<DrawType>("drawType", { required: true })
const localPlayoffSeedMode = defineModel<PlayoffSeedMode>("localPlayoffSeedMode", {
  required: true,
})
const localGroupCount = defineModel<number>("localGroupCount", { required: true })
const localQpg = defineModel<number>("localQpg", { required: true })
const localWildcardCount = defineModel<number>("localWildcardCount", { required: true })
const localHasThirdPlace = defineModel<boolean>("localHasThirdPlace", { required: true })
const localGroupLegMode = defineModel<LegMode>("localGroupLegMode", { required: true })
const localKnockoutLegMode = defineModel<LegMode>("localKnockoutLegMode", { required: true })
const localFinalLegMode = defineModel<LegMode>("localFinalLegMode", { required: true })

const maxGroups = computed(() => Math.floor(props.teamCount / 2))
const minGroups = 2
const maxQpg = computed(() => Math.floor(props.teamCount / localGroupCount.value))
const minQpg = 1

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

async function handleRedraw() {
  if (drawType.value === "manual") {
    emit("openManualDraw")
    return
  }
  if (
    !(await showConfirm(t("tournament.settingsPage.drawMethod.redrawConfirm"), {
      confirmLabel: t("tournament.settingsPage.drawMethod.redrawConfirmLabel"),
    }))
  )
    return
  store.redrawTournament(props.tournamentId, drawType.value === "seeded")
}
</script>

<template>
  <!-- Draw Method -->
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

  <!-- Group Structure -->
  <template v-if="isGroupFormat">
    <div class="tsp-card">
      <div class="tsp-card-header">
        <div class="tsp-section-title">{{ t("tournament.settingsPage.groupStructure.title") }}</div>
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
              :disabled="localGroupCount <= minGroups"
              @click="localGroupCount = localGroupCount - 1"
            >
              −
            </button>
            <span class="tsp-stepper-val">{{ localGroupCount }}</span>
            <button
              :disabled="localGroupCount >= maxGroups"
              @click="localGroupCount = localGroupCount + 1"
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
            <button :disabled="localQpg <= minQpg" @click="localQpg = localQpg - 1">−</button>
            <span class="tsp-stepper-val">{{ localQpg }}</span>
            <button :disabled="localQpg >= maxQpg" @click="localQpg = localQpg + 1">+</button>
          </div>
          <span class="tsp-hint">
            {{
              t("tournament.settingsPage.groupStructure.reachKnockout", {
                n: localQpg * localGroupCount,
              })
            }}
          </span>
        </div>
        <div v-if="localQpg < maxQpg" class="tsp-stepper-row">
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
              :disabled="localWildcardCount >= localGroupCount"
              @click="localWildcardCount = Math.min(localGroupCount, localWildcardCount + 1)"
            >
              +
            </button>
          </div>
          <span class="tsp-hint">
            {{
              t("tournament.settingsPage.groupStructure.total", {
                n: localQpg * localGroupCount + localWildcardCount,
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

  <!-- Playoff Seeding -->
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

  <!-- Format Options -->
  <template v-if="tournament.rounds.length >= 2">
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

  <!-- Legs per Match -->
  <div class="tsp-card">
    <div class="tsp-card-header">
      <div class="tsp-section-title">{{ t("tournament.settingsPage.legsPerMatch.title") }}</div>
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

<style src="./tsp.css"></style>
