<script setup lang="ts">
import { useSettingsStore } from "../store"
import type { Theme } from "../store"

const settings = useSettingsStore()

const themes: { value: Theme; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
]

function clearData() {
  const isConfirm = confirm("Are you sure you want to clear all data? This cannot be undone.")
  if (isConfirm) {
    localStorage.removeItem("teams")
    localStorage.removeItem("tournament")
    location.reload()
  }
}
</script>

<template>
  <div class="page">
    <div class="section-box">
      <h2>Settings</h2>
      <div class="section-body">
        <div class="setting-row">
          <span class="setting-label">Theme</span>
          <div class="seg-ctrl">
            <button
              v-for="t in themes"
              :key="t.value"
              :class="{ active: settings.theme === t.value }"
              @click="settings.theme = t.value"
            >
              {{ t.label }}
            </button>
          </div>
        </div>

        <hr class="divider" />

        <div class="setting-row">
          <span class="setting-label">Data</span>
          <button class="danger" @click="clearData">Clear all data</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.divider {
  border: none;
  border-top: 1px solid var(--border-light);
  margin: 12px 0;
}
.setting-row {
  display: flex;
  align-items: center;
  gap: 16px;
}
.setting-label {
  font-size: 14px;
  min-width: 80px;
}
.seg-ctrl {
  display: inline-flex;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}
.seg-ctrl button {
  border: none;
  border-radius: 0;
  padding: 4px 16px;
  font-size: 13px;
  background: var(--surface);
  color: var(--text);
}
.seg-ctrl button:not(:last-child) {
  border-right: 1px solid var(--border);
}
.seg-ctrl button.active {
  background: var(--accent);
  color: #fff;
}
.seg-ctrl button:hover:not(.active) {
  background: var(--border-light);
}
</style>
