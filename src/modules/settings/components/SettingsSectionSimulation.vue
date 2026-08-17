<script setup lang="ts">
import { computed } from "vue"
import { useSettingsStore } from "../store"
import { useI18n } from "vue-i18n"
import { Dices } from "@lucide/vue"
import { AppCard, AppChip, AppField, AppIcon, AppNumberInput, ToggleSwitch } from "@/components/ui"
import SettingDesc from "./SettingDesc.vue"

const { t } = useI18n()
const settings = useSettingsStore()

const homeAdvantageLabel = computed(() => {
  const v = settings.homeAdvantage
  if (v === 0) return t("settings.simulation.homeAdvantage.neutral")
  if (v <= 4) return t("settings.simulation.homeAdvantage.slight")
  if (v <= 8) return t("settings.simulation.homeAdvantage.moderate")
  if (v <= 14) return t("settings.simulation.homeAdvantage.strong")
  return t("settings.simulation.homeAdvantage.dominant")
})

const surpriseFactorLabel = computed(() => {
  const v = settings.surpriseFactor
  if (v === 0) return t("settings.simulation.surpriseFactor.predictable")
  if (v === 100) return t("settings.simulation.surpriseFactor.pureLuck")
  if (v < 40) return t("settings.simulation.surpriseFactor.mostlySkill")
  if (v > 60) return t("settings.simulation.surpriseFactor.upsetHeavy")
  return t("settings.simulation.surpriseFactor.balanced")
})
</script>

<template>
  <AppCard padding="md">
    <template #title>
      <AppIcon :icon="Dices" size="md" />
      {{ t("settings.simulation.title") }}
    </template>

    <AppField layout="split" :label="t('settings.simulation.homeAdvantage.label')">
      <template #description>
        <SettingDesc>
          {{ t("settings.simulation.homeAdvantage.desc", { zero: "0", default: "6", max: "20" }) }}
        </SettingDesc>
      </template>
      <AppChip variant="accent" square>{{ homeAdvantageLabel }}</AppChip>
      <AppNumberInput v-model="settings.homeAdvantage" :min="0" :max="20" editable />
    </AppField>

    <AppField layout="split" :label="t('settings.simulation.surpriseFactor.label')">
      <template #description>
        <SettingDesc>
          {{ t("settings.simulation.surpriseFactor.desc", { zero: "0", max: "100" }) }}
        </SettingDesc>
      </template>
      <AppChip variant="accent" square>{{ surpriseFactorLabel }}</AppChip>
      <AppNumberInput
        v-model="settings.surpriseFactor"
        :min="0"
        :max="100"
        :step="5"
        editable
        value-width="md"
      />
    </AppField>

    <AppField layout="split" :label="t('settings.simulation.formFactor.label')">
      <template #description>
        <SettingDesc>
          {{ t("settings.simulation.formFactor.desc", { plus: "+10", minus: "−10" }) }}
        </SettingDesc>
      </template>
      <ToggleSwitch
        v-model="settings.formFactorEnabled"
        :aria-label="t('settings.simulation.formFactor.label')"
      />
    </AppField>

    <AppField layout="split" :label="t('settings.simulation.usePlayerPower.label')">
      <template #description>
        <SettingDesc>
          {{ t("settings.simulation.usePlayerPower.desc") }}
        </SettingDesc>
      </template>
      <ToggleSwitch
        v-model="settings.usePlayerPower"
        :aria-label="t('settings.simulation.usePlayerPower.label')"
      />
    </AppField>
  </AppCard>
</template>
