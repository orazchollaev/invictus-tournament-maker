<script setup lang="ts">
import type { Team } from "@/modules/teams/types"
import { getWinnerId } from "@/engine"
import { teamAbbr } from "@/composables/useTeamLookup"
import FlagCircle from "@/modules/teams/components/FlagCircle.vue"
import { useSettingsStore } from "@/modules/settings/store"
import { Shuffle } from "@lucide/vue"
import FixtureLegRow from "./FixtureLegRow.vue"
import type { FlatMatch, MatchEditor } from "./useMatchEditor"

const settings = useSettingsStore()

const props = defineProps<{ match: FlatMatch; teams: Team[]; editor: MatchEditor }>()
const emit = defineEmits<{
  save: [match: FlatMatch, leg: 1 | 2]
  "save-pens": [match: FlatMatch, leg: 1 | 2]
  "sim-match": [match: FlatMatch]
  "sim-leg1": [match: FlatMatch]
  "sim-leg2": [match: FlatMatch]
}>()

function getTeam(id: string | null): Team | null {
  if (!id) return null
  return props.teams.find((t) => t.id === id) ?? null
}

function getAbbr(id: string | null): string {
  const t = getTeam(id)
  if (!t) return "TBD"
  return settings.showTeamAbbr ? teamAbbr(t) : t.name
}

/** Aggregate across both legs, with shootout goals folded in when there was one. */
function aggLabel(match: FlatMatch): string | null {
  if (!match.result || !match.leg2Result) return null
  const h = match.result.home + match.leg2Result.away
  const hPen = (match.result?.penAway || 0) + (match.leg2Result?.penAway || 0)
  const a = match.result.away + match.leg2Result.home
  const aPen = (match.result?.penHome || 0) + (match.leg2Result?.penHome || 0)

  if (hPen || aPen) return `${h + hPen} – ${a + aPen} with penalties`
  return `${h} – ${a}`
}

function aggWinnerId(match: FlatMatch): string | null {
  if (!match.result || !match.leg2Result) return null
  return getWinnerId(match)
}

function onSim(leg: 1 | 2) {
  if (leg === 1) emit("sim-leg1", props.match)
  else emit("sim-leg2", props.match)
}
</script>

<template>
  <div class="tie-card">
    <!-- Aggregate header -->
    <div class="tie-hd">
      <div class="tie-hd-team">
        <FlagCircle
          v-if="getTeam(match.homeId)?.flag"
          :code="getTeam(match.homeId)!.flag!"
          :size="14"
        />
        <span v-else class="cdot" :style="{ background: getTeam(match.homeId)?.color ?? '#ccc' }" />
        <span class="tie-hd-name">{{ getAbbr(match.homeId) }}</span>
      </div>
      <div class="tie-hd-center">
        <span v-if="aggLabel(match)" class="agg" :class="{ 'agg--decided': aggWinnerId(match) }">
          {{ aggLabel(match) }}
        </span>
        <span v-else class="agg agg--tbd">agg</span>
      </div>
      <div class="tie-hd-team tie-hd-team--r">
        <span class="tie-hd-name">{{ getAbbr(match.awayId) }}</span>
        <FlagCircle
          v-if="getTeam(match.awayId)?.flag"
          :code="getTeam(match.awayId)!.flag!"
          :size="14"
        />
        <span v-else class="cdot" :style="{ background: getTeam(match.awayId)?.color ?? '#ccc' }" />
      </div>
      <button
        v-if="match.homeId && match.awayId"
        class="tie-sim"
        title="Simulate both legs"
        @click="$emit('sim-match', match)"
      >
        <Shuffle :size="11" />
      </button>
    </div>

    <div class="tie-legs">
      <FixtureLegRow
        :match="match"
        :leg="1"
        :home-id="match.homeId"
        :away-id="match.awayId"
        :result="match.result"
        :teams="teams"
        :editor="editor"
        @save="(leg) => emit('save', match, leg)"
        @save-pens="(leg) => emit('save-pens', match, leg)"
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
        :editor="editor"
        :disabled="!match.result"
        @save="(leg) => emit('save', match, leg)"
        @save-pens="(leg) => emit('save-pens', match, leg)"
        @sim="onSim"
      />
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

.tie-hd {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-2);
  background: var(--bg);
  border-bottom: 1px solid var(--border-light);
}

.tie-hd-team {
  display: flex;
  align-items: center;
  gap: var(--sp-1);
  font-size: var(--fs-xs);
  font-weight: 700;
  color: var(--text-muted);
  flex-shrink: 0;
  min-width: 0;
}
.tie-hd-team--r {
  flex-direction: row-reverse;
}
.tie-hd-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 72px;
}

.tie-hd-center {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  min-width: 0;
}

.agg {
  font-family: var(--font-ui);
  font-size: var(--fs-base);
  font-weight: 800;
  color: var(--text);
  letter-spacing: -0.02em;
  white-space: nowrap;
}
.agg--decided {
  color: var(--accent);
}
.agg--tbd {
  font-size: 9px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-muted);
  opacity: 0.5;
}

.tie-sim {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  flex-shrink: 0;
  padding: 0;
  transition:
    color var(--dur-fast) var(--ease),
    border-color var(--dur-fast) var(--ease);
}
.tie-sim:hover {
  color: var(--accent);
  border-color: var(--accent);
}

.tie-legs {
  display: flex;
  flex-direction: column;
}

/* ── Colour dot (fallback when a team has no flag) ── */
.cdot {
  display: inline-block;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 0 1.5px rgba(0, 0, 0, 0.08);
}
</style>
