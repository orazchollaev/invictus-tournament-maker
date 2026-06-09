<script setup lang="ts">
import { computed } from "vue"
import type { LegMode } from "@/modules/tournament/types"
import BtnGroup from "@/components/BtnGroup.vue"
import { Lock } from "@lucide/vue"
import { useI18n } from "vue-i18n"

const { t } = useI18n()

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

const multiLegOptions = computed(() => [
  { value: "single", label: t("common.single") },
  { value: "double", label: t("common.double") },
  { value: "triple", label: t("common.triple") },
  { value: "quadruple", label: t("common.quadruple") },
])
</script>

<template>
  <div class="tsp-card">
    <div class="tsp-card-header">
      <div class="tsp-section-title">{{ t("tournament.settingsPage.leagueFormat.title") }}</div>
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
          :disabled="localRelegationCount >= teamCount - 1"
          @click="localRelegationCount = Math.min(teamCount - 1, localRelegationCount + 1)"
        >
          +
        </button>
      </div>
      <span class="tsp-hint">
        {{
          localRelegationCount === 0
            ? t("tournament.settingsPage.leagueFormat.relegationDisabled")
            : t("tournament.settingsPage.leagueFormat.relegated", { n: localRelegationCount })
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
        <span class="tsp-hint">{{ t("tournament.settingsPage.leagueFormat.minTeams") }}</span>
      </div>
      <div class="tsp-stepper-row">
        <span class="tsp-stepper-label">{{ t("tournament.create.promotionRelegation") }}</span>
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
            @click="localPromotionCount = Math.min(maxPromotionCount, localPromotionCount + 1)"
          >
            +
          </button>
        </div>
        <span class="tsp-hint">
          {{ t("tournament.settingsPage.leagueFormat.slotsSwapped") }}
        </span>
      </div>
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
