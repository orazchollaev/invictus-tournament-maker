<script setup lang="ts">
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useTournamentStore } from "@/modules/tournament/store"
import type {
  Tournament,
  KnockoutStage,
  LegMode,
  DrawType,
  LeaguePlayoffSeedMode,
  PlayoffSeedMode,
} from "@/modules/tournament/types"
import { AppModal, AppButton, AppStepper, BtnGroup, ToggleSwitch } from "@/components/ui"
import TspLockedCard from "./TspLockedCard.vue"
import { showConfirm } from "@/composables/useDialog"
import { useLegOptions } from "@/modules/tournament/composables/useLegOptions"
import {
  knockoutStagesForRoundCount,
  totalRoundsForSize,
} from "@/modules/tournament/composables/useKnockoutRoundStages"

const props = defineProps<
  KnockoutConfigPayload & {
    /** bracket/group formats show draw+thirdPlace+legs; leaguePlayoff shows the league playoff toggle. */
    variant: "bracket" | "leaguePlayoff"
    /** group+knockout: this modal controls the bracket pairing after groups
     *  finish — group formation itself is configured in the Group modal. */
    isGroupFormat?: boolean
    tournamentId: string
    tournament: Tournament
    hasAnyResults: boolean
    teamCount: number
    leaguePlayoffStarted: boolean
  }
>()

const emit = defineEmits<{ save: [KnockoutConfigPayload]; close: []; openManualDraw: [] }>()

const STAGE_LABEL_KEYS: Record<KnockoutStage, string> = {
  r64: "tournament.settingsPage.legsPerMatch.r64",
  r32: "tournament.settingsPage.legsPerMatch.r32",
  r16: "tournament.settingsPage.legsPerMatch.r16",
  quarterfinal: "tournament.settingsPage.legsPerMatch.quarterFinal",
  semifinal: "tournament.settingsPage.legsPerMatch.semiFinal",
}

export interface KnockoutConfigPayload {
  drawType: DrawType
  hasThirdPlace: boolean
  roundLegModes: Record<KnockoutStage, LegMode>
  finalLegMode: LegMode
  thirdPlaceLegMode: LegMode
  playoffEnabled: boolean
  playoffQualifierCount: number
  playoffSeedMode: LeaguePlayoffSeedMode
  groupPlayoffSeedMode: PlayoffSeedMode
}

const { t } = useI18n()
const store = useTournamentStore()
const { legOptions } = useLegOptions()

const modalRef = ref<InstanceType<typeof AppModal>>()
const drawType = ref(props.drawType)
const hasThirdPlace = ref(props.hasThirdPlace)
const roundLegModes = ref<Record<KnockoutStage, LegMode>>({ ...props.roundLegModes })
const finalLegMode = ref(props.finalLegMode)
const thirdPlaceLegMode = ref(props.thirdPlaceLegMode)
const playoffEnabled = ref(props.playoffEnabled)
const playoffQualifierCount = ref(props.playoffQualifierCount)
const playoffSeedMode = ref(props.playoffSeedMode)
const groupPlayoffSeedMode = ref(props.groupPlayoffSeedMode)

// League+playoff bracket doesn't exist yet (rounds === []) until started, so
// estimate rows from the qualifier count instead of the (still-empty) real bracket.
const visibleStages = computed(() => {
  const totalRounds =
    props.variant === "leaguePlayoff" && !props.tournament.rounds.length
      ? totalRoundsForSize(playoffQualifierCount.value)
      : props.tournament.rounds.length
  return knockoutStagesForRoundCount(totalRounds)
})

