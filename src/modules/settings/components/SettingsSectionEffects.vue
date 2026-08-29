<script setup lang="ts">
import { computed } from "vue"
import { useSettingsStore, type LiveMatchSpeed } from "../store"
import { useI18n } from "vue-i18n"
import { PartyPopper } from "@lucide/vue"
import { AppCard, AppField, AppIcon, BtnGroup, ToggleSwitch } from "@/components/ui"
import SettingDesc from "./SettingDesc.vue"

const { t } = useI18n()
const settings = useSettingsStore()

const speedOptions = computed(() =>
  ([1, 2, 4, 10] as const).map((value) => ({
    value: String(value),
    label: t("liveMatch.speedOption", { value }),
  }))
)
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

    <AppField layout="split" :label="t('liveMatch.settingsLabel')">
      <template #description>
        <SettingDesc>{{ t("liveMatch.settingsDesc") }}</SettingDesc>
      </template>
      <BtnGroup
        :model-value="String(settings.liveMatchSpeed)"
        :options="speedOptions"
        size="xs"
        @update:model-value="(v) => (settings.liveMatchSpeed = Number(v) as LiveMatchSpeed)"
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
