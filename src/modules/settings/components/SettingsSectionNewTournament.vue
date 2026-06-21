<script setup lang="ts">
import { useSettingsStore } from "../store"
import { useI18n } from "vue-i18n"
import { CalendarPlus } from "@lucide/vue"
import BtnGroup from "@/components/BtnGroup.vue"
import SettingDesc from "./SettingDesc.vue"

const { t } = useI18n()
const settings = useSettingsStore()
</script>

<template>
  <div class="section-box">
    <h2>
      <CalendarPlus :size="15" class="section-icon" />
      {{ t("settings.newTournament.title") }}
    </h2>
    <div class="section-body">
      <p class="section-intro">{{ t("settings.newTournament.intro") }}</p>
      <div class="setting-group">
        <div class="setting-row">
          <div class="setting-info">
            <div class="setting-label">{{ t("settings.newTournament.knockoutDraw.label") }}</div>
            <SettingDesc>{{ t("settings.newTournament.knockoutDraw.desc") }}</SettingDesc>
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
            <SettingDesc>{{ t("settings.newTournament.groupDraw.desc") }}</SettingDesc>
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
            <SettingDesc>{{ t("settings.newTournament.playoffSeeding.desc") }}</SettingDesc>
          </div>
          <BtnGroup
            v-model="settings.newSeasonPlayoffSeedMode"
            :options="[
              { value: 'cross', label: t('settings.newTournament.drawLegend.cross') },
              { value: 'no-same-group', label: t('settings.newTournament.drawLegend.noRematch') },
              { value: 'random', label: t('common.random') },
              { value: 'manual', label: t('common.manual') },
            ]"
          />
        </div>
      </div>
      <div class="setting-group" style="margin-top: 16px">
        <div class="setting-row scoring-row">
          <div class="setting-info">
            <div class="setting-label">{{ t("settings.newTournament.scoring.title") }}</div>
            <SettingDesc>{{ t("settings.newTournament.scoring.desc") }}</SettingDesc>
          </div>
          <div class="scoring-steppers">
            <div class="scoring-stepper-item">
              <span class="scoring-badge">{{ t("settings.newTournament.scoring.winPoints") }}</span>
              <div class="stepper-ctrl">
                <button
                  :disabled="settings.winPoints <= 0"
                  @click="settings.winPoints = Math.max(0, settings.winPoints - 1)"
                >
                  −
                </button>
                <span class="stepper-num">{{ settings.winPoints }}</span>
                <button
                  :disabled="settings.winPoints >= 10"
                  @click="settings.winPoints = Math.min(10, settings.winPoints + 1)"
                >
                  +
                </button>
              </div>
            </div>
            <div class="scoring-stepper-item">
              <span class="scoring-badge">
                {{ t("settings.newTournament.scoring.drawPoints") }}
              </span>
              <div class="stepper-ctrl">
                <button
                  :disabled="settings.drawPoints <= 0"
                  @click="settings.drawPoints = Math.max(0, settings.drawPoints - 1)"
                >
                  −
                </button>
                <span class="stepper-num">{{ settings.drawPoints }}</span>
                <button
                  :disabled="settings.drawPoints >= 10"
                  @click="settings.drawPoints = Math.min(10, settings.drawPoints + 1)"
                >
                  +
                </button>
              </div>
            </div>
            <div class="scoring-stepper-item">
              <span class="scoring-badge">
                {{ t("settings.newTournament.scoring.lossPoints") }}
              </span>
              <div class="stepper-ctrl">
                <button
                  :disabled="settings.lossPoints <= 0"
                  @click="settings.lossPoints = Math.max(0, settings.lossPoints - 1)"
                >
                  −
                </button>
                <span class="stepper-num">{{ settings.lossPoints }}</span>
                <button
                  :disabled="settings.lossPoints >= 10"
                  @click="settings.lossPoints = Math.min(10, settings.lossPoints + 1)"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="draw-legend">
        <div class="draw-legend-row">
          <strong>{{ t("settings.newTournament.drawLegend.drawOptions") }}</strong>
          {{
            t("settings.newTournament.drawLegend.draw", {
              random: t("common.random"),
              seeded: t("common.seeded"),
              manual: t("common.manual"),
            })
          }}
        </div>
        <div class="draw-legend-row">
          <strong>{{ t("settings.newTournament.drawLegend.playoffSeeding") }}</strong>
          {{
            t("settings.newTournament.drawLegend.playoff", {
              cross: t("settings.newTournament.drawLegend.cross"),
              noRematch: t("settings.newTournament.drawLegend.noRematch"),
              random: t("common.random"),
            })
          }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scoring-row {
  align-items: flex-start;
}
.scoring-steppers {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
}
.scoring-stepper-item {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: flex-end;
}
.scoring-badge {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  min-width: 64px;
  text-align: right;
}
.stepper-ctrl {
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}
.stepper-ctrl button {
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  font-size: 15px;
  line-height: 1;
  border-radius: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  background: var(--surface);
  color: var(--text);
  cursor: pointer;
}
.stepper-ctrl button:first-child {
  border-right: 1px solid var(--border);
}
.stepper-ctrl button:last-child {
  border-left: 1px solid var(--border);
}
.stepper-ctrl button:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.stepper-num {
  width: 32px;
  text-align: center;
  font-size: 14px;
  font-weight: 700;
  font-family: var(--font-ui);
}
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
