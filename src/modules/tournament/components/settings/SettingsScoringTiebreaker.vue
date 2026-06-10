<script setup lang="ts">
import type { Tiebreaker } from "@/modules/tournament/types"
import BtnGroup from "@/components/BtnGroup.vue"
import { Lock } from "@lucide/vue"
import { useI18n } from "vue-i18n"

const { t } = useI18n()

defineProps<{ hasAnyResults: boolean }>()

const localTiebreaker = defineModel<Tiebreaker>("localTiebreaker", { required: true })
const localWinPoints = defineModel<number>("localWinPoints", { required: true })
const localDrawPoints = defineModel<number>("localDrawPoints", { required: true })
const localLossPoints = defineModel<number>("localLossPoints", { required: true })
</script>

<template>
  <!-- Tiebreaker -->
  <div class="tsp-card">
    <div class="tsp-section-title">{{ t("tournament.create.tiebreaker") }}</div>
    <div class="tsp-leg-row">
      <span class="tsp-row-label">{{ t("tournament.settingsPage.tiebreaker.method") }}</span>
      <BtnGroup
        v-model="localTiebreaker"
        :options="[
          { value: 'head-to-head', label: t('tournament.settingsPage.tiebreaker.h2h') },
          { value: 'goal-diff', label: t('tournament.settingsPage.tiebreaker.goalDiff') },
        ]"
      />
    </div>
  </div>

  <!-- Scoring -->
  <div class="tsp-card">
    <div class="tsp-card-header">
      <div class="tsp-section-title">{{ t("tournament.settingsPage.scoring.title") }}</div>
      <span v-if="hasAnyResults" class="tsp-lock-tag">
        <Lock :size="10" />
        {{ t("tournament.settingsPage.locked") }}
      </span>
    </div>
    <template v-if="!hasAnyResults">
      <div class="tsp-stepper-row">
        <span class="tsp-stepper-label">{{ t("tournament.settingsPage.scoring.winPoints") }}</span>
        <div class="tsp-stepper">
          <button
            :disabled="localWinPoints <= 0"
            @click="localWinPoints = Math.max(0, localWinPoints - 1)"
          >
            −
          </button>
          <span class="tsp-stepper-val">{{ localWinPoints }}</span>
          <button
            :disabled="localWinPoints >= 10"
            @click="localWinPoints = Math.min(10, localWinPoints + 1)"
          >
            +
          </button>
        </div>
      </div>
      <div class="tsp-stepper-row">
        <span class="tsp-stepper-label">{{ t("tournament.settingsPage.scoring.drawPoints") }}</span>
        <div class="tsp-stepper">
          <button
            :disabled="localDrawPoints <= 0"
            @click="localDrawPoints = Math.max(0, localDrawPoints - 1)"
          >
            −
          </button>
          <span class="tsp-stepper-val">{{ localDrawPoints }}</span>
          <button
            :disabled="localDrawPoints >= 10"
            @click="localDrawPoints = Math.min(10, localDrawPoints + 1)"
          >
            +
          </button>
        </div>
      </div>
      <div class="tsp-stepper-row">
        <span class="tsp-stepper-label">{{ t("tournament.settingsPage.scoring.lossPoints") }}</span>
        <div class="tsp-stepper">
          <button
            :disabled="localLossPoints <= 0"
            @click="localLossPoints = Math.max(0, localLossPoints - 1)"
          >
            −
          </button>
          <span class="tsp-stepper-val">{{ localLossPoints }}</span>
          <button
            :disabled="localLossPoints >= 10"
            @click="localLossPoints = Math.min(10, localLossPoints + 1)"
          >
            +
          </button>
        </div>
      </div>
    </template>
    <div v-else class="tsp-locked-banner">
      <Lock :size="12" />
      {{ t("tournament.settingsPage.scoring.lockedBanner") }}
    </div>
  </div>
</template>

<style src="./tsp.css"></style>
