<script setup lang="ts">
import { computed } from "vue"
import { useSettingsStore } from "../store"
import { useI18n } from "vue-i18n"
import { Swords } from "@lucide/vue"
import { AppCard, AppField, AppIcon, BtnGroup } from "@/components/ui"
import SettingDesc from "./SettingDesc.vue"

const { t } = useI18n()
const settings = useSettingsStore()

const legOptions = computed(() => [
  { value: "single", label: t("common.single") },
  { value: "double", label: t("common.double") },
])

/**
 * The `single`/`double` descriptions ship as one "… · …" string per key.
 * Split them here rather than inline in the template, where the same
 * split/trim/replace chain was written out four times.
 */
function legDesc(key: string) {
  const parts = t(key, { single: "", double: "" }).split("·")
  const clean = (s?: string) => s?.trim().replace(/^—?\s*/, "") ?? ""
  return { single: clean(parts[0]), double: clean(parts[1]) }
}

const groupStageDesc = computed(() => legDesc("settings.matchDefaults.groupStage.desc"))
const knockoutDesc = computed(() => legDesc("settings.matchDefaults.knockoutRounds.desc"))
</script>

<template>
  <AppCard padding="md">
    <template #title>
      <AppIcon :icon="Swords" size="md" />
      {{ t("settings.matchDefaults.title") }}
    </template>

    <p class="section-intro">{{ t("settings.matchDefaults.intro") }}</p>

    <AppField layout="split" :label="t('settings.matchDefaults.groupStage.label')">
      <template #description>
        <SettingDesc>
          <strong>{{ t("common.single") }}</strong>
          — {{ groupStageDesc.single }} ·
          <strong>{{ t("common.double") }}</strong>
          — {{ groupStageDesc.double }}
        </SettingDesc>
      </template>
      <BtnGroup v-model="settings.groupLegMode" :options="legOptions" />
    </AppField>

    <AppField layout="split" :label="t('settings.matchDefaults.knockoutRounds.label')">
      <template #description>
        <SettingDesc>
          <strong>{{ t("common.single") }}</strong>
          — {{ knockoutDesc.single }} ·
          <strong>{{ t("common.double") }}</strong>
          — {{ knockoutDesc.double }}
        </SettingDesc>
      </template>
      <BtnGroup v-model="settings.knockoutLegMode" :options="legOptions" />
    </AppField>

    <AppField layout="split" :label="t('settings.matchDefaults.final.label')">
      <template #description>
        <SettingDesc>{{ t("settings.matchDefaults.final.desc") }}</SettingDesc>
      </template>
      <BtnGroup v-model="settings.finalLegMode" :options="legOptions" />
    </AppField>
  </AppCard>
</template>
