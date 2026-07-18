<script setup lang="ts">
import { computed } from "vue"
import type { LegMode, LeaguePlayoffSeedMode } from "@/modules/tournament/types"
import AppStepper from "@/components/AppStepper.vue"
import BtnGroup from "@/components/BtnGroup.vue"
import TspLockedCard from "./TspLockedCard.vue"
import { useLegOptions } from "@/modules/tournament/composables/useLegOptions"
import { useI18n } from "vue-i18n"

const { t } = useI18n()
const { multiLegOptions } = useLegOptions()

defineProps<{
  hasAnyResults: boolean
  isMultiTier: boolean
  teamCount: number
  maxTierCount: number
  maxPromotionCount: number
  leaguePlayoffStarted: boolean
}>()

const localLeagueLegMode = defineModel<LegMode>("localLeagueLegMode", { required: true })
const localTierCount = defineModel<number>("localTierCount", { required: true })
const localPromotionCount = defineModel<number>("localPromotionCount", { required: true })
const localPlayoffEnabled = defineModel<boolean>("localPlayoffEnabled", { required: true })
const localPlayoffQualifierCount = defineModel<number>("localPlayoffQualifierCount", {
  required: true,
})
const localPlayoffSeedMode = defineModel<LeaguePlayoffSeedMode>("localPlayoffSeedMode", {
  required: true,
})

const playoffSeedModeOptions = computed(() => [
  { value: "seeded" as const, label: t("common.seeded") },
  { value: "random" as const, label: t("common.random") },
  { value: "manual" as const, label: t("common.manual") },
])
</script>

<template>
  <TspLockedCard
    :title="t('tournament.settingsPage.leagueFormat.title')"
    :locked="hasAnyResults"
    :locked-message="t('tournament.settingsPage.leagueFormat.lockedBanner')"
  >
    <div class="form-row" style="margin-bottom: 8px">
      <span class="form-label">{{ t("tournament.create.roundFormat") }}</span>
      <BtnGroup v-model="localLeagueLegMode" :options="multiLegOptions" />
    </div>
    <div class="hint-box">
      <strong>{{ t("common.single") }}</strong>
      — {{ t("tournament.settingsPage.leagueFormat.hintSingle") }} &nbsp;·&nbsp;
      <strong>{{ t("common.double") }}</strong>
      — {{ t("tournament.settingsPage.leagueFormat.hintDouble") }} &nbsp;·&nbsp;
      <strong>{{ t("common.triple") }}</strong>
      — {{ t("tournament.settingsPage.leagueFormat.hintTriple") }} &nbsp;·&nbsp;
      <strong>{{ t("common.quadruple") }}</strong>
      — {{ t("tournament.settingsPage.leagueFormat.hintQuad") }}
    </div>
  </TspLockedCard>

  <template v-if="isMultiTier">
    <TspLockedCard
      :title="t('tournament.settingsPage.leagueFormat.divisions.title')"
      :locked="hasAnyResults"
      :locked-message="t('tournament.settingsPage.leagueFormat.divisions.lockedBanner')"
    >
      <AppStepper
        v-model="localTierCount"
        :label="t('tournament.settingsPage.leagueFormat.numberOfDivisions')"
        :min="2"
        :max="maxTierCount"
        :hint="t('tournament.settingsPage.leagueFormat.minTeams')"
      />
      <AppStepper
        v-model="localPromotionCount"
        :label="t('tournament.create.promotionRelegation')"
        :min="1"
        :max="maxPromotionCount"
        :hint="t('tournament.settingsPage.leagueFormat.slotsSwapped')"
      />
    </TspLockedCard>
  </template>

  <TspLockedCard
    :title="t('tournament.settingsPage.leagueFormat.playoff.title')"
    :locked="leaguePlayoffStarted"
    :locked-message="t('tournament.settingsPage.leagueFormat.playoff.lockedBanner')"
  >
    <label class="toggle-row">
      <input v-model="localPlayoffEnabled" type="checkbox" />
      <span class="toggle-label">{{ t("tournament.create.playoff.enable") }}</span>
    </label>

    <template v-if="localPlayoffEnabled">
      <AppStepper
        v-model="localPlayoffQualifierCount"
        :label="t('tournament.create.playoff.qualifierCount')"
        :min="2"
        :max="teamCount"
        :hint="t('tournament.create.playoff.qualifierCountHint')"
      />
      <div class="form-row">
        <span class="form-label">{{ t("tournament.create.playoff.seedMode") }}</span>
        <BtnGroup v-model="localPlayoffSeedMode" :options="playoffSeedModeOptions" />
      </div>
    </template>
  </TspLockedCard>
</template>

<style src="./tournament-settings.css"></style>
