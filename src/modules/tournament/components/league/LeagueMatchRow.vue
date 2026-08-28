<script setup lang="ts">
import { ref } from "vue"
import TeamBadge from "@/modules/teams/components/TeamBadge.vue"
import type { Team } from "@/modules/teams/types"
import type { MatchResult } from "../../types"
import MatchScoreModal from "../match-stats/MatchScoreModal.vue"
import MatchStatsButton from "../match-stats/MatchStatsButton.vue"

const props = defineProps<{
  homeTeam: Team | undefined
  awayTeam: Team | undefined
  result: MatchResult | null
  /** Matchday label, shown as the modal's subtitle. */
  label?: string
  locked?: boolean
}>()

const emit = defineEmits<{
  save: [home: number, away: number]
  clear: []
  sim: []
}>()

/* The score button is the whole edit affordance now: the row is one line tall,
   so entry happens in the modal where there is room for it. */
const editing = ref(false)

function scoreAccentColor(): string {
  if (!props.result) return ""
  if (props.result.home > props.result.away) return props.homeTeam?.color ?? ""
  if (props.result.away > props.result.home) return props.awayTeam?.color ?? ""
  return "var(--border)"
}
</script>

<template>
  <div class="lv-match">
    <TeamBadge :team="homeTeam" :size="16" reverse class="lv-team lv-team--home" />

    <button
      class="lv-score-btn"
      :class="{ 'lv-score-btn--played': !!result, 'lv-score-btn--locked': locked }"
      :style="result ? { borderColor: scoreAccentColor(), borderLeftWidth: '3px' } : {}"
      :disabled="locked"
      @click="editing = true"
    >
      <template v-if="result">{{ result.home }} – {{ result.away }}</template>
      <template v-else>vs</template>
    </button>

    <TeamBadge :team="awayTeam" :size="16" class="lv-team lv-team--away" />

    <!-- Always a column, filled or not, so rows stay aligned down the list. -->
    <span class="lv-report">
      <MatchStatsButton
        :home-team="homeTeam"
        :away-team="awayTeam"
        :result="result"
        :subtitle="label"
        size="xs"
      />
    </span>

    <!-- Inside the row, so the component keeps a single root element. -->
    <MatchScoreModal
      v-if="editing && !locked"
      :home-team="homeTeam"
      :away-team="awayTeam"
      :result="result"
      :subtitle="label"
      @save="(h, a) => emit('save', h, a)"
      @simulate="emit('sim')"
      @clear="emit('clear')"
      @close="editing = false"
    />
  </div>
</template>

<style scoped>
/* Three columns: the per-match simulate button moved into the modal, so the
   names get its width back. */
.lv-match {
  display: grid;
  grid-template-columns: 1fr auto 1fr 18px;
  align-items: center;
  gap: var(--sp-2);
  font-size: var(--fs-base);
  padding: var(--sp-1) 0;
  min-width: 0;
}

.lv-report {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.lv-team {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  min-width: 0;
  color: var(--text-muted);
}

.lv-team :deep(.name) {
  font-size: var(--fs-base);
}
.lv-team--home {
  justify-content: flex-end;
  text-align: end;
}
.lv-team--away {
  justify-content: flex-start;
}

.lv-score-btn {
  font-family: var(--font);
  font-size: var(--fs-md);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  justify-content: center;
  background: var(--bg);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  cursor: pointer;
  flex-shrink: 0;
  display: flex;
  color: var(--text-muted);
  padding: var(--sp-1) var(--sp-2);
  min-width: 60px;
}
.lv-score-btn--played {
  color: var(--text);
  border-color: var(--border);
}
.lv-score-btn:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent);
}
.lv-score-btn--locked {
  cursor: default;
  pointer-events: none;
}

@media (max-width: 600px) {
  .lv-match {
    padding: var(--sp-1) 0;
  }
}
</style>
