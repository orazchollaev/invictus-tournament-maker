<script setup lang="ts">
import type { LegMode } from "@/modules/tournament/types"
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
  otherLeagues: { id: string; name: string; season: number }[]
}>()

const localLeagueLegMode = defineModel<LegMode>("localLeagueLegMode", { required: true })
const localRelegationCount = defineModel<number>("localRelegationCount", { required: true })
const localTierCount = defineModel<number>("localTierCount", { required: true })
const localPromotionCount = defineModel<number>("localPromotionCount", { required: true })
const localLinkedLeagueId = defineModel<string>("localLinkedLeagueId", { required: true })
</script>

<template>
  <TspLockedCard
    :title="t('tournament.settingsPage.leagueFormat.title')"
    :locked="hasAnyResults"
    :locked-message="t('tournament.settingsPage.leagueFormat.lockedBanner')"
  >
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
  </TspLockedCard>

  <div class="tsp-card">
    <AppStepper
      v-model="localRelegationCount"
      :label="t('tournament.settingsPage.leagueFormat.relegationZone')"
      :min="0"
      :max="teamCount - 1"
      :hint="
        localRelegationCount === 0
          ? t('tournament.settingsPage.leagueFormat.relegationDisabled')
          : t('tournament.settingsPage.leagueFormat.relegated', { n: localRelegationCount })
      "
    />

    <template v-if="isMultiTier">
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
    </template>

    <template v-if="localRelegationCount > 0 && otherLeagues.length > 0">
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
          t("tournament.settingsPage.leagueFormat.linkedLeagueHint", { n: localRelegationCount })
        }}
      </div>
    </template>
  </div>
</template>

<style src="./tsp.css"></style>
<style scoped>
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
</style>
