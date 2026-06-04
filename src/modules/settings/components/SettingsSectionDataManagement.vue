<script setup lang="ts">
import { useSettingsStore } from "../store"
import { useI18n } from "vue-i18n"
import { useDataManagement } from "../composables/useDataManagement"

const { t } = useI18n()
const settings = useSettingsStore()
const { exportData, importData, clearData } = useDataManagement()
</script>

<template>
  <div class="section-box">
    <h2>{{ t("settings.dataManagement.title") }}</h2>
    <div class="section-body">
      <div class="setting-row">
        <div class="setting-info">
          <div class="setting-label">{{ t("settings.dataManagement.backup.label") }}</div>
          <div class="setting-desc">{{ t("settings.dataManagement.backup.desc") }}</div>
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
          <div class="setting-desc">{{ t("settings.dataManagement.clearAll.desc") }}</div>
        </div>
        <button class="danger" @click="clearData">
          {{ t("settings.dataManagement.clearAll.btn") }}
        </button>
      </div>
    </div>
  </div>

  <div class="section-box">
    <h2>{{ t("settings.resetSettings.title") }}</h2>
    <div class="section-body">
      <div class="danger-setting-row" style="margin-top: 0; padding-top: 0; border-top: none">
        <div class="setting-info">
          <div class="setting-label">{{ t("settings.resetSettings.label") }}</div>
          <div class="setting-desc">{{ t("settings.resetSettings.desc") }}</div>
        </div>
        <button @click="settings.resetAll()">{{ t("settings.resetSettings.btn") }}</button>
      </div>
    </div>
  </div>
</template>
