<script setup lang="ts">
import { computed } from "vue"
import { useSettingsStore } from "../store"
import { useI18n } from "vue-i18n"
import { ListOrdered } from "@lucide/vue"
import { AppCard, AppField, AppIcon, BtnGroup } from "@/components/ui"
import SettingDesc from "./SettingDesc.vue"

const { t } = useI18n()
const settings = useSettingsStore()

const tiebreakerOptions = computed(() => [
  { value: "head-to-head", label: t("settings.tableRules.tiebreaker.h2hShort") },
  { value: "goal-diff", label: t("settings.tableRules.tiebreaker.goalDiffShort") },
])
</script>

<template>
  <AppCard padding="md">
    <template #title>
      <AppIcon :icon="ListOrdered" size="md" />
      {{ t("settings.tableRules.title") }}
    </template>

    <AppField layout="split" :label="t('settings.tableRules.tiebreaker.label')">
      <template #description>
        <SettingDesc>
          {{ t("settings.tableRules.tiebreaker.h2h") }} —
          {{ t("settings.tableRules.tiebreaker.h2h") }} first ·
          {{ t("settings.tableRules.tiebreaker.goalDiff") }} — overall GD first
        </SettingDesc>
      </template>
      <BtnGroup v-model="settings.tiebreaker" :options="tiebreakerOptions" />
    </AppField>
  </AppCard>
</template>
