<script setup lang="ts">
import { computed } from "vue"
import { useSettingsStore } from "../store"
import { useI18n } from "vue-i18n"
import { CalendarPlus } from "@lucide/vue"
import { AppCard, AppField, AppIcon, AppNumberInput, BtnGroup } from "@/components/ui"
import SettingDesc from "./SettingDesc.vue"

const { t } = useI18n()
const settings = useSettingsStore()

const drawOptions = computed(() => [
  { value: "random", label: t("common.random") },
  { value: "seeded", label: t("common.seeded") },
  { value: "manual", label: t("common.manual") },
])

const playoffSeedOptions = computed(() => [
  { value: "cross", label: t("settings.newTournament.drawLegend.cross") },
  { value: "no-same-group", label: t("settings.newTournament.drawLegend.noRematch") },
  { value: "random", label: t("common.random") },
  { value: "manual", label: t("common.manual") },
])

const SCORING = [
  { key: "winPoints", label: "settings.newTournament.scoring.winPoints" },
  { key: "drawPoints", label: "settings.newTournament.scoring.drawPoints" },
  { key: "lossPoints", label: "settings.newTournament.scoring.lossPoints" },
] as const
</script>

<template>
  <AppCard padding="md">
    <template #title>
      <AppIcon :icon="CalendarPlus" size="md" />
      {{ t("settings.newTournament.title") }}
    </template>

    <p class="section-intro">{{ t("settings.newTournament.intro") }}</p>

    <AppField layout="split" :label="t('settings.newTournament.knockoutDraw.label')">
      <template #description>
        <SettingDesc>{{ t("settings.newTournament.knockoutDraw.desc") }}</SettingDesc>
      </template>
      <BtnGroup v-model="settings.newSeasonDrawType" :options="drawOptions" />
    </AppField>

    <AppField layout="split" :label="t('settings.newTournament.groupDraw.label')">
      <template #description>
        <SettingDesc>{{ t("settings.newTournament.groupDraw.desc") }}</SettingDesc>
      </template>
      <BtnGroup v-model="settings.newSeasonGroupDrawType" :options="drawOptions" />
    </AppField>

    <AppField layout="split" :label="t('settings.newTournament.playoffSeeding.label')">
      <template #description>
        <SettingDesc>{{ t("settings.newTournament.playoffSeeding.desc") }}</SettingDesc>
      </template>
      <BtnGroup v-model="settings.newSeasonPlayoffSeedMode" :options="playoffSeedOptions" />
    </AppField>

    <AppField layout="split" :label="t('settings.newTournament.scoring.title')" class="scoring-row">
      <template #description>
        <SettingDesc>{{ t("settings.newTournament.scoring.desc") }}</SettingDesc>
      </template>
      <div class="scoring-steppers">
        <div v-for="s in SCORING" :key="s.key" class="scoring-item">
          <span class="scoring-label">{{ t(s.label) }}</span>
          <AppNumberInput v-model="settings[s.key]" :min="0" :max="10" />
        </div>
      </div>
    </AppField>

    <div class="draw-legend">
      <p class="draw-legend-row">
        <strong>{{ t("settings.newTournament.drawLegend.drawOptions") }}</strong>
        {{
          t("settings.newTournament.drawLegend.draw", {
            random: t("common.random"),
            seeded: t("common.seeded"),
            manual: t("common.manual"),
          })
        }}
      </p>
      <p class="draw-legend-row">
        <strong>{{ t("settings.newTournament.drawLegend.playoffSeeding") }}</strong>
        {{
          t("settings.newTournament.drawLegend.playoff", {
            cross: t("settings.newTournament.drawLegend.cross"),
            noRematch: t("settings.newTournament.drawLegend.noRematch"),
            random: t("common.random"),
          })
        }}
      </p>
    </div>
  </AppCard>
</template>

<style scoped>
.scoring-row {
  align-items: flex-start;
}

.scoring-steppers {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  flex-shrink: 0;
}

.scoring-item {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--sp-2);
}

.scoring-label {
  font-size: var(--fs-xs);
  font-weight: 600;
  color: var(--text-muted);
  min-width: 64px;
  text-align: right;
}

.draw-legend {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
  margin-top: var(--sp-3);
  padding: var(--sp-2) var(--sp-3);
  background: var(--bg);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
}

.draw-legend-row {
  margin: 0;
  font-size: var(--fs-xs);
  color: var(--text-muted);
  line-height: 1.5;
}
</style>
