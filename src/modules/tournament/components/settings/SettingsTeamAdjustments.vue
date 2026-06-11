<script setup lang="ts">
import { ref } from "vue"
import { ChevronDown, Lock } from "@lucide/vue"
import type { Team } from "@/modules/teams/types"
import { useI18n } from "vue-i18n"

const { t } = useI18n()

defineProps<{
  teams: Team[]
  hasAnyResults: boolean
}>()

const teamPointAdjustments = defineModel<Record<string, number>>("teamPointAdjustments", {
  required: true,
})
const teamPowerAdjustments = defineModel<Record<string, number>>("teamPowerAdjustments", {
  required: true,
})

const pointsOpen = ref(false)
const powerOpen = ref(false)

function getPointAdj(teamId: string): number {
  return teamPointAdjustments.value[teamId] ?? 0
}
function getPowerAdj(teamId: string): number {
  return teamPowerAdjustments.value[teamId] ?? 0
}

function setPointAdj(teamId: string, val: number) {
  const next = { ...teamPointAdjustments.value }
  if (val === 0) delete next[teamId]
  else next[teamId] = val
  teamPointAdjustments.value = next
}
function setPowerAdj(teamId: string, val: number) {
  const next = { ...teamPowerAdjustments.value }
  if (val === 0) delete next[teamId]
  else next[teamId] = val
  teamPowerAdjustments.value = next
}

const MIN = -30
const MAX = 30
</script>

<template>
  <!-- Point Adjustments Accordion -->
  <div class="tsp-card tsp-accordion-card">
    <button class="tsp-accordion-header" @click="pointsOpen = !pointsOpen">
      <div class="tsp-accordion-title-row">
        <span class="tsp-section-title tsp-section-title--inline">
          {{ t("tournament.settingsPage.teamAdjustments.pointsTitle") }}
        </span>
        <span v-if="hasAnyResults" class="tsp-lock-tag">
          <Lock :size="10" />
          {{ t("tournament.settingsPage.locked") }}
        </span>
      </div>
      <ChevronDown
        :size="16"
        class="tsp-accordion-chevron"
        :class="{ 'tsp-accordion-chevron--open': pointsOpen }"
      />
    </button>

    <div v-if="pointsOpen" class="tsp-accordion-body">
      <div v-if="hasAnyResults" class="tsp-locked-banner">
        <Lock :size="12" />
        {{ t("tournament.settingsPage.teamAdjustments.lockedBanner") }}
      </div>
      <template v-else>
        <div class="tsp-hint-box tsp-hint-box--top">
          {{ t("tournament.settingsPage.teamAdjustments.pointsHint") }}
        </div>
        <div class="tsp-adj-list">
          <div v-for="team in teams" :key="team.id" class="tsp-adj-row">
            <span class="tsp-adj-dot" :style="{ background: team.color }" />
            <span class="tsp-adj-name">{{ team.name }}</span>
            <div class="tsp-adj-stepper">
              <button
                :disabled="getPointAdj(team.id) <= MIN"
                @click="setPointAdj(team.id, Math.max(MIN, getPointAdj(team.id) - 1))"
              >
                −
              </button>
              <span
                class="tsp-adj-val"
                :class="{
                  'tsp-adj-val--pos': getPointAdj(team.id) > 0,
                  'tsp-adj-val--neg': getPointAdj(team.id) < 0,
                }"
              >
                {{ getPointAdj(team.id) > 0 ? "+" : "" }}{{ getPointAdj(team.id) }}
              </span>
              <button
                :disabled="getPointAdj(team.id) >= MAX"
                @click="setPointAdj(team.id, Math.min(MAX, getPointAdj(team.id) + 1))"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>

  <!-- Power Adjustments Accordion -->
  <div class="tsp-card tsp-accordion-card">
    <button class="tsp-accordion-header" @click="powerOpen = !powerOpen">
      <div class="tsp-accordion-title-row">
        <span class="tsp-section-title tsp-section-title--inline">
          {{ t("tournament.settingsPage.teamAdjustments.powerTitle") }}
        </span>
        <span v-if="hasAnyResults" class="tsp-lock-tag">
          <Lock :size="10" />
          {{ t("tournament.settingsPage.locked") }}
        </span>
      </div>
      <ChevronDown
        :size="16"
        class="tsp-accordion-chevron"
        :class="{ 'tsp-accordion-chevron--open': powerOpen }"
      />
    </button>

    <div v-if="powerOpen" class="tsp-accordion-body">
      <div v-if="hasAnyResults" class="tsp-locked-banner">
        <Lock :size="12" />
        {{ t("tournament.settingsPage.teamAdjustments.lockedBanner") }}
      </div>
      <template v-else>
        <div class="tsp-hint-box tsp-hint-box--top">
          {{ t("tournament.settingsPage.teamAdjustments.powerHint") }}
        </div>
        <div class="tsp-adj-list">
          <div v-for="team in teams" :key="team.id" class="tsp-adj-row">
            <span class="tsp-adj-dot" :style="{ background: team.color }" />
            <span class="tsp-adj-name">{{ team.name }}</span>
            <div class="tsp-adj-stepper">
              <button
                :disabled="getPowerAdj(team.id) <= MIN"
                @click="setPowerAdj(team.id, Math.max(MIN, getPowerAdj(team.id) - 1))"
              >
                −
              </button>
              <span
                class="tsp-adj-val"
                :class="{
                  'tsp-adj-val--pos': getPowerAdj(team.id) > 0,
                  'tsp-adj-val--neg': getPowerAdj(team.id) < 0,
                }"
              >
                {{ getPowerAdj(team.id) > 0 ? "+" : "" }}{{ getPowerAdj(team.id) }}
              </span>
              <button
                :disabled="getPowerAdj(team.id) >= MAX"
                @click="setPowerAdj(team.id, Math.min(MAX, getPowerAdj(team.id) + 1))"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style src="./tsp.css"></style>
