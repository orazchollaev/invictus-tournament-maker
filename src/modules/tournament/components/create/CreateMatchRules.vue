<script setup lang="ts">
import BtnGroup from "@/components/BtnGroup.vue"
import type { LegMode, PlayoffSeedMode } from "@/modules/tournament/types"

type DrawType = "random" | "seeded" | "manual"
type TournamentFormat = "bracket" | "group+bracket" | "league"

const props = defineProps<{
  format: TournamentFormat
  selectedCount: number
}>()

const drawType = defineModel<DrawType>("drawType", { required: true })
const playoffSeedMode = defineModel<PlayoffSeedMode>("playoffSeedMode", { required: true })
const hasThirdPlace = defineModel<boolean>("hasThirdPlace", { required: true })
const groupLegMode = defineModel<LegMode>("groupLegMode", { required: true })
const knockoutLegMode = defineModel<LegMode>("knockoutLegMode", { required: true })
const finalLegMode = defineModel<LegMode>("finalLegMode", { required: true })

const drawOptions = [
  { value: "random", label: "Random" },
  { value: "seeded", label: "Seeded" },
  { value: "manual", label: "Manual" },
]
const legOptions = [
  { value: "single", label: "Single" },
  { value: "double", label: "Double" },
]
const multiLegOptions = [
  { value: "single", label: "Single" },
  { value: "double", label: "Double" },
  { value: "triple", label: "3×" },
  { value: "quadruple", label: "4×" },
]
</script>

<template>
  <!-- Draw Method -->
  <div class="ctp-card">
    <div class="ctp-section-title">Draw Method</div>
    <div class="ctp-draw-rows">
      <div class="ctp-draw-row">
        <span v-if="format === 'group+bracket'" class="ctp-row-label">Group stage</span>
        <BtnGroup v-model="drawType" :options="drawOptions" />
      </div>
      <div v-if="format === 'group+bracket'" class="ctp-draw-row">
        <span class="ctp-row-label">Playoff bracket</span>
        <BtnGroup
          v-model="playoffSeedMode"
          :options="[
            { value: 'cross', label: 'Cross' },
            { value: 'no-same-group', label: 'No rematch' },
            { value: 'random', label: 'Random' },
            { value: 'manual', label: 'Manual' },
          ]"
        />
      </div>
    </div>
    <div class="ctp-hint-box">
      <strong>Random</strong>
      — teams placed by chance &nbsp;·&nbsp;
      <strong>Seeded</strong>
      — top teams kept apart &nbsp;·&nbsp;
      <strong>Manual</strong>
      — you arrange them
      <template v-if="format === 'group+bracket'">
        <br />
        <strong>Playoff bracket:</strong>
        Cross — A1 vs B2, B1 vs A2 &nbsp;·&nbsp; No rematch — avoids same-group matchups in Round 1
        &nbsp;·&nbsp; Random — fully random
      </template>
    </div>
  </div>

  <!-- 3rd Place Option -->
  <div v-if="selectedCount >= 4" class="ctp-card">
    <div class="ctp-section-title">Options</div>
    <label class="ctp-toggle-row">
      <input v-model="hasThirdPlace" type="checkbox" />
      <span class="ctp-toggle-label">3rd Place Match</span>
      <span class="ctp-toggle-hint">Semi-final losers play for bronze medal</span>
    </label>
  </div>

  <!-- Legs per Match -->
  <div class="ctp-card">
    <div class="ctp-section-title">Legs per Match</div>
    <div class="ctp-leg-rows">
      <div v-if="format === 'group+bracket'" class="ctp-leg-row">
        <span class="ctp-row-label">Group Stage</span>
        <BtnGroup v-model="groupLegMode" :options="multiLegOptions" />
      </div>
      <div class="ctp-leg-row">
        <span class="ctp-row-label">Knockout Rounds</span>
        <BtnGroup v-model="knockoutLegMode" :options="legOptions" />
      </div>
      <div class="ctp-leg-row">
        <span class="ctp-row-label">Final</span>
        <BtnGroup v-model="finalLegMode" :options="legOptions" />
      </div>
    </div>
  </div>
</template>

<style src="./ctp.css"></style>
