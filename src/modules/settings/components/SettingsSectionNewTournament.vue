<script setup lang="ts">
import { useSettingsStore } from "../store"
import { useI18n } from "vue-i18n"
import BtnGroup from "@/components/BtnGroup.vue"

const { t } = useI18n()
const settings = useSettingsStore()
</script>

<template>
  <div class="section-box">
    <h2>{{ t("settings.newTournament.title") }}</h2>
    <div class="section-body">
      <p class="section-intro">{{ t("settings.newTournament.intro") }}</p>
      <div class="setting-group">
        <div class="setting-row">
          <div class="setting-info">
            <div class="setting-label">{{ t("settings.newTournament.knockoutDraw.label") }}</div>
            <div class="setting-desc">{{ t("settings.newTournament.knockoutDraw.desc") }}</div>
          </div>
          <BtnGroup
            v-model="settings.newSeasonDrawType"
            :options="[
              { value: 'random', label: t('common.random') },
              { value: 'seeded', label: t('common.seeded') },
              { value: 'manual', label: t('common.manual') },
            ]"
          />
        </div>
        <div class="setting-row">
          <div class="setting-info">
            <div class="setting-label">{{ t("settings.newTournament.groupDraw.label") }}</div>
            <div class="setting-desc">{{ t("settings.newTournament.groupDraw.desc") }}</div>
          </div>
          <BtnGroup
            v-model="settings.newSeasonGroupDrawType"
            :options="[
              { value: 'random', label: t('common.random') },
              { value: 'seeded', label: t('common.seeded') },
              { value: 'manual', label: t('common.manual') },
            ]"
          />
        </div>
        <div class="setting-row">
          <div class="setting-info">
            <div class="setting-label">
              {{ t("settings.newTournament.playoffSeeding.label") }}
            </div>
            <div class="setting-desc">{{ t("settings.newTournament.playoffSeeding.desc") }}</div>
          </div>
          <BtnGroup
            v-model="settings.newSeasonPlayoffSeedMode"
            :options="[
              { value: 'cross', label: t('settings.newTournament.drawLegend.cross') },
              { value: 'no-same-group', label: t('settings.newTournament.drawLegend.noRematch') },
              { value: 'random', label: t('common.random') },
            ]"
          />
        </div>
      </div>
      <div class="draw-legend">
        <div class="draw-legend-row">
          <strong>Draw options:</strong>
          {{ t("common.random") }} — by chance &nbsp;·&nbsp; {{ t("common.seeded") }} — best teams
          separated &nbsp;·&nbsp; {{ t("common.manual") }} — you place teams
        </div>
        <div class="draw-legend-row">
          <strong>Playoff seeding:</strong>
          {{ t("settings.newTournament.drawLegend.cross") }} — A1 vs B2, B1 vs A2 &nbsp;·&nbsp;
          {{ t("settings.newTournament.drawLegend.noRematch") }} — avoids same-group opponents in
          Round 1 &nbsp;·&nbsp; {{ t("common.random") }} — fully random
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.draw-legend {
  margin-top: 12px;
  padding: 8px 10px;
  background: var(--bg);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.draw-legend-row {
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.5;
}
</style>