<style scoped>
.tsp-accordion-card {
  padding: 0;
  overflow: hidden;
}

.tsp-accordion-header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 14px 16px;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text);
  text-align: left;
  transition: background 0.12s;
}
.tsp-accordion-header:hover {
  background: var(--bg-hover, rgba(128, 128, 128, 0.06));
}

.tsp-accordion-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
}

.tsp-section-title--inline {
  margin-bottom: 0;
}

.tsp-accordion-chevron {
  color: var(--text-muted);
  flex-shrink: 0;
  transition: transform 0.18s ease;
}
.tsp-accordion-chevron--open {
  transform: rotate(180deg);
}

.tsp-accordion-body {
  padding: 0 16px 14px;
  border-top: 1px solid var(--border-light);
}

.tsp-adj-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 10px;
}

.tsp-adj-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 5px 0;
}

.tsp-adj-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.tsp-adj-name {
  flex: 1;
  font-size: 13px;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tsp-adj-stepper {
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  flex-shrink: 0;
}
.tsp-adj-stepper button {
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 0;
  font-size: 15px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background: var(--surface);
  color: var(--text);
  transition: background 0.1s;
}
.tsp-adj-stepper button:first-child {
  border-right: 1px solid var(--border);
}
.tsp-adj-stepper button:last-child {
  border-left: 1px solid var(--border);
}
.tsp-adj-stepper button:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.tsp-adj-stepper button:not(:disabled):hover {
  background: var(--bg);
}

.tsp-adj-val {
  width: 38px;
  text-align: center;
  font-size: 13px;
  font-family: var(--font-ui);
  font-weight: 700;
  color: var(--text-muted);
}
.tsp-adj-val--pos {
  color: #22c55e;
}
.tsp-adj-val--neg {
  color: #ef4444;
}

@media (max-width: 600px) {
  .tsp-adj-name {
    font-size: 12px;
  }
}
</style>
