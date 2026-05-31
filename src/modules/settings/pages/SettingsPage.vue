<script setup lang="ts">
import { useRouter } from "vue-router"
import { useSettingsStore } from "../store"
import type { Theme, BracketStyle } from "../store"
import { useTeamsStore } from "../../teams/store"
import { useTournamentStore } from "../../tournament/store"
import { version } from "../../../../package.json"
import BtnGroup from "@/components/BtnGroup.vue"
import { ArrowLeft } from "@lucide/vue"
import { computed } from "vue"
import { showAlert, showConfirm } from "@/composables/useDialog"

const router = useRouter()

const settings = useSettingsStore()
const teamsStore = useTeamsStore()
const tournamentStore = useTournamentStore()

const themes: { value: Theme; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "worldcup2026", label: "⚽ World Cup 2026" },
]

const legOptions = [
  { value: "single", label: "Single" },
  { value: "double", label: "Double" },
]

const bracketStyleOptions: { value: BracketStyle; label: string }[] = [
  { value: "double-sided", label: "Double-Sided" },
  { value: "classic", label: "Classic" },
  { value: "auto", label: "Auto" },
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

const showTeamAbbrVal = computed({
  get: () => (settings.showTeamAbbr ? "show" : "hide"),
  set: (v: string) => {
    settings.showTeamAbbr = v === "show"
  },
})

const confettiOnWinVal = computed({
  get: () => (settings.confettiOnWin ? "on" : "off"),
  set: (v: string) => {
    settings.confettiOnWin = v === "on"
  },
})

const formFactorVal = computed({
  get: () => (settings.formFactorEnabled ? "on" : "off"),
  set: (v: string) => {
    settings.formFactorEnabled = v === "on"
  },
})

async function loadDataset(dataset: Dataset) {
  const ok = await showConfirm(
    `Load "${dataset.label}" dataset? This will replace your teams and clear all tournaments.`,
    { confirmLabel: "Load", dangerous: true }
  )
  if (!ok) return
  localStorage.setItem("teams", JSON.stringify({ teams: dataset.teams }))
  localStorage.setItem("tournament", JSON.stringify({ tournaments: [], active: null }))
  location.reload()
}

async function clearData() {
  const ok = await showConfirm("Are you sure you want to clear all data? This cannot be undone.", {
    confirmLabel: "Clear All",
    dangerous: true,
  })
  if (!ok) return
  DATA_KEYS.forEach((k) => localStorage.removeItem(k))
  location.reload()
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
        showAlert("Invalid backup file.")
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

    <!-- ── Appearance ──────────────────────────────────── -->
    <div class="section-box">
      <h2>Appearance</h2>
      <div class="section-body">
        <div class="setting-row">
          <div class="setting-info">
            <div class="setting-label">Theme</div>
            <div class="setting-desc">Color scheme for the entire app</div>
          </div>
          <BtnGroup v-model="settings.theme" :options="themes" />
        </div>
      </div>
    </div>

    <!-- ── Table Rules ───────────────────────────────── -->
    <div class="section-box">
      <h2>Default Table Rules</h2>
      <div class="section-body">
        <div class="setting-row">
          <div class="setting-info">
            <div class="setting-label">Tiebreaker</div>
            <div class="setting-desc">
              What separates teams level on points — applies to both group stage and league tables.
              <strong>Head-to-head</strong>
              — results between tied teams first ·
              <strong>Goal difference</strong>
              — overall GD first
            </div>
          </div>
          <BtnGroup
            v-model="settings.tiebreaker"
            :options="[
              { value: 'head-to-head', label: 'H2H' },
              { value: 'goal-diff', label: 'Goal diff' },
            ]"
          />
        </div>
      </div>
    </div>

    <!-- ── Match Defaults ─────────────────────────────── -->
    <div class="section-box">
      <h2>Match Defaults</h2>
      <div class="section-body">
        <p class="section-intro">
          Default leg settings applied when creating a new tournament. You can still override these
          per tournament.
        </p>
        <div class="setting-group">
          <div class="setting-row">
            <div class="setting-info">
              <div class="setting-label">Group Stage</div>
              <div class="setting-desc">
                <strong>Single</strong>
                — one match per pair ·
                <strong>Double</strong>
                — home &amp; away, aggregate score
              </div>
            </div>
            <BtnGroup v-model="settings.groupLegMode" :options="legOptions" />
          </div>
          <div class="setting-row">
            <div class="setting-info">
              <div class="setting-label">Knockout Rounds</div>
              <div class="setting-desc">
                <strong>Single</strong>
                — winner advances ·
                <strong>Double</strong>
                — 2-legged tie, aggregate decides
              </div>
            </div>
            <BtnGroup v-model="settings.knockoutLegMode" :options="legOptions" />
          </div>
          <div class="setting-row">
            <div class="setting-info">
              <div class="setting-label">Final</div>
              <div class="setting-desc">Can be set separately from other knockout rounds</div>
            </div>
            <BtnGroup v-model="settings.finalLegMode" :options="legOptions" />
          </div>
        </div>
      </div>
    </div>

    <!-- ── New Tournament Defaults ────────────────────── -->
    <div class="section-box">
      <h2>New Tournament Defaults</h2>
      <div class="section-body">
        <p class="section-intro">
          Pre-filled values shown in the Create Tournament dialog. Change them there any time.
        </p>
        <div class="setting-group">
          <div class="setting-row">
            <div class="setting-info">
              <div class="setting-label">Knockout Draw</div>
              <div class="setting-desc">How teams are placed into a Knockout-only bracket</div>
            </div>
            <BtnGroup
              v-model="settings.newSeasonDrawType"
              :options="[
                { value: 'random', label: 'Random' },
                { value: 'seeded', label: 'Seeded' },
                { value: 'manual', label: 'Manual' },
              ]"
            />
          </div>
          <div class="setting-row">
            <div class="setting-info">
              <div class="setting-label">Group Stage Draw</div>
              <div class="setting-desc">How teams are distributed into groups</div>
            </div>
            <BtnGroup
              v-model="settings.newSeasonGroupDrawType"
              :options="[
                { value: 'random', label: 'Random' },
                { value: 'seeded', label: 'Seeded' },
                { value: 'manual', label: 'Manual' },
              ]"
            />
          </div>
          <div class="setting-row">
            <div class="setting-info">
              <div class="setting-label">Playoff Seeding</div>
              <div class="setting-desc">
                How group qualifiers are matched up when the knockout bracket is drawn
              </div>
            </div>
            <BtnGroup
              v-model="settings.newSeasonPlayoffSeedMode"
              :options="[
                { value: 'cross', label: 'Cross' },
                { value: 'no-same-group', label: 'No rematch' },
                { value: 'random', label: 'Random' },
              ]"
            />
          </div>
        </div>
        <div class="draw-legend">
          <div class="draw-legend-row">
            <strong>Draw options:</strong>
            Random — by chance &nbsp;·&nbsp; Seeded — best teams separated &nbsp;·&nbsp; Manual —
            you place teams
          </div>
          <div class="draw-legend-row">
            <strong>Playoff seeding:</strong>
            Cross — A1 vs B2, B1 vs A2 &nbsp;·&nbsp; No rematch — avoids same-group opponents in
            Round 1 &nbsp;·&nbsp; Random — fully random
          </div>
        </div>
      </div>
    </div>

    <!-- ── Display ────────────────────────────────────── -->
    <div class="section-box">
      <h2>Display</h2>
      <div class="section-body">
        <div class="setting-row">
          <div class="setting-info">
            <div class="setting-label">Team Abbreviations</div>
            <div class="setting-desc">
              Short code (e.g.
              <strong>BRA</strong>
              ) shown in bracket slots and tight layouts
            </div>
          </div>
          <BtnGroup
            v-model="showTeamAbbrVal"
            :options="[
              { value: 'show', label: 'Show' },
              { value: 'hide', label: 'Hide' },
            ]"
          />
        </div>
        <div class="setting-row">
          <div class="setting-info">
            <div class="setting-label">Bracket Style</div>
            <div class="setting-desc">
              <strong>Double-Sided</strong>
              — teams on both sides of the bracket ·
              <strong>Classic</strong>
              — single left-to-right bracket ·
              <strong>Auto</strong>
              — Double-Sided for 17+ knockout teams, Classic otherwise
            </div>
          </div>
          <BtnGroup v-model="settings.bracketStyle" :options="bracketStyleOptions" />
        </div>
        <div class="setting-row">
          <div class="setting-info">
            <div class="setting-label">Champion Confetti</div>
            <div class="setting-desc">
              Fire confetti in the winner's color when a tournament ends
            </div>
          </div>
          <BtnGroup
            v-model="confettiOnWinVal"
            :options="[
              { value: 'on', label: 'On' },
              { value: 'off', label: 'Off' },
            ]"
          />
        </div>
      </div>
    </div>

    <!-- ── Simulation ─────────────────────────────────── -->
    <div class="section-box">
      <h2>Simulation</h2>
      <div class="section-body">
        <div class="setting-row">
          <div class="setting-info">
            <div class="setting-label">Home Advantage</div>
            <div class="setting-desc">
              Power bonus given to the home team.
              <strong>0</strong>
              = no advantage ·
              <strong>6</strong>
              = default ·
              <strong>20</strong>
              = very strong home edge.
            </div>
          </div>
          <div class="surprise-control">
            <button
              class="stepper-btn"
              :disabled="settings.homeAdvantage <= 0"
              @click="settings.homeAdvantage = Math.max(0, settings.homeAdvantage - 1)"
            >
              −
            </button>
            <input
              v-model.number="settings.homeAdvantage"
              type="number"
              min="0"
              max="20"
              step="1"
              class="surprise-value"
              @change="settings.homeAdvantage = Math.max(0, Math.min(20, settings.homeAdvantage))"
            />
            <button
              class="stepper-btn"
              :disabled="settings.homeAdvantage >= 20"
              @click="settings.homeAdvantage = Math.min(20, settings.homeAdvantage + 1)"
            >
              +
            </button>
            <span class="surprise-badge">
              {{
                settings.homeAdvantage === 0
                  ? "Neutral"
                  : settings.homeAdvantage <= 4
                    ? "Slight"
                    : settings.homeAdvantage <= 8
                      ? "Moderate"
                      : settings.homeAdvantage <= 14
                        ? "Strong"
                        : "Dominant"
              }}
            </span>
          </div>
        </div>
        <div class="setting-row">
          <div class="setting-info">
            <div class="setting-label">Surprise Factor</div>
            <div class="setting-desc">
              How much weaker teams can upset stronger ones.
              <strong>0</strong>
              = power fully decides ·
              <strong>100</strong>
              = pure chance.
            </div>
          </div>
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
            <span class="surprise-badge">
              {{
                settings.surpriseFactor === 0
                  ? "Predictable"
                  : settings.surpriseFactor === 100
                    ? "Pure luck"
                    : settings.surpriseFactor < 40
                      ? "Mostly skill"
                      : settings.surpriseFactor > 60
                        ? "Upset-heavy"
                        : "Balanced"
              }}
            </span>
          </div>
        </div>
        <div class="setting-row">
          <div class="setting-info">
            <div class="setting-label">Form Factor</div>
            <div class="setting-desc">
              Dynamically adjusts team strength based on last 5 match results. A team on a winning
              streak gains up to
              <strong>+10</strong>
              power, a team losing consistently drops up to
              <strong>−10</strong>
              .
            </div>
          </div>
          <BtnGroup
            v-model="formFactorVal"
            :options="[
              { value: 'on', label: 'On' },
              { value: 'off', label: 'Off' },
            ]"
          />
        </div>
      </div>
    </div>

    <!-- ── Sample Data ────────────────────────────────── -->
    <div class="section-box">
      <h2>Sample Data</h2>
      <div class="section-body">
        <p class="section-intro">
          Load a preset team list. This will replace your current teams and clear all tournaments.
        </p>
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
    </div>

    <!-- ── Data Management ────────────────────────────── -->
    <div class="section-box">
      <h2>Data Management</h2>
      <div class="section-body">
        <div class="setting-row">
          <div class="setting-info">
            <div class="setting-label">Backup</div>
            <div class="setting-desc">
              Save all your teams and tournaments to a file, or restore from one
            </div>
          </div>
          <div class="btn-row">
            <button @click="exportData">Export</button>
            <button @click="importData">Import</button>
          </div>
        </div>
        <div class="danger-setting-row">
          <div class="setting-info">
            <div class="setting-label danger-label">Clear All Data</div>
            <div class="setting-desc">
              Permanently delete all teams and tournaments — cannot be undone
            </div>
          </div>
          <button class="danger" @click="clearData">Clear All</button>
        </div>
      </div>
    </div>

    <!-- ── Reset Settings ───────────────────────────── -->
    <div class="section-box">
      <h2>Reset Settings</h2>
      <div class="section-body">
        <div class="danger-setting-row" style="margin-top: 0; padding-top: 0; border-top: none">
          <div class="setting-info">
            <div class="setting-label">Reset to Defaults</div>
            <div class="setting-desc">
              Restore all settings to their original values. Teams and tournaments are not affected.
            </div>
          </div>
          <button @click="settings.resetAll()">Reset</button>
        </div>
      </div>
    </div>

    <div class="version-row">
      <span class="version">v{{ version }}</span>
      <a
        class="changelog-btn"
        href="https://github.com/orazchollaev/tournament-sim/blob/main/CHANGELOG.md"
        target="_blank"
        rel="noopener"
      >
        Changelog
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

/* Section intro text */
.section-intro {
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 12px;
  line-height: 1.5;
}

/* Setting rows */
.setting-group {
  display: flex;
  flex-direction: column;
}

.setting-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 10px;
}

.setting-row:last-child {
  margin-bottom: 0;
}

.setting-info {
  flex: 1;
  min-width: 0;
}

.setting-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  line-height: 1.4;
}

.setting-desc {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 2px;
  line-height: 1.4;
}

/* Draw legend */
.draw-legend {
  margin-top: 12px;
  padding: 8px 10px;
  background: var(--bg);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.draw-legend-row {
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.5;
}

/* Surprise control */
.surprise-control {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
.surprise-badge {
  font-size: 11px;
  font-weight: 600;
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 12%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
  padding: 2px 8px;
  border-radius: 10px;
  white-space: nowrap;
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

/* Datasets */
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

/* Data management */
.btn-row {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}
.danger-setting-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid color-mix(in srgb, var(--danger) 20%, transparent);
}
.danger-label {
  color: var(--danger);
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

@media (max-width: 600px) {
  .setting-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  .btn-row {
    flex-wrap: wrap;
  }
  .danger-setting-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}
</style>
