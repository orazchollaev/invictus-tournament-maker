<script setup lang="ts">
import { Zap } from "@lucide/vue"
import { AppButton, AppIcon } from "@/components/ui"
import TeamBadge from "@/modules/teams/components/TeamBadge.vue"
import type { Team } from "@/modules/teams/types"
import type { MatchResult } from "../../types"

/** Highest score the inputs accept — guards against fat-fingered entries. */
const MAX_GOALS = 20

const props = defineProps<{
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

// Same rule as GroupCard's scoreAccentColor: the score box picks up the
// winner's team color, so a played match reads the same way in both tabs.
function scoreAccentColor(): string {
  if (!props.result) return ""
  if (props.result.home > props.result.away) return props.homeTeam?.color ?? ""
  if (props.result.away > props.result.home) return props.awayTeam?.color ?? ""
  return "var(--border)"
}
</script>

<template>
  <div class="lv-match">
    <template v-if="editing">
      <TeamBadge :team="homeTeam" reverse class="lv-team lv-team--home" />
      <div class="lv-score-edit">
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
      </div>
      <TeamBadge :team="awayTeam" class="lv-team lv-team--away" />
      <div class="lv-edit-acts">
        <AppButton variant="filled" size="xs" @click="emit('commit')">✓</AppButton>
        <AppButton size="xs" @click="emit('cancel')">✕</AppButton>
      </div>
    </template>

    <template v-else>
      <TeamBadge :team="homeTeam" reverse class="lv-team lv-team--home" />

      <button
        class="lv-score-btn"
        :class="{ 'lv-score-btn--played': !!result }"
        :style="result ? { borderColor: scoreAccentColor(), borderLeftWidth: '3px' } : {}"
        @click="emit('edit')"
      >
        <template v-if="result">{{ result.home }} – {{ result.away }}</template>
        <template v-else>vs</template>
      </button>

      <TeamBadge :team="awayTeam" class="lv-team lv-team--away" />

      <button class="lv-sim-btn" title="Simulate" @click="emit('sim')">
        <AppIcon :icon="Zap" size="xs" />
      </button>
    </template>
  </div>
</template>

<style scoped>
/* Grid + spacing mirror GroupCard's .gs-match so a league fixture row
   reads as the same shape as a group-stage one. */
.lv-match {
  display: grid;
  grid-template-columns: 1fr auto 1fr auto;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  padding: 2px 0;
  min-width: 0;
}

.lv-team {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  color: var(--text-muted);
}
.lv-team--home {
  justify-content: flex-end;
  text-align: right;
}
.lv-team--away {
  justify-content: flex-start;
}
.lv-winner {
  color: var(--text);
  font-weight: 600;
}

.lv-score-btn {
  font-family: var(--font);
  font-size: 12px;
  font-weight: 600;
  min-width: 48px;
  justify-content: center;
  padding: 2px 6px;
  background: var(--bg);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  cursor: pointer;
  flex-shrink: 0;
  display: flex;
  color: var(--text-muted);
}
.lv-score-btn--played {
  color: var(--text);
  border-color: var(--border);
}
.lv-score-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.lv-score-edit {
  display: flex;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
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

.lv-edit-acts {
  display: flex;
  gap: 3px;
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
    padding: 5px 0;
  }
  .lv-score-btn {
    min-width: 56px;
    padding: 5px 8px;
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
