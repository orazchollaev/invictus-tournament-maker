<script setup lang="ts">
import { computed } from "vue"
import { useSettingsStore } from "../store"
import { useI18n } from "vue-i18n"
import { Sparkles } from "@lucide/vue"
import BtnGroup from "@/components/BtnGroup.vue"
import ToggleSwitch from "@/components/ToggleSwitch.vue"
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
    <h2>
      <Sparkles :size="15" class="section-icon" />
      {{ t("settings.graphics.title") }}
    </h2>
    <div class="section-body">
      <div class="setting-row">
        <div class="setting-info">
          <div class="setting-label">{{ t("settings.graphics.bracketQuality.label") }}</div>
          <SettingDesc>{{ t("settings.graphics.bracketQuality.desc") }}</SettingDesc>
        </div>
        <BtnGroup v-model="settings.bracketQuality" :options="bracketQualityOptions" />
      </div>
      <div class="setting-row">
        <div class="setting-info">
          <div class="setting-label">{{ t("settings.graphics.uiAnimations.label") }}</div>
          <SettingDesc>{{ t("settings.graphics.uiAnimations.desc") }}</SettingDesc>
        </div>
        <ToggleSwitch
          v-model="settings.uiAnimations"
          :aria-label="t('settings.graphics.uiAnimations.label')"
        />
      </div>
    </div>
  </div>
</template>
