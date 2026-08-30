<script setup lang="ts">
import { computed } from "vue"
import { useSettingsStore } from "../store"
import type { DesignLanguage, Theme } from "../store"
import { useI18n } from "vue-i18n"
import { Palette } from "@lucide/vue"
import { AppCard, AppField, AppIcon, AppButtonGroup } from "@/components/ui"
import { logEvent } from "@/composables/useAnalytics"
import SettingDesc from "./SettingDesc.vue"

const { t } = useI18n()
const settings = useSettingsStore()

const themes = computed<{ value: Theme; label: string }[]>(() => [
  { value: "light", label: t("settings.appearance.theme.light") },
  { value: "dark", label: t("settings.appearance.theme.dark") },
])

/* Named for what they look like, not for the platform they come from:
   the app ships on Android, so labelling a look "iOS" there would read as
   a promise the app is not making. */
const designs = computed<{ value: DesignLanguage; label: string }[]>(() => [
  { value: "ios", label: t("settings.appearance.design.soft") },
  { value: "android", label: t("settings.appearance.design.vivid") },
])

/* Logged from the control rather than from a store watcher: the watcher
   also fires when the persisted value hydrates on launch, which would
   count every app start as a deliberate switch. */
function selectDesign(value: string) {
  const next = value as DesignLanguage
  if (next === settings.designLanguage) return
  const from = settings.designLanguage
  settings.designLanguage = next
  void logEvent("design_language_change", { from, to: next })
}

/* Must stay in sync with --accent in assets/style/variables.css: picking
   this swatch clears the override rather than writing the same value. */
const DEFAULT_COLOR = "#0b7264"

/* Held at a common depth so no swatch reads as louder than the rest, and
   spread far enough apart in hue that none of them reads as a near-miss of
   the teal default. */
const COLOR_PRESETS = [
  DEFAULT_COLOR,
  "#2f6fb5",
  "#8a3fa0",
  "#b8336a",
  "#c2452c",
  "#c07a17",
  "#3f7a2e",
  "#4a5560",
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

    <AppField layout="split" :label="t('settings.appearance.design.label')">
      <template #description>
        <SettingDesc>{{ t("settings.appearance.design.desc") }}</SettingDesc>
      </template>
      <AppButtonGroup
        :model-value="settings.designLanguage"
        :options="designs"
        @update:model-value="selectDesign"
      />
    </AppField>

    <AppField layout="split" :label="t('settings.appearance.theme.label')">
      <template #description>
        <SettingDesc>{{ t("settings.appearance.theme.desc") }}</SettingDesc>
      </template>
      <AppButtonGroup v-model="settings.theme" :options="themes" />
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
