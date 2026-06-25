<script setup lang="ts">
import { useSettingsStore } from "../store"
import { useI18n } from "vue-i18n"
import { Database, RotateCcw } from "@lucide/vue"
import { useDataManagement } from "../composables/useDataManagement"
import SettingDesc from "./SettingDesc.vue"

const { t } = useI18n()
const settings = useSettingsStore()
const { exportData, importData, clearData } = useDataManagement()
</script>

<template>
  <div class="section-box">
    <h2>
      <Database :size="15" class="section-icon" />
      {{ t("settings.dataManagement.title") }}
    </h2>
    <div class="section-body" style="padding: 4px 8px 10px 8px">
      <div class="setting-row">
        <div class="setting-info">
          <div class="setting-label">{{ t("settings.dataManagement.backup.label") }}</div>
          <SettingDesc>{{ t("settings.dataManagement.backup.desc") }}</SettingDesc>
        </div>
        <div class="btn-row">
          <button @click="exportData">{{ t("common.export") }}</button>
          <button @click="importData">{{ t("common.import") }}</button>
        </div>
      </div>
      <div class="danger-setting-row">
        <div class="setting-info">
          <div class="setting-label danger-label">
            {{ t("settings.dataManagement.clearAll.label") }}
          </div>
          <SettingDesc>{{ t("settings.dataManagement.clearAll.desc") }}</SettingDesc>
        </div>
        <button class="danger" @click="clearData">
          {{ t("settings.dataManagement.clearAll.btn") }}
        </button>
      </div>
    </div>
  </div>

  <div class="section-box">
    <h2>
      <RotateCcw :size="15" class="section-icon" />
      {{ t("settings.resetSettings.title") }}
    </h2>
    <div class="section-body" style="padding: 10px 8px">
      <div class="danger-setting-row" style="margin-top: 0; padding-top: 0; border-top: none">
        <div class="setting-info">
          <div class="setting-label">{{ t("settings.resetSettings.label") }}</div>
          <SettingDesc>{{ t("settings.resetSettings.desc") }}</SettingDesc>
        </div>
        <button @click="settings.resetAll()">{{ t("settings.resetSettings.btn") }}</button>
      </div>
    </div>
  </div>
</template>
