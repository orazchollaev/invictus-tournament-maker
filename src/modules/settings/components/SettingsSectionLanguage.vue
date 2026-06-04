<script setup lang="ts">
import { useSettingsStore } from "../store"
import { useI18n } from "vue-i18n"
import { LOCALES } from "@/i18n"

const { t } = useI18n()
const settings = useSettingsStore()
</script>

<template>
  <div class="section-box">
    <h2>{{ t("settings.language.label") }}</h2>
    <div class="section-body">
      <div class="setting-row">
        <div class="setting-info">
          <div class="setting-label">{{ t("settings.language.label") }}</div>
          <div class="setting-desc">{{ t("settings.language.desc") }}</div>
        </div>
        <div class="lang-picker">
          <button
            v-for="loc in LOCALES"
            :key="loc.value"
            class="lang-btn"
            :class="{ 'lang-btn--active': settings.locale === loc.value }"
            @click="settings.locale = loc.value"
          >
            <img :src="`/flags/${loc.flag}`" :alt="loc.label" class="lang-flag" />
            <span class="lang-name">{{ loc.label }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lang-picker {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  flex-shrink: 0;
}
.lang-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.12s;
  white-space: nowrap;
}
.lang-btn:hover {
  border-color: var(--accent);
  color: var(--text);
  background: var(--bg);
}
.lang-btn--active {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  color: var(--accent);
  font-weight: 600;
}
.lang-flag {
  width: 18px;
  height: auto;
}
.lang-name {
  line-height: 1;
}
</style>
