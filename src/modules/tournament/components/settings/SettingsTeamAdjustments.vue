<script setup lang="ts">
import { computed, ref } from "vue"
import { ChevronRight, Lock } from "@lucide/vue"
import type { Team } from "@/modules/teams/types"
import { useI18n } from "vue-i18n"
import { AppModal } from "@/components/ui"
import { TeamBadge } from "@/modules/teams/components"

const props = defineProps<{
  teams: Team[]
  hasAnyResults: boolean
  showPoints?: boolean
}>()

const { t } = useI18n()

const teamPointAdjustments = defineModel<Record<string, number>>("teamPointAdjustments", {
  required: true,
})
const teamPowerAdjustments = defineModel<Record<string, number>>("teamPowerAdjustments", {
  required: true,
})

type AdjKind = "points" | "power"

/** Which adjustment list is open in the drawer; null when closed. */
const openKind = ref<AdjKind | null>(null)

const kinds = computed<AdjKind[]>(() =>
  props.showPoints !== false ? ["points", "power"] : ["power"]
)

function titleFor(kind: AdjKind): string {
  return t(`tournament.settingsPage.teamAdjustments.${kind}Title`)
}

function modelFor(kind: AdjKind) {
  return kind === "points" ? teamPointAdjustments : teamPowerAdjustments
}

function getAdj(teamId: string): number {
  if (!openKind.value) return 0
  return modelFor(openKind.value).value[teamId] ?? 0
}

function setAdj(teamId: string, val: number) {
  if (!openKind.value) return
  const model = modelFor(openKind.value)
  const next = { ...model.value }
  if (val === 0) delete next[teamId]
  else next[teamId] = val
  model.value = next
}

const MIN = -30
const MAX = 30
</script>

<template>
  <div v-for="kind in kinds" :key="kind" class="form-card tsp-adj-card">
    <button type="button" class="tsp-adj-header" @click="openKind = kind">
      <span class="tsp-adj-title-row">
        <span class="form-section-title form-section-title--inline">
          {{ titleFor(kind) }}
        </span>
        <span v-if="hasAnyResults" class="tsp-lock-tag">
          <Lock :size="10" />
          {{ t("tournament.settingsPage.locked") }}
        </span>
      </span>
      <ChevronRight :size="16" class="tsp-adj-chevron" />
    </button>
  </div>

  <AppModal v-if="openKind" :title="titleFor(openKind)" width="420px" @close="openKind = null">
    <div v-if="hasAnyResults" class="tsp-locked-banner">
      <Lock :size="12" />
      {{ t("tournament.settingsPage.teamAdjustments.lockedBanner") }}
    </div>
    <template v-else>
      <div class="hint-box hint-box--top">
        {{ t(`tournament.settingsPage.teamAdjustments.${openKind}Hint`) }}
      </div>
      <div class="tsp-adj-list">
        <div v-for="team in teams" :key="team.id" class="tsp-adj-row">
          <TeamBadge :team="team" class="tsp-adj-name" />
          <div class="tsp-adj-stepper">
            <button
              :disabled="getAdj(team.id) <= MIN"
              @click="setAdj(team.id, Math.max(MIN, getAdj(team.id) - 1))"
            >
              −
            </button>
            <span
              class="tsp-adj-val"
              :class="{
                'tsp-adj-val--pos': getAdj(team.id) > 0,
                'tsp-adj-val--neg': getAdj(team.id) < 0,
              }"
            >
              {{ getAdj(team.id) > 0 ? "+" : "" }}{{ getAdj(team.id) }}
            </span>
            <button
              :disabled="getAdj(team.id) >= MAX"
              @click="setAdj(team.id, Math.min(MAX, getAdj(team.id) + 1))"
            >
              +
            </button>
          </div>
        </div>
      </div>
    </template>
  </AppModal>
</template>

<style src="./settings.css"></style>
<style scoped>
.tsp-adj-card {
  padding: 0;
  overflow: hidden;
}

.tsp-adj-header {
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
  text-align: start;
  transition: background 0.12s;
}
.tsp-adj-header:hover {
  background: var(--bg-hover);
}

.tsp-adj-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
}

.form-section-title--inline {
  margin-bottom: 0;
}

.tsp-adj-chevron {
  color: var(--text-muted);
  flex-shrink: 0;
}

.tsp-adj-list {
  display: flex;
  flex-direction: column;
  margin-top: 10px;
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  background: var(--surface);
  overflow: hidden;
}

.tsp-adj-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 10px;
  border-bottom: 1px solid var(--border-light);
  transition: background 0.1s;
}
.tsp-adj-row:last-child {
  border-bottom: none;
}
.tsp-adj-row:hover {
  background: color-mix(in srgb, var(--accent) 5%, var(--surface));
}

.tsp-adj-name {
  flex: 1;
  font-size: 13px;
  color: var(--text);
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
  color: var(--live);
}
.tsp-adj-val--neg {
  color: var(--danger);
}

@media (max-width: 600px) {
  .tsp-adj-name {
    font-size: 12px;
  }
}
</style>
