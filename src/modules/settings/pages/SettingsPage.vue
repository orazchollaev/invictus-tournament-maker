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
import { useI18n } from "vue-i18n"
import { LOCALES } from "@/i18n"

const { t } = useI18n()
const router = useRouter()

const settings = useSettingsStore()
const teamsStore = useTeamsStore()
const tournamentStore = useTournamentStore()

const themes = computed<{ value: Theme; label: string }[]>(() => [
  { value: "light", label: t("settings.appearance.theme.light") },
  { value: "dark", label: t("settings.appearance.theme.dark") },
  { value: "worldcup2026", label: t("settings.appearance.theme.worldcup2026") },
])

const legOptions = computed(() => [
  { value: "single", label: t("common.single") },
  { value: "double", label: t("common.double") },
])

const bracketQualityOptions = computed(() => [
  { value: "high", label: t("settings.graphics.bracketQuality.high") },
  { value: "low", label: t("settings.graphics.bracketQuality.low") },
])

const bracketStyleOptions = computed<{ value: BracketStyle; label: string }[]>(() => [
  { value: "double-sided", label: t("settings.display.bracketStyle.doubleSided") },
  { value: "classic", label: t("settings.display.bracketStyle.classic") },
  { value: "auto", label: t("settings.display.bracketStyle.auto") },
])

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

const soundOnWinVal = computed({
  get: () => (settings.soundOnWin ? "on" : "off"),
  set: (v: string) => {
    settings.soundOnWin = v === "on"
  },
})

const formFactorVal = computed({
  get: () => (settings.formFactorEnabled ? "on" : "off"),
  set: (v: string) => {
    settings.formFactorEnabled = v === "on"
  },
})

const onOffOptions = computed(() => [
  { value: "on", label: t("common.on") },
  { value: "off", label: t("common.off") },
])

const showHideOptions = computed(() => [
  { value: "show", label: t("common.show") },
  { value: "hide", label: t("common.hide") },
])

const homeAdvantageLabel = computed(() => {
  const v = settings.homeAdvantage
  if (v === 0) return t("settings.simulation.homeAdvantage.neutral")
  if (v <= 4) return t("settings.simulation.homeAdvantage.slight")
  if (v <= 8) return t("settings.simulation.homeAdvantage.moderate")
  if (v <= 14) return t("settings.simulation.homeAdvantage.strong")
  return t("settings.simulation.homeAdvantage.dominant")
})

const surpriseFactorLabel = computed(() => {
  const v = settings.surpriseFactor
  if (v === 0) return t("settings.simulation.surpriseFactor.predictable")
  if (v === 100) return t("settings.simulation.surpriseFactor.pureLuck")
  if (v < 40) return t("settings.simulation.surpriseFactor.mostlySkill")
  if (v > 60) return t("settings.simulation.surpriseFactor.upsetHeavy")
  return t("settings.simulation.surpriseFactor.balanced")
})

async function loadDataset(dataset: Dataset) {
  const ok = await showConfirm(t("settings.sampleData.loadConfirm", { name: dataset.label }), {
    confirmLabel: t("settings.sampleData.loadLabel"),
    dangerous: true,
  })
  if (!ok) return
  localStorage.setItem("teams", JSON.stringify({ teams: dataset.teams }))
  localStorage.setItem("tournament", JSON.stringify({ tournaments: [], active: null }))
  location.reload()
}

