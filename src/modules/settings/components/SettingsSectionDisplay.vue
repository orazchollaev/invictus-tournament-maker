<script setup lang="ts">
import { computed } from "vue"
import { useSettingsStore } from "../store"
import type { BracketStyle } from "../store"
import { useI18n } from "vue-i18n"
import { Monitor } from "@lucide/vue"
import { AppCard, AppField, AppIcon, AppButtonGroup, AppToggle } from "@/components/ui"
import SettingDesc from "./SettingDesc.vue"
import type { MatchEventType } from "@/modules/tournament/types"

const { t } = useI18n()
const settings = useSettingsStore()

const bracketStyleOptions = computed<{ value: BracketStyle; label: string }[]>(() => [
  { value: "double-sided", label: t("settings.display.bracketStyle.doubleSided") },
  { value: "classic", label: t("settings.display.bracketStyle.classic") },
  { value: "auto", label: t("settings.display.bracketStyle.auto") },
])

const liveEventTypes: MatchEventType[] = ["goal", "penGoal", "ownGoal", "penMiss", "yellow", "red"]
</script>

<template>
  <AppCard padding="md">
    <template #title>
      <AppIcon :icon="Monitor" size="md" />
      {{ t("settings.display.title") }}
    </template>

    <AppField layout="split" :label="t('settings.display.teamAbbr.label')">
      <template #description>
        <SettingDesc>{{ t("settings.display.teamAbbr.desc", { example: "BRA" }) }}</SettingDesc>
      </template>
      <AppToggle
        v-model="settings.showTeamAbbr"
        :aria-label="t('settings.display.teamAbbr.label')"
      />
    </AppField>

    <AppField layout="split" :label="t('settings.display.bracketStyle.label')">
      <template #description>
        <SettingDesc>
          <strong>{{ t("settings.display.bracketStyle.doubleSided") }}</strong>
          — teams on both sides ·
          <strong>{{ t("settings.display.bracketStyle.classic") }}</strong>
          — single left-to-right ·
          <strong>{{ t("settings.display.bracketStyle.auto") }}</strong>
          — Double-Sided for 17+ teams
        </SettingDesc>
      </template>
      <AppButtonGroup v-model="settings.bracketStyle" :options="bracketStyleOptions" />
    </AppField>

    <AppField layout="split" :label="t('settings.display.bracketHover.label')">
      <template #description>
        <SettingDesc>{{ t("settings.display.bracketHover.desc") }}</SettingDesc>
      </template>
      <AppToggle
        v-model="settings.bracketHighlightOnHover"
        :aria-label="t('settings.display.bracketHover.label')"
      />
    </AppField>

    <AppField layout="split" :label="t('settings.display.bracketConnectorColors.label')">
      <template #description>
        <SettingDesc>{{ t("settings.display.bracketConnectorColors.desc") }}</SettingDesc>
      </template>
      <AppToggle
        v-model="settings.bracketConnectorColors"
        :aria-label="t('settings.display.bracketConnectorColors.label')"
      />
    </AppField>

    <AppField layout="split" :label="t('settings.display.gradualReveal.label')">
      <template #description>
        <SettingDesc>{{ t("settings.display.gradualReveal.desc") }}</SettingDesc>
      </template>
      <AppToggle
        v-model="settings.gradualReveal"
        :aria-label="t('settings.display.gradualReveal.label')"
      />
    </AppField>

    <AppField layout="split" :label="t('settings.display.liveEvents.label')">
      <template #description>
        <SettingDesc>{{ t("settings.display.liveEvents.desc") }}</SettingDesc>
      </template>
      <div class="live-event-toggles">
        <label v-for="type in liveEventTypes" :key="type" class="live-event-toggle">
          <AppToggle
            v-model="settings.liveEventFilter[type]"
            :aria-label="t(`matchStats.events.${type}`)"
          />
          {{ t(`matchStats.events.${type}`) }}
        </label>
      </div>
    </AppField>
  </AppCard>
</template>

<style scoped>
.live-event-toggles {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  align-items: flex-end;
}

.live-event-toggle {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  font-size: var(--fs-sm);
  color: var(--text);
  cursor: pointer;
}
</style>
