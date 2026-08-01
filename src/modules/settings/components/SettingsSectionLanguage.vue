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
  justify-content: flex-end;
  min-width: 0;
}

/* The language buttons are far wider than the other settings controls, so
   this row's control must be allowed to shrink and wrap instead of holding
   its max-content width (which is what pushed it off screen). */
.lang-field :deep(.field-control) {
  flex-shrink: 1;
  min-width: 0;
}

@media (max-width: 640px) {
  /* The label already takes the full first line here — give the picker its
     own line and lay it out as a 2-column grid. */
  .lang-field :deep(.field-control) {
    flex: 1 1 100%;
    margin-left: 0;
  }
  .lang-picker {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    width: 100%;
  }
}
</style>
