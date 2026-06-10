<script setup lang="ts">
import BtnGroup from "@/components/BtnGroup.vue"
import type { Tiebreaker } from "@/modules/tournament/types"

const tiebreaker = defineModel<Tiebreaker>("tiebreaker", { required: true })
const winPoints = defineModel<number>("winPoints", { required: true })
const drawPoints = defineModel<number>("drawPoints", { required: true })
const lossPoints = defineModel<number>("lossPoints", { required: true })
</script>

<template>
  <!-- Tiebreaker -->
  <div class="ctp-card">
    <div class="ctp-section-title">Tiebreaker</div>
    <div class="ctp-leg-row">
      <span class="ctp-row-label">Method</span>
      <BtnGroup
        v-model="tiebreaker"
        :options="[
          { value: 'head-to-head', label: 'H2H' },
          { value: 'goal-diff', label: 'Goal diff' },
        ]"
      />
    </div>
  </div>

  <!-- Scoring -->
  <div class="ctp-card">
    <div class="ctp-section-title">Scoring</div>
    <div class="ctp-gc-row" style="margin-bottom: 6px">
      <span class="ctp-gc-label">Points for a Win</span>
      <div class="ctp-gc-stepper">
        <button :disabled="winPoints <= 0" @click="winPoints = Math.max(0, winPoints - 1)">
          −
        </button>
        <span class="ctp-gc-val">{{ winPoints }}</span>
        <button :disabled="winPoints >= 10" @click="winPoints = Math.min(10, winPoints + 1)">
          +
        </button>
      </div>
    </div>
    <div class="ctp-gc-row" style="margin-bottom: 6px">
      <span class="ctp-gc-label">Points for a Draw</span>
      <div class="ctp-gc-stepper">
        <button :disabled="drawPoints <= 0" @click="drawPoints = Math.max(0, drawPoints - 1)">
          −
        </button>
        <span class="ctp-gc-val">{{ drawPoints }}</span>
        <button :disabled="drawPoints >= 10" @click="drawPoints = Math.min(10, drawPoints + 1)">
          +
        </button>
      </div>
    </div>
    <div class="ctp-gc-row" style="margin-bottom: 6px">
      <span class="ctp-gc-label">Points for a Loss</span>
      <div class="ctp-gc-stepper">
        <button :disabled="lossPoints <= 0" @click="lossPoints = Math.max(0, lossPoints - 1)">
          −
        </button>
        <span class="ctp-gc-val">{{ lossPoints }}</span>
        <button :disabled="lossPoints >= 10" @click="lossPoints = Math.min(10, lossPoints + 1)">
          +
        </button>
      </div>
    </div>
  </div>
</template>

<style src="./ctp.css"></style>
