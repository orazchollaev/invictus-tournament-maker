<script setup lang="ts">
import { useSettingsStore } from "../store"
import { useI18n } from "vue-i18n"
import { PartyPopper } from "@lucide/vue"
import { AppCard, AppField, AppIcon, ToggleSwitch } from "@/components/ui"
import SettingDesc from "./SettingDesc.vue"

const { t } = useI18n()
const settings = useSettingsStore()
</script>

<template>
  <AppCard padding="md">
    <template #title>
      <AppIcon :icon="PartyPopper" size="md" />
      {{ t("settings.effects.title") }}
    </template>

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

    <AppField layout="split" :label="t('drawCeremony.settingsLabel')">
      <template #description>
        <SettingDesc>{{ t("drawCeremony.settingsDesc") }}</SettingDesc>
      </template>
      <ToggleSwitch v-model="settings.drawCeremony" :aria-label="t('drawCeremony.settingsLabel')" />
    </AppField>
  </AppCard>
</template>
