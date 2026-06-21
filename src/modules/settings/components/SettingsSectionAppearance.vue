<script setup lang="ts">
import { computed } from "vue"
import { useSettingsStore } from "../store"
import type { Theme } from "../store"
import { useI18n } from "vue-i18n"
import { Palette } from "@lucide/vue"
import BtnGroup from "@/components/BtnGroup.vue"
import SettingDesc from "./SettingDesc.vue"

const { t } = useI18n()
const settings = useSettingsStore()

const themes = computed<{ value: Theme; label: string }[]>(() => [
  { value: "light", label: t("settings.appearance.theme.light") },
  { value: "dark", label: t("settings.appearance.theme.dark") },
  { value: "worldcup2026", label: t("settings.appearance.theme.worldcup2026") },
])
</script>

<template>
  <div class="section-box">
    <h2>
      <Palette :size="15" class="section-icon" />
      {{ t("settings.appearance.title") }}
    </h2>
    <div class="section-body">
      <div class="setting-row">
        <div class="setting-info">
          <div class="setting-label">{{ t("settings.appearance.theme.label") }}</div>
          <SettingDesc>{{ t("settings.appearance.theme.desc") }}</SettingDesc>
        </div>
        <BtnGroup v-model="settings.theme" :options="themes" />
      </div>
    </div>
  </div>
</template>
