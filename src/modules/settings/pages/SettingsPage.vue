<script setup lang="ts">
import { useSettingsStore } from "../store"
import type { Theme } from "../store"
import { useTeamsStore } from "../../teams/store"
import { useTournamentStore } from "../../tournament/store"
import { version } from "../../../../package.json"

const settings = useSettingsStore()
const teamsStore = useTeamsStore()
const tournamentStore = useTournamentStore()

const themes: { value: Theme; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
]

const DATA_KEYS = ["teams", "tournament"] as const

function clearData() {
  const isConfirm = confirm("Are you sure you want to clear all data? This cannot be undone.")
  if (isConfirm) {
    DATA_KEYS.forEach((k) => localStorage.removeItem(k))
    location.reload()
  }
}

function exportData() {
  const payload = {
    teams: { teams: teamsStore.teams },
    tournament: { tournaments: tournamentStore.tournaments, active: tournamentStore.active },
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `tournament-sim-v${version}-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function importData() {
  const input = document.createElement("input")
  input.type = "file"
  input.accept = ".json,application/json"
  input.onchange = () => {
    const file = input.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string)
        if (typeof parsed !== "object" || parsed === null) throw new Error()
        DATA_KEYS.forEach((k) => {
          if (k in parsed) localStorage.setItem(k, JSON.stringify(parsed[k]))
        })
        location.reload()
      } catch {
        alert("Invalid backup file.")
      }
    }
    reader.readAsText(file)
  }
  input.click()
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
          <div class="btn-group">
            <button @click="exportData">Export</button>
            <button @click="importData">Import</button>
            <button class="danger" @click="clearData">Clear all data</button>
          </div>
        </div>
      </div>
    </div>

    <p class="version">v{{ version }}</p>
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
.btn-group {
  display: flex;
  gap: 8px;
}
.version {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 8px;
}

@media (max-width: 600px) {
  .setting-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  .btn-group {
    flex-wrap: wrap;
  }
}
</style>
