<script setup lang="ts">
import { useSettingsStore } from "../store"
import { useI18n } from "vue-i18n"
import { Database, RotateCcw } from "@lucide/vue"
import { AppButton, AppCard, AppField, AppIcon } from "@/components/ui"
import { useDataManagement } from "../composables/useDataManagement"
import SettingDesc from "./SettingDesc.vue"

const { t } = useI18n()
const settings = useSettingsStore()
const { exportData, importData, clearData } = useDataManagement()
</script>

<template>
  <AppCard padding="md">
    <template #title>
      <AppIcon :icon="Database" size="md" />
      {{ t("settings.dataManagement.title") }}
    </template>

    <AppField layout="split" :label="t('settings.dataManagement.backup.label')">
      <template #description>
        <SettingDesc>{{ t("settings.dataManagement.backup.desc") }}</SettingDesc>
      </template>
      <AppButton @click="exportData">{{ t("common.export") }}</AppButton>
      <AppButton @click="importData">{{ t("common.import") }}</AppButton>
    </AppField>

    <AppField layout="split">
      <template #label>
        <span class="danger-label">{{ t("settings.dataManagement.clearAll.label") }}</span>
      </template>
      <template #description>
        <SettingDesc>{{ t("settings.dataManagement.clearAll.desc") }}</SettingDesc>
      </template>
      <AppButton variant="danger" @click="clearData">
        {{ t("settings.dataManagement.clearAll.btn") }}
      </AppButton>
    </AppField>
  </AppCard>

  <AppCard padding="md">
    <template #title>
      <AppIcon :icon="RotateCcw" size="md" />
      {{ t("settings.resetSettings.title") }}
    </template>

    <AppField layout="split" :label="t('settings.resetSettings.label')">
      <template #description>
        <SettingDesc>{{ t("settings.resetSettings.desc") }}</SettingDesc>
      </template>
      <AppButton @click="settings.resetAll()">{{ t("settings.resetSettings.btn") }}</AppButton>
    </AppField>
  </AppCard>
</template>

<style scoped>
.danger-label {
  color: var(--danger);
}
</style>
