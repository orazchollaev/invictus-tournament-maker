<script setup lang="ts">
import { computed } from "vue"
import { useSettingsStore } from "../store"
import { useI18n } from "vue-i18n"
import BtnGroup from "@/components/BtnGroup.vue"
import SettingDesc from "./SettingDesc.vue"

const { t } = useI18n()
const settings = useSettingsStore()

const bracketQualityOptions = computed(() => [
  { value: "high", label: t("settings.graphics.bracketQuality.high") },
  { value: "low", label: t("settings.graphics.bracketQuality.low") },
])
</script>

<template>
  <div class="section-box">
    <h2>{{ t("settings.graphics.title") }}</h2>
    <div class="section-body">
      <div class="setting-row">
        <div class="setting-info">
          <div class="setting-label">{{ t("settings.graphics.bracketQuality.label") }}</div>
          <SettingDesc>{{ t("settings.graphics.bracketQuality.desc") }}</SettingDesc>
        </div>
        <BtnGroup v-model="settings.bracketQuality" :options="bracketQualityOptions" />
      </div>
    </div>
  </div>
</template>
