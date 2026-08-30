<script setup lang="ts">
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import { AppModal, AppButton, AppStepper, AppButtonGroup, AppToggle } from "@/components/ui"
import type {
  KnockoutStage,
  LegMode,
  LeaguePlayoffSeedMode,
  PlayoffSeedMode,
} from "@/modules/tournament/types"
import { useLegOptions } from "@/modules/tournament/composables/useLegOptions"
import {
  knockoutStagesForRoundCount,
  totalRoundsForSize,
} from "@/modules/tournament/composables/useKnockoutRoundStages"

type DrawType = "random" | "seeded" | "manual"

const props = defineProps<
  KnockoutConfigPayload & {
    /** bracket/group formats show draw+thirdPlace+legs; leaguePlayoff shows qualifier count+seeding. */
    variant: "bracket" | "leaguePlayoff"
    /** group+knockout: this modal controls the bracket pairing after groups
     *  finish (cross/no-same-group/random/manual) — group formation itself
     *  is configured in the Group config modal instead. */
    isGroupFormat?: boolean
    selectedCount: number
    maxPlayoffQualifiers: number
    /** estimated number of teams/qualifiers that will enter the knockout
     *  bracket — used only to decide which round rows to show. */
    bracketTeamCount: number
  }
>()

const emit = defineEmits<{ save: [KnockoutConfigPayload]; close: [] }>()

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
  playoffQualifierCount: number
  leaguePlayoffSeedMode: LeaguePlayoffSeedMode
  groupPlayoffSeedMode: PlayoffSeedMode
}

const { t } = useI18n()
const { legOptions } = useLegOptions()

const modalRef = ref<InstanceType<typeof AppModal>>()
const drawType = ref(props.drawType)
const hasThirdPlace = ref(props.hasThirdPlace)
const roundLegModes = ref<Record<KnockoutStage, LegMode>>({ ...props.roundLegModes })
const finalLegMode = ref(props.finalLegMode)
const thirdPlaceLegMode = ref(props.thirdPlaceLegMode)
const playoffQualifierCount = ref(props.playoffQualifierCount)
const leaguePlayoffSeedMode = ref(props.leaguePlayoffSeedMode)
const groupPlayoffSeedMode = ref(props.groupPlayoffSeedMode)

const visibleStages = computed(() => {
  const count =
    props.variant === "leaguePlayoff" ? playoffQualifierCount.value : props.bracketTeamCount
  return knockoutStagesForRoundCount(totalRoundsForSize(count))
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

function handleSave() {
  emit("save", {
    drawType: drawType.value,
    hasThirdPlace: hasThirdPlace.value,
    roundLegModes: roundLegModes.value,
    finalLegMode: finalLegMode.value,
    thirdPlaceLegMode: thirdPlaceLegMode.value,
    playoffQualifierCount: playoffQualifierCount.value,
    leaguePlayoffSeedMode: leaguePlayoffSeedMode.value,
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
      <div v-if="!props.isGroupFormat" class="form-card">
        <div class="form-section-title">{{ t("tournament.create.drawMethod") }}</div>
        <AppButtonGroup v-model="drawType" :options="drawOptions" />
        <div class="hint-box hint-box--bottom">
          {{
            t("tournament.create.drawHint", {
              random: t("common.random"),
              seeded: t("common.seeded"),
              manual: t("common.manual"),
            })
          }}
        </div>
      </div>

      <div v-else class="form-card">
        <div class="form-section-title">
          {{ t("tournament.settingsPage.playoffSeeding.title") }}
        </div>
        <AppButtonGroup v-model="groupPlayoffSeedMode" :options="groupPlayoffSeedOptions" />
        <div class="hint-box hint-box--bottom">
          {{
            t("tournament.create.playoffHint", {
              cross: t("tournament.create.cross"),
              noRematch: t("tournament.create.noRematch"),
              random: t("common.random"),
            })
          }}
        </div>
      </div>

      <div v-if="props.selectedCount >= 4" class="form-card">
        <div class="form-section-title">{{ t("tournament.create.options") }}</div>
        <div class="toggle-row" @click="hasThirdPlace = !hasThirdPlace">
          <AppToggle v-model="hasThirdPlace" @click.stop />
          <span class="toggle-label">{{ t("tournament.create.thirdPlace") }}</span>
          <span class="toggle-hint">{{ t("tournament.create.thirdPlaceHint") }}</span>
        </div>
      </div>

      <div class="form-card">
        <div class="form-section-title">{{ t("tournament.settingsPage.legsPerMatch.title") }}</div>
        <div class="form-rows">
          <div v-for="stage in visibleStages" :key="stage" class="form-row">
            <span class="form-label">{{ t(STAGE_LABEL_KEYS[stage]) }}</span>
            <AppButtonGroup v-model="roundLegModes[stage]" :options="legOptions" />
          </div>
          <div class="form-row">
            <span class="form-label">{{ t("tournament.settingsPage.legsPerMatch.final") }}</span>
            <AppButtonGroup v-model="finalLegMode" :options="legOptions" />
          </div>
          <div v-if="hasThirdPlace" class="form-row">
            <span class="form-label">
              {{ t("tournament.settingsPage.legsPerMatch.thirdPlace") }}
            </span>
            <AppButtonGroup v-model="thirdPlaceLegMode" :options="legOptions" />
          </div>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="form-card">
        <div class="form-section-title">{{ t("tournament.create.playoff.qualifierCount") }}</div>
        <AppStepper
          v-model="playoffQualifierCount"
          :label="t('tournament.create.playoff.qualifierCount')"
          :min="2"
          :max="props.maxPlayoffQualifiers"
          :hint="t('tournament.create.playoff.qualifierCountHint')"
        />
      </div>

      <div class="form-card">
        <div class="form-section-title">{{ t("tournament.create.playoff.seedMode") }}</div>
        <AppButtonGroup v-model="leaguePlayoffSeedMode" :options="leaguePlayoffSeedOptions" />
      </div>

      <div class="form-card">
        <div class="form-section-title">{{ t("tournament.settingsPage.legsPerMatch.title") }}</div>
        <div class="form-rows">
          <div v-for="stage in visibleStages" :key="stage" class="form-row">
            <span class="form-label">{{ t(STAGE_LABEL_KEYS[stage]) }}</span>
            <AppButtonGroup v-model="roundLegModes[stage]" :options="legOptions" />
          </div>
          <div class="form-row">
            <span class="form-label">{{ t("tournament.settingsPage.legsPerMatch.final") }}</span>
            <AppButtonGroup v-model="finalLegMode" :options="legOptions" />
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <AppButton variant="filled" block @click="handleSave">{{ t("common.save") }}</AppButton>
    </template>
  </AppModal>
</template>

<style src="./create.css"></style>
