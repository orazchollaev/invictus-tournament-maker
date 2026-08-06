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

const DEFAULT_COLOR = "#0d9488"

const COLOR_PRESETS = [
  DEFAULT_COLOR,
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#f97316",
  "#ef4444",
  "#f59e0b",
]

function isSelected(c: string) {
  return c === DEFAULT_COLOR ? settings.primaryColor === null : settings.primaryColor === c
}

function selectColor(c: string) {
  settings.primaryColor = c === DEFAULT_COLOR ? null : c
}
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

    <AppField layout="split" :label="t('settings.appearance.primaryColor.label')">
      <template #description>
        <SettingDesc>{{ t("settings.appearance.primaryColor.desc") }}</SettingDesc>
      </template>
      <div class="presets">
        <button
          v-for="c in COLOR_PRESETS"
          :key="c"
          class="swatch"
          :class="{ selected: isSelected(c) }"
          :style="{ background: c }"
          :title="c"
          type="button"
          @click="selectColor(c)"
        />
      </div>
    </AppField>
  </AppCard>
</template>

<style scoped>
.presets {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.swatch {
  width: 26px;
  aspect-ratio: 1;
  border-radius: var(--radius);
  border: 2px solid transparent;
  cursor: pointer;
  padding: 0;
  transition:
    transform 0.1s,
    border-color 0.1s;
  outline: none;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.15) inset;
}
.swatch:hover {
  transform: scale(1.12);
}
.swatch.selected {
  border-color: var(--text);
  transform: scale(1.1);
}
</style>