async function clearData() {
  const ok = await showConfirm(t("settings.dataManagement.clearAll.confirmMsg"), {
    confirmLabel: t("settings.dataManagement.clearAll.confirmLabel"),
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
  a.download = `invictus-v${version}-${new Date().toISOString().slice(0, 10)}.json`
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
        showAlert(t("settings.dataManagement.invalidFile"))
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
        {{ t("common.back") }}
      </button>
      <h2>{{ t("settings.title") }}</h2>
    </div>

    <!-- ── Language ───────────────────────────────────── -->
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

    <!-- ── Appearance ──────────────────────────────────── -->
    <div class="section-box">
      <h2>{{ t("settings.appearance.title") }}</h2>
      <div class="section-body">
        <div class="setting-row">
          <div class="setting-info">
            <div class="setting-label">{{ t("settings.appearance.theme.label") }}</div>
            <div class="setting-desc">{{ t("settings.appearance.theme.desc") }}</div>
          </div>
          <BtnGroup v-model="settings.theme" :options="themes" />
        </div>
      </div>
    </div>

    <!-- ── Table Rules ───────────────────────────────── -->
    <div class="section-box">
      <h2>{{ t("settings.tableRules.title") }}</h2>
      <div class="section-body">
        <div class="setting-row">
          <div class="setting-info">
            <div class="setting-label">{{ t("settings.tableRules.tiebreaker.label") }}</div>
            <div class="setting-desc">
              {{ t("settings.tableRules.tiebreaker.h2h") }} —
              {{ t("settings.tableRules.tiebreaker.h2h") }} first ·
              {{ t("settings.tableRules.tiebreaker.goalDiff") }} — overall GD first
            </div>
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

    <!-- ── Match Defaults ─────────────────────────────── -->
    <div class="section-box">
      <h2>{{ t("settings.matchDefaults.title") }}</h2>
      <div class="section-body">
        <p class="section-intro">{{ t("settings.matchDefaults.intro") }}</p>
        <div class="setting-group">
          <div class="setting-row">
            <div class="setting-info">
              <div class="setting-label">{{ t("settings.matchDefaults.groupStage.label") }}</div>
              <div class="setting-desc">
                <strong>{{ t("common.single") }}</strong>
                —
                {{
                  t("settings.matchDefaults.groupStage.desc", { single: "", double: "" })
                    .split("·")[0]
                    .trim()
                    .replace(/^—?\s*/, "")
                }}
                ·
                <strong>{{ t("common.double") }}</strong>
                —
                {{
                  t("settings.matchDefaults.groupStage.desc", { single: "", double: "" })
                    .split("·")[1]
                    ?.trim()
                    .replace(/^—?\s*/, "")
                }}
              </div>
            </div>
            <BtnGroup v-model="settings.groupLegMode" :options="legOptions" />
          </div>
          <div class="setting-row">
            <div class="setting-info">
              <div class="setting-label">
                {{ t("settings.matchDefaults.knockoutRounds.label") }}
              </div>
              <div class="setting-desc">
                <strong>{{ t("common.single") }}</strong>
                —
                {{
                  t("settings.matchDefaults.knockoutRounds.desc", { single: "", double: "" })
                    .split("·")[0]
                    .trim()
                    .replace(/^—?\s*/, "")
                }}
                ·
                <strong>{{ t("common.double") }}</strong>
                —
                {{
                  t("settings.matchDefaults.knockoutRounds.desc", { single: "", double: "" })
                    .split("·")[1]
                    ?.trim()
                    .replace(/^—?\s*/, "")
                }}
              </div>
            </div>
            <BtnGroup v-model="settings.knockoutLegMode" :options="legOptions" />
          </div>
          <div class="setting-row">
            <div class="setting-info">
              <div class="setting-label">{{ t("settings.matchDefaults.final.label") }}</div>
              <div class="setting-desc">{{ t("settings.matchDefaults.final.desc") }}</div>
            </div>
            <BtnGroup v-model="settings.finalLegMode" :options="legOptions" />
          </div>
        </div>
      </div>
    </div>

    <!-- ── New Tournament Defaults ────────────────────── -->
    <div class="section-box">
      <h2>{{ t("settings.newTournament.title") }}</h2>
      <div class="section-body">
        <p class="section-intro">{{ t("settings.newTournament.intro") }}</p>
        <div class="setting-group">
          <div class="setting-row">
            <div class="setting-info">
              <div class="setting-label">{{ t("settings.newTournament.knockoutDraw.label") }}</div>
              <div class="setting-desc">{{ t("settings.newTournament.knockoutDraw.desc") }}</div>
            </div>
            <BtnGroup
              v-model="settings.newSeasonDrawType"
              :options="[
                { value: 'random', label: t('common.random') },
                { value: 'seeded', label: t('common.seeded') },
                { value: 'manual', label: t('common.manual') },
              ]"
            />
          </div>
          <div class="setting-row">
            <div class="setting-info">
              <div class="setting-label">{{ t("settings.newTournament.groupDraw.label") }}</div>
              <div class="setting-desc">{{ t("settings.newTournament.groupDraw.desc") }}</div>
            </div>
            <BtnGroup
              v-model="settings.newSeasonGroupDrawType"
              :options="[
                { value: 'random', label: t('common.random') },
                { value: 'seeded', label: t('common.seeded') },
                { value: 'manual', label: t('common.manual') },
              ]"
            />
          </div>
          <div class="setting-row">
            <div class="setting-info">
              <div class="setting-label">
                {{ t("settings.newTournament.playoffSeeding.label") }}
              </div>
              <div class="setting-desc">{{ t("settings.newTournament.playoffSeeding.desc") }}</div>
            </div>
            <BtnGroup
              v-model="settings.newSeasonPlayoffSeedMode"
              :options="[
                { value: 'cross', label: t('settings.newTournament.drawLegend.cross') },
                { value: 'no-same-group', label: t('settings.newTournament.drawLegend.noRematch') },
                { value: 'random', label: t('common.random') },
              ]"
            />
          </div>
        </div>
        <div class="draw-legend">
          <div class="draw-legend-row">
            <strong>Draw options:</strong>
            {{ t("common.random") }} — by chance &nbsp;·&nbsp; {{ t("common.seeded") }} — best teams
            separated &nbsp;·&nbsp; {{ t("common.manual") }} — you place teams
          </div>
          <div class="draw-legend-row">
            <strong>Playoff seeding:</strong>
            {{ t("settings.newTournament.drawLegend.cross") }} — A1 vs B2, B1 vs A2 &nbsp;·&nbsp;
            {{ t("settings.newTournament.drawLegend.noRematch") }} — avoids same-group opponents in
            Round 1 &nbsp;·&nbsp; {{ t("common.random") }} — fully random
          </div>
        </div>
      </div>
    </div>

    <!-- ── Graphics ─────────────────────────────────────── -->
    <div class="section-box">
      <h2>{{ t("settings.graphics.title") }}</h2>
      <div class="section-body">
        <div class="setting-row">
          <div class="setting-info">
            <div class="setting-label">{{ t("settings.graphics.bracketQuality.label") }}</div>
            <div class="setting-desc">{{ t("settings.graphics.bracketQuality.desc") }}</div>
          </div>
          <BtnGroup v-model="settings.bracketQuality" :options="bracketQualityOptions" />
        </div>
      </div>
    </div>

    <!-- ── Display ────────────────────────────────────── -->
    <div class="section-box">
      <h2>{{ t("settings.display.title") }}</h2>
      <div class="section-body">
        <div class="setting-row">
          <div class="setting-info">
            <div class="setting-label">{{ t("settings.display.teamAbbr.label") }}</div>
            <div class="setting-desc">
              {{ t("settings.display.teamAbbr.desc", { example: "BRA" }) }}
            </div>
          </div>
          <BtnGroup v-model="showTeamAbbrVal" :options="showHideOptions" />
        </div>
        <div class="setting-row">
          <div class="setting-info">
            <div class="setting-label">{{ t("settings.display.bracketStyle.label") }}</div>
            <div class="setting-desc">
              <strong>{{ t("settings.display.bracketStyle.doubleSided") }}</strong>
              — teams on both sides ·
              <strong>{{ t("settings.display.bracketStyle.classic") }}</strong>
              — single left-to-right ·
              <strong>{{ t("settings.display.bracketStyle.auto") }}</strong>
              — Double-Sided for 17+ teams
            </div>
          </div>
          <BtnGroup v-model="settings.bracketStyle" :options="bracketStyleOptions" />
        </div>
        <div class="setting-row">
          <div class="setting-info">
            <div class="setting-label">{{ t("settings.display.confetti.label") }}</div>
            <div class="setting-desc">{{ t("settings.display.confetti.desc") }}</div>
          </div>
          <BtnGroup v-model="confettiOnWinVal" :options="onOffOptions" />
        </div>

        <div class="setting-row">
          <div class="setting-info">
            <div class="setting-label">{{ t("settings.display.sound.label") }}</div>
            <div class="setting-desc">{{ t("settings.display.sound.desc") }}</div>
          </div>
          <BtnGroup v-model="soundOnWinVal" :options="onOffOptions" />
        </div>
      </div>
    </div>

    <!-- ── Simulation ─────────────────────────────────── -->
    <div class="section-box">
      <h2>{{ t("settings.simulation.title") }}</h2>
      <div class="section-body">
        <div class="setting-row">
          <div class="setting-info">
            <div class="setting-label">{{ t("settings.simulation.homeAdvantage.label") }}</div>
            <div class="setting-desc">
              {{
                t("settings.simulation.homeAdvantage.desc", { zero: "0", default: "6", max: "20" })
              }}
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
            <span class="surprise-badge">{{ homeAdvantageLabel }}</span>
          </div>
        </div>
        <div class="setting-row">
          <div class="setting-info">
            <div class="setting-label">{{ t("settings.simulation.surpriseFactor.label") }}</div>
            <div class="setting-desc">
              {{ t("settings.simulation.surpriseFactor.desc", { zero: "0", max: "100" }) }}
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
            <span class="surprise-badge">{{ surpriseFactorLabel }}</span>
          </div>
        </div>
        <div class="setting-row">
          <div class="setting-info">
            <div class="setting-label">{{ t("settings.simulation.formFactor.label") }}</div>
            <div class="setting-desc">
              {{ t("settings.simulation.formFactor.desc", { plus: "+10", minus: "−10" }) }}
            </div>
          </div>
          <BtnGroup v-model="formFactorVal" :options="onOffOptions" />
        </div>
      </div>
    </div>

    <!-- ── Sample Data ────────────────────────────────── -->
    <div class="section-box">
      <h2>{{ t("settings.sampleData.title") }}</h2>
      <div class="section-body">
        <p class="section-intro">{{ t("settings.sampleData.intro") }}</p>
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
      <h2>{{ t("settings.dataManagement.title") }}</h2>
      <div class="section-body">
        <div class="setting-row">
          <div class="setting-info">
            <div class="setting-label">{{ t("settings.dataManagement.backup.label") }}</div>
            <div class="setting-desc">{{ t("settings.dataManagement.backup.desc") }}</div>
          </div>
          <div class="btn-row">
            <button @click="exportData">{{ t("common.export") }}</button>
            <button @click="importData">{{ t("common.import") }}</button>
          </div>
        </div>
        <div class="danger-setting-row">
          <div class="setting-info">
            <div class="setting-label danger-label">
              {{ t("settings.dataManagement.clearAll.label") }}
            </div>
            <div class="setting-desc">{{ t("settings.dataManagement.clearAll.desc") }}</div>
          </div>
          <button class="danger" @click="clearData">
            {{ t("settings.dataManagement.clearAll.btn") }}
          </button>
        </div>
      </div>
    </div>

    <!-- ── Reset Settings ───────────────────────────── -->
    <div class="section-box">
      <h2>{{ t("settings.resetSettings.title") }}</h2>
      <div class="section-body">
        <div class="danger-setting-row" style="margin-top: 0; padding-top: 0; border-top: none">
          <div class="setting-info">
            <div class="setting-label">{{ t("settings.resetSettings.label") }}</div>
            <div class="setting-desc">{{ t("settings.resetSettings.desc") }}</div>
          </div>
          <button @click="settings.resetAll()">{{ t("settings.resetSettings.btn") }}</button>
        </div>
      </div>
    </div>

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

/* Language picker */
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

@media (max-width: 640px) {
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
  .lang-picker {
    flex-wrap: wrap;
  }
}
</style>
