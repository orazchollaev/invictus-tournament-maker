<script setup lang="ts">
import { useSettingsStore } from "../store"
import { useI18n } from "vue-i18n"
import { ListOrdered } from "@lucide/vue"
import BtnGroup from "@/components/BtnGroup.vue"
import SettingDesc from "./SettingDesc.vue"

const { t } = useI18n()
const settings = useSettingsStore()
</script>

<template>
  <div class="section-box">
    <h2>
      <ListOrdered :size="15" class="section-icon" />
      {{ t("settings.tableRules.title") }}
    </h2>
    <div class="section-body">
      <div class="setting-row">
        <div class="setting-info">
          <div class="setting-label">{{ t("settings.tableRules.tiebreaker.label") }}</div>
          <SettingDesc>
            {{ t("settings.tableRules.tiebreaker.h2h") }} —
            {{ t("settings.tableRules.tiebreaker.h2h") }} first ·
            {{ t("settings.tableRules.tiebreaker.goalDiff") }} — overall GD first
          </SettingDesc>
        </div>
        <BtnGroup
          v-model="settings.tiebreaker"
          :options="[
            { value: 'head-to-head', label: t('settings.tableRules.tiebreaker.h2hShort') },
            { value: 'goal-diff', label: t('settings.tableRules.tiebreaker.goalDiffShort') },
          ]"
        />
      </div>
    </div>
  </div>
</template>
