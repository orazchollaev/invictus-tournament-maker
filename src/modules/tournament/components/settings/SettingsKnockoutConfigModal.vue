<script setup lang="ts">
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useTournamentStore } from "@/modules/tournament/store"
import type {
  Tournament,
  LegMode,
  DrawType,
  LeaguePlayoffSeedMode,
  PlayoffSeedMode,
} from "@/modules/tournament/types"
import { AppModal, AppButton, AppStepper, BtnGroup } from "@/components/ui"
import TspLockedCard from "./TspLockedCard.vue"
import { showConfirm } from "@/composables/useDialog"
import { useLegOptions } from "@/modules/tournament/composables/useLegOptions"

export interface KnockoutConfigPayload {
  drawType: DrawType
  hasThirdPlace: boolean
  knockoutLegMode: LegMode
  finalLegMode: LegMode
  playoffEnabled: boolean
  playoffQualifierCount: number
  playoffSeedMode: LeaguePlayoffSeedMode
  groupPlayoffSeedMode: PlayoffSeedMode
}

const { t } = useI18n()
const store = useTournamentStore()
const { legOptions } = useLegOptions()

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

const modalRef = ref<InstanceType<typeof AppModal>>()
const drawType = ref(props.drawType)
const hasThirdPlace = ref(props.hasThirdPlace)
const knockoutLegMode = ref(props.knockoutLegMode)
const finalLegMode = ref(props.finalLegMode)
const playoffEnabled = ref(props.playoffEnabled)
const playoffQualifierCount = ref(props.playoffQualifierCount)
const playoffSeedMode = ref(props.playoffSeedMode)
const groupPlayoffSeedMode = ref(props.groupPlayoffSeedMode)

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
    knockoutLegMode: knockoutLegMode.value,
    finalLegMode: finalLegMode.value,
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
        <label class="toggle-row">
          <input v-model="hasThirdPlace" type="checkbox" />
          <span class="toggle-label">{{ t("tournament.create.thirdPlace") }}</span>
          <span class="form-hint">{{ t("tournament.create.thirdPlaceHint") }}</span>
        </label>
      </TspLockedCard>

      <TspLockedCard
        :title="t('tournament.settingsPage.legsPerMatch.title')"
        :locked="hasAnyResults"
        :locked-message="t('tournament.settingsPage.legsPerMatch.lockedBanner')"
      >
        <div class="form-rows">
          <div class="form-row">
            <span class="form-label">
              {{ t("tournament.settingsPage.legsPerMatch.knockoutRounds") }}
            </span>
            <BtnGroup v-model="knockoutLegMode" :options="legOptions" />
          </div>
          <div class="form-row">
            <span class="form-label">{{ t("tournament.settingsPage.legsPerMatch.final") }}</span>
            <BtnGroup v-model="finalLegMode" :options="legOptions" />
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
          <div class="form-row">
            <span class="form-label">
              {{ t("tournament.settingsPage.legsPerMatch.knockoutRounds") }}
            </span>
            <BtnGroup v-model="knockoutLegMode" :options="legOptions" />
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
