<script setup lang="ts">
import { useSettingsStore } from "../store"
import { useI18n } from "vue-i18n"
import { Languages } from "@lucide/vue"
import { LOCALES } from "@/i18n"
import { AppButton, AppCard, AppField, AppIcon } from "@/components/ui"
import SettingDesc from "./SettingDesc.vue"
import FlagCircle from "@/modules/teams/components/FlagCircle.vue"

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
      <div class="lang-picker">
        <AppButton
          v-for="loc in LOCALES"
          :key="loc.value"
          :variant="settings.locale === loc.value ? 'tonal' : 'outlined'"
          @click="settings.locale = loc.value"
        >
          <FlagCircle :code="loc.flag" :size="18" />
          {{ loc.label }}
        </AppButton>
      </div>
    </AppField>
  </AppCard>
</template>

<style scoped>
.lang-picker {
  display: flex;
  gap: var(--sp-2);
  flex-wrap: wrap;
  flex-shrink: 0;
}
</style>