const drawOptions = computed(() => [
  { value: "random", label: t("common.random") },
  { value: "seeded", label: t("common.seeded") },
  { value: "manual", label: t("common.manual") },
])
const leaguePlayoffSeedOptions = computed(() => [
  { value: "seeded" as const, label: t("common.seeded") },
  { value: "random" as const, label: t("common.random") },
  { value: "manual" as const, label: t("common.manual") },
])
const groupPlayoffSeedOptions = computed(() => [
  { value: "cross" as const, label: t("tournament.create.cross") },
  { value: "no-same-group" as const, label: t("tournament.create.noRematch") },
  { value: "random" as const, label: t("common.random") },
  { value: "manual" as const, label: t("common.manual") },
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

function handleSave() {
  emit("save", {
    drawType: drawType.value,
    hasThirdPlace: hasThirdPlace.value,
    roundLegModes: roundLegModes.value,
    finalLegMode: finalLegMode.value,
    thirdPlaceLegMode: thirdPlaceLegMode.value,
    playoffEnabled: playoffEnabled.value,
    playoffQualifierCount: playoffQualifierCount.value,
    playoffSeedMode: playoffSeedMode.value,
    groupPlayoffSeedMode: groupPlayoffSeedMode.value,
  })
  modalRef.value?.close()
}
</script>

<template>
  <AppModal
    ref="modalRef"
    :title="t('tournament.create.config.knockout')"
    width="420px"
    @close="emit('close')"
  >
    <template v-if="props.variant === 'bracket'">
      <TspLockedCard
        v-if="!props.isGroupFormat"
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
      </TspLockedCard>

      <TspLockedCard
        v-else
        :title="t('tournament.settingsPage.playoffSeeding.title')"
        :locked="!!tournament.groupsDone"
        :locked-message="t('tournament.settingsPage.playoffSeeding.lockedBanner')"
      >
        <BtnGroup v-model="groupPlayoffSeedMode" :options="groupPlayoffSeedOptions" />
      </TspLockedCard>

      <TspLockedCard
        v-if="tournament.rounds.length >= 2"
        :title="t('tournament.settingsPage.formatOptions.title')"
        :locked="hasAnyResults"
        :locked-message="t('tournament.settingsPage.formatOptions.lockedBanner')"
      >
        <div class="toggle-row" @click="hasThirdPlace = !hasThirdPlace">
          <ToggleSwitch v-model="hasThirdPlace" @click.stop />
          <span class="toggle-label">{{ t("tournament.create.thirdPlace") }}</span>
          <span class="form-hint">{{ t("tournament.create.thirdPlaceHint") }}</span>
        </div>
      </TspLockedCard>

      <TspLockedCard
        :title="t('tournament.settingsPage.legsPerMatch.title')"
        :locked="hasAnyResults"
        :locked-message="t('tournament.settingsPage.legsPerMatch.lockedBanner')"
      >
        <div class="form-rows">
          <div v-for="stage in visibleStages" :key="stage" class="form-row">
            <span class="form-label">{{ t(STAGE_LABEL_KEYS[stage]) }}</span>
            <BtnGroup v-model="roundLegModes[stage]" :options="legOptions" />
          </div>
          <div class="form-row">
            <span class="form-label">{{ t("tournament.settingsPage.legsPerMatch.final") }}</span>
            <BtnGroup v-model="finalLegMode" :options="legOptions" />
          </div>
          <div v-if="hasThirdPlace" class="form-row">
            <span class="form-label">
              {{ t("tournament.settingsPage.legsPerMatch.thirdPlace") }}
            </span>
            <BtnGroup v-model="thirdPlaceLegMode" :options="legOptions" />
          </div>
        </div>
      </TspLockedCard>
    </template>

    <template v-else>
      <TspLockedCard
        :title="t('tournament.settingsPage.leagueFormat.playoff.title')"
        :locked="leaguePlayoffStarted"
        :locked-message="t('tournament.settingsPage.leagueFormat.playoff.lockedBanner')"
      >
        <template v-if="playoffEnabled">
          <AppStepper
            v-model="playoffQualifierCount"
            :label="t('tournament.create.playoff.qualifierCount')"
            :min="2"
            :max="teamCount"
            :hint="t('tournament.create.playoff.qualifierCountHint')"
          />
          <div class="form-row">
            <span class="form-label">{{ t("tournament.create.playoff.seedMode") }}</span>
            <BtnGroup v-model="playoffSeedMode" :options="leaguePlayoffSeedOptions" />
          </div>
        </template>
      </TspLockedCard>

      <TspLockedCard
        v-if="playoffEnabled"
        :title="t('tournament.settingsPage.legsPerMatch.title')"
        :locked="leaguePlayoffStarted"
        :locked-message="t('tournament.settingsPage.legsPerMatch.lockedBanner')"
      >
        <div class="form-rows">
          <div v-for="stage in visibleStages" :key="stage" class="form-row">
            <span class="form-label">{{ t(STAGE_LABEL_KEYS[stage]) }}</span>
            <BtnGroup v-model="roundLegModes[stage]" :options="legOptions" />
          </div>
          <div class="form-row">
            <span class="form-label">{{ t("tournament.settingsPage.legsPerMatch.final") }}</span>
            <BtnGroup v-model="finalLegMode" :options="legOptions" />
          </div>
        </div>
      </TspLockedCard>
    </template>

    <template #footer>
      <AppButton variant="filled" block @click="handleSave">{{ t("common.save") }}</AppButton>
    </template>
  </AppModal>
</template>

<style src="./tournament-settings.css"></style>
