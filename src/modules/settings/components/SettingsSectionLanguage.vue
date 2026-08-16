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

    <AppField layout="split" class="lang-field" :label="t('settings.language.label')">
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
          <FlagCircle :code="loc.flag" :size="22" />
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
  justify-content: flex-end;
  min-width: 0;
}

.lang-field :deep(.field-control) {
  flex-shrink: 1;
  min-width: 0;
}

@media (max-width: 640px) {
  .lang-field :deep(.field-control) {
    flex: 1 1 100%;
    margin-inline-start: 0;
    width: 100%;
  }

  .lang-picker {
    display: grid;
    width: 100%;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: var(--sp-2);
  }

  .lang-picker > * {
    width: 100%;
    min-width: 0;
  }
}
</style>
