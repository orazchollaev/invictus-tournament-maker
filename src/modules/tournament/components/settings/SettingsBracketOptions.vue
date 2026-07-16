<script setup lang="ts">
import { computed } from "vue"
import { useTournamentStore } from "@/modules/tournament/store"
import type { Tournament, PlayoffSeedMode, LegMode, DrawType } from "@/modules/tournament/types"
import AppStepper from "@/components/AppStepper.vue"
import BtnGroup from "@/components/BtnGroup.vue"
import TspLockedCard from "./TspLockedCard.vue"
import { showConfirm } from "@/composables/useDialog"
import { useLegOptions } from "@/modules/tournament/composables/useLegOptions"
import { useI18n } from "vue-i18n"

const { t } = useI18n()
const store = useTournamentStore()
const { legOptions, multiLegOptions } = useLegOptions()

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
  <TspLockedCard
    :title="t('tournament.create.drawMethod')"
    :locked="hasAnyResults"
    :locked-message="t('tournament.settingsPage.drawMethod.lockedBanner')"
  >
    <div class="form-row">
      <BtnGroup v-model="drawType" :options="drawOptions" />
      <button @click="handleRedraw">
        {{ t("tournament.settingsPage.drawMethod.regenerate") }}
      </button>
    </div>
    <div class="hint-box">
      {{
        t("tournament.create.drawHint", {
          random: t("common.random"),
          seeded: t("common.seeded"),
          manual: t("common.manual"),
        })
      }}
    </div>
  </TspLockedCard>

  <!-- Group Structure -->
  <template v-if="isGroupFormat">
    <TspLockedCard
      :title="t('tournament.settingsPage.groupStructure.title')"
      :locked="hasAnyResults"
      :locked-message="t('tournament.settingsPage.groupStructure.lockedBanner')"
    >
      <AppStepper
        v-model="localGroupCount"
        :label="t('tournament.create.groups')"
        :min="minGroups"
        :max="maxGroups"
      />
      <AppStepper
        v-model="localQpg"
        :label="t('tournament.settingsPage.groupStructure.teamsAdvance')"
        :min="minQpg"
        :max="maxQpg"
        :hint="
          t('tournament.settingsPage.groupStructure.reachKnockout', {
            n: localQpg * localGroupCount,
          })
        "
      />
      <AppStepper
        v-if="localQpg < maxQpg"
        v-model="localWildcardCount"
        :label="t('tournament.create.wildcards')"
        :min="0"
        :max="localGroupCount"
        :hint="
          t('tournament.settingsPage.groupStructure.total', {
            n: localQpg * localGroupCount + localWildcardCount,
          })
        "
      />
    </TspLockedCard>
  </template>

  <!-- Playoff Seeding -->
  <template v-if="isGroupFormat">
    <TspLockedCard
      :title="t('tournament.settingsPage.playoffSeeding.title')"
      :locked="!!tournament.groupsDone"
      :locked-message="t('tournament.settingsPage.playoffSeeding.lockedBanner')"
    >
      <BtnGroup v-model="localPlayoffSeedMode" :options="playoffOptions" />
      <div class="hint-box">
        {{
          t("tournament.create.playoffHint", {
            cross: t("tournament.create.cross"),
            noRematch: t("tournament.create.noRematch"),
            random: t("common.random"),
          })
        }}
      </div>
    </TspLockedCard>
  </template>

  <!-- Format Options -->
  <template v-if="tournament.rounds.length >= 2">
    <TspLockedCard
      :title="t('tournament.settingsPage.formatOptions.title')"
      :locked="hasAnyResults"
      :locked-message="t('tournament.settingsPage.formatOptions.lockedBanner')"
    >
      <label class="toggle-row">
        <input v-model="localHasThirdPlace" type="checkbox" />
        <span class="toggle-label">{{ t("tournament.create.thirdPlace") }}</span>
        <span class="form-hint">{{ t("tournament.create.thirdPlaceHint") }}</span>
      </label>
    </TspLockedCard>
  </template>

  <!-- Legs per Match -->
  <TspLockedCard
    :title="t('tournament.settingsPage.legsPerMatch.title')"
    :locked="hasAnyResults"
    :locked-message="t('tournament.settingsPage.legsPerMatch.lockedBanner')"
  >
    <div class="hint-box hint-box--top">
      <strong>{{ t("common.single") }}</strong>
      — {{ t("tournament.settingsPage.legsPerMatch.hintSingle") }} &nbsp;·&nbsp;
      <strong>{{ t("common.double") }}</strong>
      — {{ t("tournament.settingsPage.legsPerMatch.hintDouble") }}
    </div>
    <div class="form-rows">
      <div v-if="isGroupFormat" class="form-row">
        <span class="form-label">{{ t("tournament.create.groupStage") }}</span>
        <BtnGroup v-model="localGroupLegMode" :options="multiLegOptions" />
      </div>
      <div class="form-row">
        <span class="form-label">
          {{ t("tournament.settingsPage.legsPerMatch.knockoutRounds") }}
        </span>
        <BtnGroup v-model="localKnockoutLegMode" :options="legOptions" />
      </div>
      <div class="form-row">
        <span class="form-label">
          {{ t("tournament.settingsPage.legsPerMatch.final") }}
        </span>
        <BtnGroup v-model="localFinalLegMode" :options="legOptions" />
      </div>
    </div>
  </TspLockedCard>
</template>

<style src="./tournament-settings.css"></style>
