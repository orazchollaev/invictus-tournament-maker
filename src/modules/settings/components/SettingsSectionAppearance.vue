<script setup lang="ts">
import { computed } from "vue"
import { useSettingsStore } from "../store"
import type { Theme } from "../store"
import { useI18n } from "vue-i18n"
import { Palette } from "@lucide/vue"
import { AppCard, AppField, AppIcon, BtnGroup } from "@/components/ui"
import SettingDesc from "./SettingDesc.vue"

const { t } = useI18n()
const settings = useSettingsStore()

const themes = computed<{ value: Theme; label: string }[]>(() => [
  { value: "light", label: t("settings.appearance.theme.light") },
  { value: "dark", label: t("settings.appearance.theme.dark") },
])
</script>

<template>
  <AppCard padding="md">
    <template #title>
      <AppIcon :icon="Palette" size="md" />
      {{ t("settings.appearance.title") }}
    </template>

    <AppField layout="split" :label="t('settings.appearance.theme.label')">
      <template #description>
        <SettingDesc>{{ t("settings.appearance.theme.desc") }}</SettingDesc>
      </template>
      <BtnGroup v-model="settings.theme" :options="themes" />
    </AppField>
  </AppCard>
</template>
