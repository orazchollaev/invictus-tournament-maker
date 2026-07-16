<script setup lang="ts">
import type { Tiebreaker } from "@/modules/tournament/types"
import AppStepper from "@/components/AppStepper.vue"
import BtnGroup from "@/components/BtnGroup.vue"
import TspLockedCard from "./TspLockedCard.vue"
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
  <div class="form-card">
    <div class="form-section-title">{{ t("tournament.create.tiebreaker") }}</div>
    <div class="form-row">
      <span class="form-label">{{ t("tournament.settingsPage.tiebreaker.method") }}</span>
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
  <TspLockedCard
    :title="t('tournament.settingsPage.scoring.title')"
    :locked="hasAnyResults"
    :locked-message="t('tournament.settingsPage.scoring.lockedBanner')"
  >
    <AppStepper
      v-model="localWinPoints"
      :label="t('tournament.settingsPage.scoring.winPoints')"
      :min="0"
      :max="10"
    />
    <AppStepper
      v-model="localDrawPoints"
      :label="t('tournament.settingsPage.scoring.drawPoints')"
      :min="0"
      :max="10"
    />
    <AppStepper
      v-model="localLossPoints"
      :label="t('tournament.settingsPage.scoring.lossPoints')"
      :min="0"
      :max="10"
    />
  </TspLockedCard>
</template>

<style src="./tournament-settings.css"></style>
