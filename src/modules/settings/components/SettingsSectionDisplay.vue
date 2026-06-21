<script setup lang="ts">
import { computed } from "vue"
import { useSettingsStore } from "../store"
import type { BracketStyle } from "../store"
import { useI18n } from "vue-i18n"
import { Monitor } from "@lucide/vue"
import BtnGroup from "@/components/BtnGroup.vue"
import ToggleSwitch from "@/components/ToggleSwitch.vue"
import SettingDesc from "./SettingDesc.vue"

const { t } = useI18n()
const settings = useSettingsStore()

const bracketStyleOptions = computed<{ value: BracketStyle; label: string }[]>(() => [
  { value: "double-sided", label: t("settings.display.bracketStyle.doubleSided") },
  { value: "classic", label: t("settings.display.bracketStyle.classic") },
  { value: "auto", label: t("settings.display.bracketStyle.auto") },
])
</script>

<template>
  <div class="section-box">
    <h2>
      <Monitor :size="15" class="section-icon" />
      {{ t("settings.display.title") }}
    </h2>
    <div class="section-body">
      <div class="setting-row">
        <div class="setting-info">
          <div class="setting-label">{{ t("settings.display.teamAbbr.label") }}</div>
          <SettingDesc>{{ t("settings.display.teamAbbr.desc", { example: "BRA" }) }}</SettingDesc>
        </div>
        <ToggleSwitch
          v-model="settings.showTeamAbbr"
          :aria-label="t('settings.display.teamAbbr.label')"
        />
      </div>
      <div class="setting-row">
        <div class="setting-info">
          <div class="setting-label">{{ t("settings.display.bracketStyle.label") }}</div>
          <SettingDesc>
            <strong>{{ t("settings.display.bracketStyle.doubleSided") }}</strong>
            — teams on both sides ·
            <strong>{{ t("settings.display.bracketStyle.classic") }}</strong>
            — single left-to-right ·
            <strong>{{ t("settings.display.bracketStyle.auto") }}</strong>
            — Double-Sided for 17+ teams
          </SettingDesc>
        </div>
        <BtnGroup v-model="settings.bracketStyle" :options="bracketStyleOptions" />
      </div>
      <div class="setting-row">
        <div class="setting-info">
          <div class="setting-label">{{ t("settings.display.confetti.label") }}</div>
          <SettingDesc>{{ t("settings.display.confetti.desc") }}</SettingDesc>
        </div>
        <ToggleSwitch
          v-model="settings.confettiOnWin"
          :aria-label="t('settings.display.confetti.label')"
        />
      </div>
      <div class="setting-row">
        <div class="setting-info">
          <div class="setting-label">{{ t("settings.display.sound.label") }}</div>
          <SettingDesc>{{ t("settings.display.sound.desc") }}</SettingDesc>
        </div>
        <ToggleSwitch
          v-model="settings.soundOnWin"
          :aria-label="t('settings.display.sound.label')"
        />
      </div>
      <div class="setting-row">
        <div class="setting-info">
          <div class="setting-label">{{ t("settings.display.bracketHover.label") }}</div>
          <SettingDesc>{{ t("settings.display.bracketHover.desc") }}</SettingDesc>
        </div>
        <ToggleSwitch
          v-model="settings.bracketHighlightOnHover"
          :aria-label="t('settings.display.bracketHover.label')"
        />
      </div>
      <div class="setting-row">
        <div class="setting-info">
          <div class="setting-label">{{ t("settings.display.bracketConnectorColors.label") }}</div>
          <SettingDesc>{{ t("settings.display.bracketConnectorColors.desc") }}</SettingDesc>
        </div>
        <ToggleSwitch
          v-model="settings.bracketConnectorColors"
          :aria-label="t('settings.display.bracketConnectorColors.label')"
        />
      </div>
      <div class="setting-row">
        <div class="setting-info">
          <div class="setting-label">{{ t("settings.display.gradualReveal.label") }}</div>
          <SettingDesc>{{ t("settings.display.gradualReveal.desc") }}</SettingDesc>
        </div>
        <ToggleSwitch
          v-model="settings.gradualReveal"
          :aria-label="t('settings.display.gradualReveal.label')"
        />
      </div>
      <div class="setting-row">
        <div class="setting-info">
          <div class="setting-label">{{ t("drawCeremony.settingsLabel") }}</div>
          <SettingDesc>{{ t("drawCeremony.settingsDesc") }}</SettingDesc>
        </div>
        <ToggleSwitch
          v-model="settings.drawCeremony"
          :aria-label="t('drawCeremony.settingsLabel')"
        />
      </div>
    </div>
  </div>
</template>
