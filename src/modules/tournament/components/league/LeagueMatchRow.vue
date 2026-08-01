<script setup lang="ts">
import { Zap } from "@lucide/vue"
import { AppButton, AppIcon } from "@/components/ui"
import TeamBadge from "@/modules/teams/components/TeamBadge.vue"
import type { Team } from "@/modules/teams/types"
import type { MatchResult } from "../../types"

/** Highest score the inputs accept — guards against fat-fingered entries. */
const MAX_GOALS = 20

defineProps<{
  homeTeam: Team | undefined
  awayTeam: Team | undefined
  result: MatchResult | null
  editing: boolean
}>()

const emit = defineEmits<{
  edit: []
  commit: []
  cancel: []
  sim: []
}>()

/** Bound as strings so an emptied input stays empty instead of snapping to 0. */
const home = defineModel<string>("home", { required: true })
const away = defineModel<string>("away", { required: true })

function onKey(e: KeyboardEvent) {
  if (e.key === "Enter") emit("commit")
  else if (e.key === "Escape") emit("cancel")
}
</script>

<template>
  <div class="lv-match">
    <template v-if="editing">
      <TeamBadge :team="homeTeam" class="lv-match-team lv-match-team--home" />
      <input
        v-model="home"
        class="lv-score-input"
        type="number"
        min="0"
        :max="MAX_GOALS"
        @keyup="onKey"
      />
      <span class="lv-match-sep">–</span>
      <input
        v-model="away"
        class="lv-score-input"
        type="number"
        min="0"
        :max="MAX_GOALS"
        @keyup="onKey"
      />
      <TeamBadge :team="awayTeam" class="lv-match-team lv-match-team--away" />
      <AppButton variant="filled" size="xs" @click="emit('commit')">✓</AppButton>
      <AppButton size="xs" @click="emit('cancel')">✕</AppButton>
    </template>

    <template v-else>
      <TeamBadge
        :team="homeTeam"
        class="lv-match-team lv-match-team--home"
        :class="{ 'lv-winner': result && result.home > result.away }"
      />
      <button
        class="lv-score-btn"
        :class="{ 'lv-score-btn--played': !!result }"
        @click="emit('edit')"
      >
        <template v-if="result">{{ result.home }} – {{ result.away }}</template>
        <template v-else>vs</template>
      </button>
      <TeamBadge
        :team="awayTeam"
        class="lv-match-team lv-match-team--away"
        :class="{ 'lv-winner': result && result.away > result.home }"
      />
      <button class="lv-sim-btn" title="Simulate" @click="emit('sim')">
        <AppIcon :icon="Zap" size="xs" />
      </button>
    </template>
  </div>
</template>

<style scoped>
.lv-match {
  display: flex;
  align-items: center;
  gap: var(--sp-1);
  padding: 3px var(--sp-2);
  background: var(--bg);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  font-size: var(--fs-xs);
  min-height: 28px;
  min-width: 0;
  overflow: hidden;
}

/* Crest only — the row is too narrow for names. */
.lv-match-team {
  flex: 1;
  display: flex;
  align-items: center;
  gap: var(--sp-1);
  min-width: 0;
  color: var(--text-muted);
}
.lv-match-team :deep(.name) {
  display: none;
}
.lv-match-team--home {
  flex-direction: row-reverse;
  justify-content: flex-end;
}
.lv-match-team--away {
  flex-direction: row;
  justify-content: flex-start;
}
.lv-winner {
  color: var(--text);
  font-weight: 600;
}

.lv-score-btn {
  min-width: 40px;
  padding: 1px 5px;
  text-align: center;
  font-size: var(--fs-xs);
  font-weight: 700;
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  background: transparent;
  color: var(--text-muted);
  font-family: var(--font-ui);
  cursor: pointer;
  flex-shrink: 0;
  display: flex;
  justify-content: center;
}
.lv-score-btn--played {
  color: var(--text);
  border-color: var(--border);
}
.lv-score-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.lv-match-sep {
  font-weight: 700;
  color: var(--text-muted);
  flex-shrink: 0;
}

.lv-score-input {
  width: 32px;
  text-align: center;
  padding: 1px 3px;
  font-size: var(--fs-xs);
  font-weight: 700;
  flex-shrink: 0;
}

.lv-sim-btn {
  color: var(--text-muted);
  border: 1px solid transparent;
  background: transparent;
  display: inline-flex;
  align-items: center;
  padding: 2px 3px;
  cursor: pointer;
  flex-shrink: 0;
  opacity: 0.5;
}
.lv-sim-btn:hover {
  color: var(--accent);
  opacity: 1;
}

@media (max-width: 640px) {
  .lv-match {
    font-size: var(--fs-sm);
    padding: var(--sp-1) var(--sp-3);
  }
  .lv-score-btn {
    min-width: 48px;
    padding: var(--sp-1) var(--sp-2);
    font-size: var(--fs-sm);
  }
  .lv-score-input {
    width: 40px;
    padding: var(--sp-1);
    font-size: var(--fs-base);
  }
  .lv-sim-btn {
    padding: 5px 7px;
    opacity: 0.7;
  }
}
</style>
