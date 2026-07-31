<script setup lang="ts">
import { computed } from "vue"
import { useSettingsStore } from "../store"
import type { BracketStyle } from "../store"
import { useI18n } from "vue-i18n"
import { Monitor } from "@lucide/vue"
import { AppCard, AppField, AppIcon, BtnGroup, ToggleSwitch } from "@/components/ui"
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
  <AppCard padding="md">
    <template #title>
      <AppIcon :icon="Monitor" size="md" />
      {{ t("settings.display.title") }}
    </template>

    <AppField layout="split" :label="t('settings.display.teamAbbr.label')">
      <template #description>
        <SettingDesc>{{ t("settings.display.teamAbbr.desc", { example: "BRA" }) }}</SettingDesc>
      </template>
      <ToggleSwitch
        v-model="settings.showTeamAbbr"
        :aria-label="t('settings.display.teamAbbr.label')"
      />
    </AppField>

    <AppField layout="split" :label="t('settings.display.bracketStyle.label')">
      <template #description>
        <SettingDesc>
          <strong>{{ t("settings.display.bracketStyle.doubleSided") }}</strong>
          — teams on both sides ·
          <strong>{{ t("settings.display.bracketStyle.classic") }}</strong>
          — single left-to-right ·
          <strong>{{ t("settings.display.bracketStyle.auto") }}</strong>
          — Double-Sided for 17+ teams
        </SettingDesc>
      </template>
      <BtnGroup v-model="settings.bracketStyle" :options="bracketStyleOptions" />
    </AppField>

    <AppField layout="split" :label="t('settings.display.confetti.label')">
      <template #description>
        <SettingDesc>{{ t("settings.display.confetti.desc") }}</SettingDesc>
      </template>
      <ToggleSwitch
        v-model="settings.confettiOnWin"
        :aria-label="t('settings.display.confetti.label')"
      />
    </AppField>

    <AppField layout="split" :label="t('settings.display.sound.label')">
      <template #description>
        <SettingDesc>{{ t("settings.display.sound.desc") }}</SettingDesc>
      </template>
      <ToggleSwitch v-model="settings.soundOnWin" :aria-label="t('settings.display.sound.label')" />
    </AppField>

    <AppField layout="split" :label="t('settings.display.bracketHover.label')">
      <template #description>
        <SettingDesc>{{ t("settings.display.bracketHover.desc") }}</SettingDesc>
      </template>
      <ToggleSwitch
        v-model="settings.bracketHighlightOnHover"
        :aria-label="t('settings.display.bracketHover.label')"
      />
    </AppField>

    <AppField layout="split" :label="t('settings.display.bracketConnectorColors.label')">
      <template #description>
        <SettingDesc>{{ t("settings.display.bracketConnectorColors.desc") }}</SettingDesc>
      </template>
      <ToggleSwitch
        v-model="settings.bracketConnectorColors"
        :aria-label="t('settings.display.bracketConnectorColors.label')"
      />
    </AppField>

    <AppField layout="split" :label="t('settings.display.gradualReveal.label')">
      <template #description>
        <SettingDesc>{{ t("settings.display.gradualReveal.desc") }}</SettingDesc>
      </template>
      <ToggleSwitch
        v-model="settings.gradualReveal"
        :aria-label="t('settings.display.gradualReveal.label')"
      />
    </AppField>

    <AppField layout="split" :label="t('drawCeremony.settingsLabel')">
      <template #description>
        <SettingDesc>{{ t("drawCeremony.settingsDesc") }}</SettingDesc>
      </template>
      <ToggleSwitch v-model="settings.drawCeremony" :aria-label="t('drawCeremony.settingsLabel')" />
    </AppField>
  </AppCard>
</template>
