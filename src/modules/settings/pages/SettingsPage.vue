<script setup lang="ts">
import { useRouter } from "vue-router"
import { version } from "../../../../package.json"
import { ArrowLeft } from "@lucide/vue"
import { useI18n } from "vue-i18n"
import SettingsSectionLanguage from "../components/SettingsSectionLanguage.vue"
import SettingsSectionAppearance from "../components/SettingsSectionAppearance.vue"
import SettingsSectionTableRules from "../components/SettingsSectionTableRules.vue"
import SettingsSectionMatchDefaults from "../components/SettingsSectionMatchDefaults.vue"
import SettingsSectionNewTournament from "../components/SettingsSectionNewTournament.vue"
import SettingsSectionGraphics from "../components/SettingsSectionGraphics.vue"
import SettingsSectionDisplay from "../components/SettingsSectionDisplay.vue"
import SettingsSectionSimulation from "../components/SettingsSectionSimulation.vue"
import SettingsSectionSampleData from "../components/SettingsSectionSampleData.vue"
import SettingsSectionDataManagement from "../components/SettingsSectionDataManagement.vue"

const { t } = useI18n()
const router = useRouter()
</script>

<template>
  <div class="page">
    <div class="page-header">
      <button class="back-btn" @click="router.back()">
        <ArrowLeft :size="14" />
        {{ t("common.back") }}
      </button>
      <h2>{{ t("settings.title") }}</h2>
    </div>

    <SettingsSectionLanguage />
    <SettingsSectionAppearance />
    <SettingsSectionTableRules />
    <SettingsSectionMatchDefaults />
    <SettingsSectionNewTournament />
    <SettingsSectionGraphics />
    <SettingsSectionDisplay />
    <SettingsSectionSimulation />
    <SettingsSectionSampleData />
    <SettingsSectionDataManagement />

    <div class="version-row">
      <span class="version">v{{ version }}</span>
      <a
        class="changelog-btn"
        href="https://github.com/orazchollaev/invictus-tournament-maker/blob/main/CHANGELOG.md"
        target="_blank"
        rel="noopener"
      >
        {{ t("settings.changelog") }}
      </a>
    </div>
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
.page-header h2 {
  margin: 0;
}
.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: none;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 4px 12px;
  font-size: 13px;
  color: var(--text-muted);
  cursor: pointer;
}
.back-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}
.version-row {
  display: flex;
  align-items: center;
  gap: 8.1px;
  margin-top: 8px;
}
.version {
  font-size: 12px;
  color: var(--text-muted);
}
.changelog-btn {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 2px;
  border: 1px solid var(--border-light);
  color: var(--text-muted);
  text-decoration: none;
  transition: all 0.15s;
}
.changelog-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}
</style>
