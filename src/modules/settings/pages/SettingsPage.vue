<script setup lang="ts">
import { useRouter } from "vue-router"
import { useSettingsStore } from "../store"
import type { Theme } from "../store"
import { useTeamsStore } from "../../teams/store"
import { useTournamentStore } from "../../tournament/store"
import { version } from "../../../../package.json"
import BtnGroup from "@/components/BtnGroup.vue"
import { ArrowLeft } from "lucide-vue-next"

const router = useRouter()

const settings = useSettingsStore()
const teamsStore = useTeamsStore()
const tournamentStore = useTournamentStore()

const themes: { value: Theme; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
]

const legOptions = [
  { value: "single", label: "Single" },
  { value: "double", label: "Double" },
]

const DATA_KEYS = ["teams", "tournament"] as const

interface Dataset {
  label: string
  description: string
  teams: { id: string; name: string; color: string; power: number }[]
}

const globbed = import.meta.glob<Dataset>("../../../examples/*.json", {
  eager: true,
  import: "default",
})
const SAMPLE_DATASETS = Object.values(globbed)

function loadDataset(dataset: Dataset) {
  const isConfirm = confirm(
    `Load "${dataset.label}" dataset? This will replace your teams and clear all tournaments.`
  )
  if (!isConfirm) return
  localStorage.setItem("teams", JSON.stringify({ teams: dataset.teams }))
  localStorage.setItem("tournament", JSON.stringify({ tournaments: [], active: null }))
  location.reload()
}

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
    <div class="page-header">
      <button class="back-btn" @click="router.back()">
        <ArrowLeft :size="14" />
        Back
      </button>
      <h2>Settings</h2>
    </div>
    <div class="section-box">
      <div class="section-body">
        <div class="setting-row">
          <span class="setting-label">Theme</span>
          <BtnGroup v-model="settings.theme" :options="themes" />
        </div>

        <hr class="divider" />

        <div class="setting-section-title">Match defaults</div>

        <div class="setting-group">
          <div class="setting-row">
            <span class="setting-label">Group stage</span>
            <BtnGroup v-model="settings.groupLegMode" :options="legOptions" />
          </div>
          <div class="setting-row">
            <span class="setting-label">Knockout</span>
            <BtnGroup v-model="settings.knockoutLegMode" :options="legOptions" />
          </div>
          <div class="setting-row">
            <span class="setting-label">Final</span>
            <BtnGroup v-model="settings.finalLegMode" :options="legOptions" />
          </div>
        </div>

        <hr class="divider" />

        <div class="setting-section-title">Display</div>

        <div class="setting-row">
          <span class="setting-label">Team abbreviations</span>
          <BtnGroup
            v-model="settings.showTeamAbbr"
            :options="[
              { value: true, label: 'Show' },
              { value: false, label: 'Hide' },
            ]"
          />
        </div>

        <hr class="divider" />

        <div class="setting-section-title">Simulation</div>

        <div class="setting-row">
          <span class="setting-label">Surprise factor</span>
          <div class="surprise-control">
            <button
              class="stepper-btn"
              :disabled="settings.surpriseFactor <= 0"
              @click="settings.surpriseFactor = Math.max(0, settings.surpriseFactor - 5)"
            >
              −
            </button>
            <input
              v-model.number="settings.surpriseFactor"
              type="number"
              min="0"
              max="100"
              step="5"
              class="surprise-value"
              @change="
                settings.surpriseFactor = Math.max(0, Math.min(100, settings.surpriseFactor))
              "
            />
            <button
              class="stepper-btn"
              :disabled="settings.surpriseFactor >= 100"
              @click="settings.surpriseFactor = Math.min(100, settings.surpriseFactor + 5)"
            >
              +
            </button>
            <span class="surprise-desc">
              {{
                settings.surpriseFactor === 0
                  ? "Power fully determines results"
                  : settings.surpriseFactor === 100
                    ? "Completely random results"
                    : settings.surpriseFactor < 40
                      ? "Stronger teams usually win"
                      : settings.surpriseFactor > 60
                        ? "Upsets happen often"
                        : "Balanced"
              }}
            </span>
          </div>
        </div>

        <hr class="divider" />

        <div class="setting-row">
          <span class="setting-label">Sample data</span>
          <div class="dataset-list">
            <button
              v-for="ds in SAMPLE_DATASETS"
              :key="ds.label"
              class="dataset-btn"
              @click="loadDataset(ds)"
            >
              <span class="dataset-name">{{ ds.label }}</span>
              <span class="dataset-desc">{{ ds.description }}</span>
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
.page-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
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
.setting-section-title {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 4px;
}

.setting-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.surprise-control {
  display: flex;
  align-items: center;
  gap: 6px;
}
.surprise-desc {
  font-size: 11px;
  color: var(--text-muted);
  margin-left: 4px;
}
.stepper-btn {
  width: 28px;
  height: 28px;
  padding: 0;
  font-size: 16px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.surprise-value {
  font-size: 13px;
  font-weight: 600;
  color: var(--accent);
  width: 44px;
  text-align: center;
  padding: 0 4px;
  -moz-appearance: textfield;
}
.surprise-value::-webkit-outer-spin-button,
.surprise-value::-webkit-inner-spin-button {
  -webkit-appearance: none;
}

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
.btn-group {
  display: flex;
  gap: 8px;
}
.dataset-list {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.dataset-btn {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 8px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--text);
  cursor: pointer;
  transition:
    border-color 0.15s,
    background 0.15s;
}
.dataset-btn:hover {
  border-color: var(--accent);
  background: var(--border-light);
}
.dataset-name {
  font-size: 13px;
  font-weight: 600;
}
.dataset-desc {
  font-size: 11px;
  color: var(--text-muted);
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
