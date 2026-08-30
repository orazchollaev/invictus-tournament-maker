<script setup lang="ts">
import type { Team } from "@/modules/teams/types"
import { getWinnerId } from "@/engine"
import { TeamBadge } from "@/modules/teams/components"
import FixtureLegRow from "./FixtureLegRow.vue"
import type { FlatMatch } from "./types"

const props = defineProps<{ match: FlatMatch; teams: Team[] }>()
const emit = defineEmits<{
  "set-result": [
    match: FlatMatch,
    leg: 1 | 2,
    home: number,
    away: number,
    penHome?: number,
    penAway?: number,
  ]
  "clear-result": [match: FlatMatch, leg: 1 | 2]
  "sim-leg1": [match: FlatMatch]
  "sim-leg2": [match: FlatMatch]
}>()

function getTeam(id: string | null): Team | null {
  if (!id) return null
  return props.teams.find((t) => t.id === id) ?? null
}

function aggLabel(match: FlatMatch): string | null {
  if (!match.result || !match.leg2Result) return null
  const h = match.result.home + match.leg2Result.away
  const hPen = (match.result?.penAway || 0) + (match.leg2Result?.penAway || 0)
  const a = match.result.away + match.leg2Result.home
  const aPen = (match.result?.penHome || 0) + (match.leg2Result?.penHome || 0)

  if (hPen || aPen) return `${h + hPen} – ${a + aPen}p`
  return `${h} – ${a}`
}

function aggWinnerId(match: FlatMatch): string | null {
  if (!match.result || !match.leg2Result) return null
  return getWinnerId(match)
}

/** Leg 2's row frame is home=awayId/away=homeId, so leg 1's score offsets swapped. */
function leg2AggregateOffset(match: FlatMatch): { home: number; away: number } | null {
  if (!match.result) return null
  return { home: match.result.away, away: match.result.home }
}

function onSim(leg: 1 | 2) {
  if (leg === 1) emit("sim-leg1", props.match)
  else emit("sim-leg2", props.match)
}
</script>

<template>
  <div class="tie-card">
    <div class="tie-legs">
      <FixtureLegRow
        :match="match"
        :leg="1"
        :home-id="match.homeId"
        :away-id="match.awayId"
        :result="match.result"
        :teams="teams"
        @set-result="(leg, h, a, ph, pa) => emit('set-result', match, leg, h, a, ph, pa)"
        @clear-result="(leg) => emit('clear-result', match, leg)"
        @sim="onSim"
      />
      <!-- Leg 2 is played at the other venue, so the sides swap. -->
      <FixtureLegRow
        :match="match"
        :leg="2"
        :home-id="match.awayId"
        :away-id="match.homeId"
        :result="match.leg2Result"
        :teams="teams"
        :disabled="!match.result"
        :aggregate-offset="leg2AggregateOffset(match)"
        @set-result="(leg, h, a, ph, pa) => emit('set-result', match, leg, h, a, ph, pa)"
        @clear-result="(leg) => emit('clear-result', match, leg)"
        @sim="onSim"
      />
    </div>

    <!-- Total score, below both legs — badges only, so it reads as "whose
         score this is" without repeating the names again. -->
    <div class="tie-agg">
      <TeamBadge :team="getTeam(match.homeId)" :size="16" class="tie-agg-badge" />
      <span v-if="aggLabel(match)" class="agg" :class="{ 'agg--decided': aggWinnerId(match) }">
        {{ aggLabel(match) }}
      </span>
      <span v-else class="agg agg--tbd">–</span>
      <TeamBadge :team="getTeam(match.awayId)" :size="16" class="tie-agg-badge" />
    </div>
  </div>
</template>

<style scoped>
.tie-card {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  overflow: hidden;
  animation: fade-up var(--dur) var(--ease) both;
}

.tie-legs {
  display: flex;
  flex-direction: column;
}
.tie-legs > :first-child {
  border-bottom: 1px solid var(--border-light);
}

/* Total score, below both legs. */
.tie-agg {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-2);
  padding: var(--sp-2);
  border-top: 1px solid var(--border-light);
  background: var(--bg);
}

.agg {
  font-family: var(--font-mono);
  font-size: var(--fs-md);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--text);
  white-space: nowrap;
  line-height: 1.1;
}
.agg--decided {
  color: var(--accent);
}
.agg--tbd {
  color: var(--text-muted);
  opacity: 0.6;
}

/* Icon only — the crest, not the name, so a score reads "whose" without
   spelling it out again. */
.tie-agg-badge :deep(.name) {
  display: none;
}
.tie-agg-badge {
  flex: 0 0 20px;
  width: 20px;
}
</style>
