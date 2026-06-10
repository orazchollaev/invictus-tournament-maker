<script setup lang="ts">
import { computed, watch } from "vue"
import BtnGroup from "@/components/BtnGroup.vue"
import type { LegMode } from "@/modules/tournament/types"
import type { Team } from "@/modules/teams/types"

const props = defineProps<{
  selectedTeams: Team[]
  allTeams: Team[]
}>()

const leagueLegMode = defineModel<LegMode>("leagueLegMode", { required: true })
const tierCount = defineModel<number>("tierCount", { required: true })
const tierAssignments = defineModel<Record<string, number>>("tierAssignments", { required: true })
const promotionCount = defineModel<number>("promotionCount", { required: true })

const multiLegOptions = [
  { value: "single", label: "Single" },
  { value: "double", label: "Double" },
  { value: "triple", label: "3×" },
  { value: "quadruple", label: "4×" },
]

const tierNames = computed(() => {
  const names: string[] = []
  for (let i = 0; i < tierCount.value; i++) {
    names.push(i === 0 ? "Division 1" : `Division ${i + 1}`)
  }
  return names
})

const teamsPerTier = computed(() => {
  const buckets: string[][] = Array.from({ length: tierCount.value }, () => [])
  for (const team of props.selectedTeams) {
    const tier = tierAssignments.value[team.id] ?? 0
    buckets[Math.min(tier, tierCount.value - 1)].push(team.id)
  }
  return buckets
})

const maxPromotionCount = computed(() => {
  if (tierCount.value <= 1) return 0
  return Math.max(0, Math.min(...teamsPerTier.value.map((b) => b.length)) - 1)
})

watch(tierCount, (count) => {
  const sorted = [...props.selectedTeams].sort((a, b) => b.power - a.power)
  const assignments: Record<string, number> = {}
  const perTier = Math.ceil(sorted.length / count)
  sorted.forEach((team, i) => {
    assignments[team.id] = Math.min(Math.floor(i / perTier), count - 1)
  })
  tierAssignments.value = assignments
})

watch(
  () => props.selectedTeams,
  (teams) => {
    if (tierCount.value <= 1) return
    const count = tierCount.value
    const sorted = [...teams].sort((a, b) => b.power - a.power)
    const perTier = Math.ceil(sorted.length / count)
    const newAssignments = { ...tierAssignments.value }
    sorted.forEach((team, i) => {
      if (newAssignments[team.id] === undefined) {
        newAssignments[team.id] = Math.min(Math.floor(i / perTier), count - 1)
      }
    })
    for (const id of Object.keys(newAssignments)) {
      if (!teams.find((t) => t.id === id)) delete newAssignments[id]
    }
    tierAssignments.value = newAssignments
  }
)
</script>

<template>
  <!-- Round Format -->
  <div class="ctp-card">
    <div class="ctp-section-title">Round Format</div>
    <div class="ctp-leg-row">
      <span class="ctp-row-label">Schedule</span>
      <BtnGroup v-model="leagueLegMode" :options="multiLegOptions" />
    </div>
    <div class="ctp-hint-box">
      <strong>Single</strong>
      — once &nbsp;·&nbsp;
      <strong>Double</strong>
      — home &amp; away &nbsp;·&nbsp;
      <strong>3×</strong>
      — 3 matches &nbsp;·&nbsp;
      <strong>4×</strong>
      — 4 matches (2H &amp; 2A)
    </div>
  </div>

  <!-- League Tiers -->
  <div class="ctp-card">
    <div class="ctp-section-title">League Tiers</div>
    <div class="ctp-gc-row">
      <span class="ctp-gc-label">Number of Tiers</span>
      <div class="ctp-gc-stepper">
        <button :disabled="tierCount <= 1" @click="tierCount = Math.max(1, tierCount - 1)">
          −
        </button>
        <span class="ctp-gc-val">{{ tierCount }}</span>
        <button
          :disabled="tierCount >= 4 || selectedTeams.length < (tierCount + 1) * 2"
          @click="tierCount = Math.min(4, tierCount + 1)"
        >
          +
        </button>
      </div>
      <span class="ctp-gc-hint">
        {{ tierCount === 1 ? "single division" : `${tierCount} divisions` }}
      </span>
    </div>

    <template v-if="tierCount > 1">
      <div class="ctp-gc-row" style="margin-top: 8px">
        <span class="ctp-gc-label">Promotion / Relegation</span>
        <div class="ctp-gc-stepper">
          <button
            :disabled="promotionCount <= 1"
            @click="promotionCount = Math.max(1, promotionCount - 1)"
          >
            −
          </button>
          <span class="ctp-gc-val">{{ promotionCount }}</span>
          <button
            :disabled="promotionCount >= maxPromotionCount"
            @click="promotionCount = Math.min(maxPromotionCount, promotionCount + 1)"
          >
            +
          </button>
        </div>
        <span class="ctp-gc-hint">teams swap between adjacent tiers</span>
      </div>

      <div class="ctp-tier-blocks">
        <div v-for="(ids, ti) in teamsPerTier" :key="ti" class="ctp-tier-block">
          <div class="ctp-tier-label">{{ tierNames[ti] }} ({{ ids.length }})</div>
          <div class="ctp-tier-chips">
            <div v-for="teamId in ids" :key="teamId" class="ctp-tier-chip">
              <span
                class="ctp-dot"
                :style="{
                  background: allTeams.find((t) => t.id === teamId)?.color ?? '#888',
                }"
              />
              <span class="ctp-tier-chip-name">
                {{ allTeams.find((t) => t.id === teamId)?.name }}
              </span>
              <div class="ctp-tier-move">
                <button
                  v-if="ti > 0"
                  class="ctp-tier-mv-btn"
                  title="Move up"
                  @click="tierAssignments[teamId] = ti - 1"
                >
                  ↑
                </button>
                <button
                  v-if="ti < tierCount - 1"
                  class="ctp-tier-mv-btn"
                  title="Move down"
                  @click="tierAssignments[teamId] = ti + 1"
                >
                  ↓
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style src="./ctp.css"></style>
