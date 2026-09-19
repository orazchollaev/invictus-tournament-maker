<script setup lang="ts">
import { useSettingsStore } from "../store"
import { useI18n } from "vue-i18n"
import { Languages } from "@lucide/vue"
import { LOCALES } from "@/i18n"
import { AppCard, AppField, AppIcon, AppSelect } from "@/components/ui"
import SettingDesc from "./SettingDesc.vue"
import { FlagCircle } from "@/modules/teams/components"

const { t } = useI18n()
const settings = useSettingsStore()
</script>

<template>
  <AppCard padding="md">
    <template #title>
      <AppIcon :icon="Languages" size="md" />
      {{ t("settings.language.label") }}
    </template>

    <AppField layout="split" :label="t('settings.language.label')">
      <template #description>
        <SettingDesc>{{ t("settings.language.desc") }}</SettingDesc>
      </template>
      <AppSelect v-model="settings.locale" :options="LOCALES">
        <template #value="{ option }">
          <span v-if="option" class="lang-row">
            <FlagCircle :code="option.flag" :size="18" />
            {{ option.label }}
          </span>
        </template>
        <template #option="{ option }">
          <span class="lang-row">
            <FlagCircle :code="option.flag" :size="18" />
            {{ option.label }}
          </span>
        </template>
      </AppSelect>
    </AppField>
  </AppCard>
</template>

<style scoped>
.lang-row {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-2);
}
</style>
