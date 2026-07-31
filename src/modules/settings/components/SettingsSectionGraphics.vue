<script setup lang="ts">
import { computed } from "vue"
import { useSettingsStore } from "../store"
import { useI18n } from "vue-i18n"
import { Sparkles } from "@lucide/vue"
import { AppCard, AppField, AppIcon, BtnGroup } from "@/components/ui"
import SettingDesc from "./SettingDesc.vue"

const { t } = useI18n()
const settings = useSettingsStore()

const bracketQualityOptions = computed(() => [
  { value: "high", label: t("settings.graphics.bracketQuality.high") },
  { value: "low", label: t("settings.graphics.bracketQuality.low") },
])
</script>

<template>
  <AppCard padding="md">
    <template #title>
      <AppIcon :icon="Sparkles" size="md" />
      {{ t("settings.graphics.title") }}
    </template>

    <AppField layout="split" :label="t('settings.graphics.bracketQuality.label')">
      <template #description>
        <SettingDesc>{{ t("settings.graphics.bracketQuality.desc") }}</SettingDesc>
      </template>
      <BtnGroup v-model="settings.bracketQuality" :options="bracketQualityOptions" />
    </AppField>
  </AppCard>
</template>
