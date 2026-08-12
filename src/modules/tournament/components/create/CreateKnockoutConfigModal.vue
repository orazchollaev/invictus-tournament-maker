<script setup lang="ts">
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import { AppModal, AppButton, AppStepper, BtnGroup } from "@/components/ui"
import type { LegMode, LeaguePlayoffSeedMode } from "@/modules/tournament/types"
import { useLegOptions } from "../../composables/useLegOptions"

type DrawType = "random" | "seeded" | "manual"

export interface KnockoutConfigPayload {
  drawType: DrawType
  hasThirdPlace: boolean
  knockoutLegMode: LegMode
  finalLegMode: LegMode
  playoffQualifierCount: number
  leaguePlayoffSeedMode: LeaguePlayoffSeedMode
}

const props = defineProps<
  KnockoutConfigPayload & {
    /** bracket/group formats show draw+thirdPlace+legs; leaguePlayoff shows qualifier count+seeding. */
    variant: "bracket" | "leaguePlayoff"
    selectedCount: number
    maxPlayoffQualifiers: number
  }
>()
const emit = defineEmits<{ save: [KnockoutConfigPayload]; close: [] }>()

const { t } = useI18n()
const { legOptions } = useLegOptions()

const modalRef = ref<InstanceType<typeof AppModal>>()
const drawType = ref(props.drawType)
const hasThirdPlace = ref(props.hasThirdPlace)
const knockoutLegMode = ref(props.knockoutLegMode)
const finalLegMode = ref(props.finalLegMode)
const playoffQualifierCount = ref(props.playoffQualifierCount)
const leaguePlayoffSeedMode = ref(props.leaguePlayoffSeedMode)

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

function handleSave() {
  emit("save", {
    drawType: drawType.value,
    hasThirdPlace: hasThirdPlace.value,
    knockoutLegMode: knockoutLegMode.value,
    finalLegMode: finalLegMode.value,
    playoffQualifierCount: playoffQualifierCount.value,
    leaguePlayoffSeedMode: leaguePlayoffSeedMode.value,
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
      <div class="form-card">
        <div class="form-section-title">{{ t("tournament.create.drawMethod") }}</div>
        <BtnGroup v-model="drawType" :options="drawOptions" />
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

      <div v-if="props.selectedCount >= 4" class="form-card">
        <div class="form-section-title">{{ t("tournament.create.options") }}</div>
        <label class="toggle-row">
          <input v-model="hasThirdPlace" type="checkbox" />
          <span class="toggle-label">{{ t("tournament.create.thirdPlace") }}</span>
          <span class="toggle-hint">{{ t("tournament.create.thirdPlaceHint") }}</span>
        </label>
      </div>

      <div class="form-card">
        <div class="form-section-title">{{ t("tournament.settingsPage.legsPerMatch.title") }}</div>
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
        <BtnGroup v-model="leaguePlayoffSeedMode" :options="leaguePlayoffSeedOptions" />
      </div>

      <div class="form-card">
        <div class="form-section-title">{{ t("tournament.settingsPage.legsPerMatch.title") }}</div>
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
      </div>
    </template>

    <template #footer>
      <AppButton variant="filled" block @click="handleSave">{{ t("common.save") }}</AppButton>
    </template>
  </AppModal>
</template>

<style src="./create-tournament.css"></style>
