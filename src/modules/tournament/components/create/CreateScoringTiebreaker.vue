<script setup lang="ts">
import AppStepper from "@/components/AppStepper.vue"
import BtnGroup from "@/components/BtnGroup.vue"
import type { Tiebreaker } from "@/modules/tournament/types"
import { useI18n } from "vue-i18n"

const { t } = useI18n()

const tiebreaker = defineModel<Tiebreaker>("tiebreaker", { required: true })
const winPoints = defineModel<number>("winPoints", { required: true })
const drawPoints = defineModel<number>("drawPoints", { required: true })
const lossPoints = defineModel<number>("lossPoints", { required: true })
</script>

<template>
  <!-- Tiebreaker -->
  <div class="form-card">
    <div class="form-section-title">{{ t("tournament.create.tiebreaker") }}</div>
    <div class="form-row">
      <span class="form-label">{{ t("tournament.settingsPage.tiebreaker.method") }}</span>
      <BtnGroup
        v-model="tiebreaker"
        :options="[
          { value: 'head-to-head', label: t('tournament.settingsPage.tiebreaker.h2h') },
          { value: 'goal-diff', label: t('tournament.settingsPage.tiebreaker.goalDiff') },
        ]"
      />
    </div>
  </div>

  <!-- Scoring -->
  <div class="form-card">
    <div class="form-section-title">{{ t("tournament.settingsPage.scoring.title") }}</div>
    <AppStepper
      v-model="winPoints"
      :label="t('tournament.settingsPage.scoring.winPoints')"
      :min="0"
      :max="10"
    />
    <AppStepper
      v-model="drawPoints"
      :label="t('tournament.settingsPage.scoring.drawPoints')"
      :min="0"
      :max="10"
    />
    <AppStepper
      v-model="lossPoints"
      :label="t('tournament.settingsPage.scoring.lossPoints')"
      :min="0"
      :max="10"
    />
  </div>
</template>

<style src="./create-tournament.css"></style>
