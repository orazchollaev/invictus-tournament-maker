<script setup lang="ts">
import { computed, ref } from "vue"
import type { Team } from "@/modules/teams/types"
import { getWinnerId } from "@/engine"
import { NO_TEAM_COLOR } from "@/modules/teams/color"
import TeamBadge from "@/modules/teams/components/TeamBadge.vue"
import MatchScoreModal from "../MatchScoreModal.vue"
import type { FlatMatch } from "./types"
import { Pencil } from "@lucide/vue"

const props = defineProps<{ match: FlatMatch; teams: Team[] }>()
const emit = defineEmits<{
  "set-result": [match: FlatMatch, home: number, away: number, penHome?: number, penAway?: number]
  "clear-result": [match: FlatMatch]
  sim: [match: FlatMatch]
}>()

function getTeam(id: string | null): Team | null {
  if (!id) return null
  return props.teams.find((t) => t.id === id) ?? null
}

/* Each row carries its own club's colour, so a fixture list identifies the
   teams before a single result is in — and a tournament's fixtures look like
   *that* tournament rather than like every other one. */
const homeColor = computed(() => getTeam(props.match.homeId)?.color ?? NO_TEAM_COLOR)
const awayColor = computed(() => getTeam(props.match.awayId)?.color ?? NO_TEAM_COLOR)

/* The card is 28px per row — far too little for a stepper, an input and a
   shootout. Tapping it opens the one score modal instead. */
const editing = ref(false)
const canEdit = computed(() => !!props.match.homeId && !!props.match.awayId)
</script>

<template>
  <div class="mc" :class="{ 'mc--played': !!match.result }">
    <button
      class="mc-open"
      type="button"
      :disabled="!canEdit"
      :aria-label="'Set result'"
      @click="editing = true"
    >
      <div class="mc-teams">
        <div
          class="mc-row"
          :style="{ '--tc': homeColor }"
          :class="{
            winner: match.result && getWinnerId(match) === match.homeId,
            loser: match.result && getWinnerId(match) !== match.homeId,
          }"
        >
          <TeamBadge :team="getTeam(match.homeId)" />
        </div>
        <div
          class="mc-row mc-row--away"
          :style="{ '--tc': awayColor }"
          :class="{
            winner: match.result && getWinnerId(match) === match.awayId,
            loser: match.result && getWinnerId(match) !== match.awayId,
          }"
        >
          <TeamBadge :team="getTeam(match.awayId)" />
        </div>
      </div>

      <div class="mc-scores">
        <Pencil v-if="canEdit && !match.result" :size="9" class="mc-edit-hint" />
        <div
          class="mc-scell"
          :style="{ '--tc': homeColor }"
          :class="{
            winner: match.result && getWinnerId(match) === match.homeId,
            loser: match.result && getWinnerId(match) !== match.homeId,
          }"
        >
          <span class="sc" :class="{ tbd: !match.result }">
            {{ match.result ? match.result.home : "–" }}
            <span v-if="match.result?.penHome !== undefined" class="pen-sup">
              [{{ match.result.penHome }}p]
            </span>
          </span>
        </div>
        <div
          class="mc-scell mc-scell--away"
          :style="{ '--tc': awayColor }"
          :class="{
            winner: match.result && getWinnerId(match) === match.awayId,
            loser: match.result && getWinnerId(match) !== match.awayId,
          }"
        >
          <span class="sc" :class="{ tbd: !match.result }">
            {{ match.result ? match.result.away : "–" }}
            <span v-if="match.result?.penAway !== undefined" class="pen-sup">
              [{{ match.result.penAway }}p]
            </span>
          </span>
        </div>
      </div>
    </button>

    <!-- Inside the card, so the component keeps a single root element and any
         style a parent passes down still lands on it. -->
    <MatchScoreModal
      v-if="editing && canEdit"
      :home-team="getTeam(match.homeId)"
      :away-team="getTeam(match.awayId)"
      :result="match.result"
      requires-winner
      @save="(h, a, ph, pa) => emit('set-result', match, h, a, ph, pa)"
      @simulate="emit('sim', match)"
      @clear="emit('clear-result', match)"
      @close="editing = false"
    />
  </div>
</template>

<style scoped src="../match-card-shared.css"></style>
<style scoped>
.mc {
  display: flex;
  flex-direction: row;
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  background: var(--surface);
  font-size: 12px;
  overflow: hidden;
  animation: fade-up 0.22s ease both;
}
.mc--played {
  border-color: var(--border);
}

.mc-open {
  display: flex;
  flex-direction: row;
  width: 100%;
  padding: 0;
  border: none;
  background: transparent;
  font: inherit;
  color: inherit;
  cursor: pointer;
  text-align: start;
  min-width: 0;
  gap: 0;
}
.mc-open:disabled {
  cursor: default;
}
.mc-open:not(:disabled):hover .mc-scores,
.mc-open:not(:disabled):focus-visible .mc-scores {
  background: color-mix(in srgb, var(--accent) 8%, transparent);
}
.mc-open:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}

.mc-teams {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.mc-row {
  position: relative;
  display: flex;
  align-items: center;
  height: 28px;
  padding: 0 8px 0 11px;
  gap: 5px;
  border-bottom: 1px solid var(--border-light);
  box-sizing: border-box;
  overflow: hidden;
  transition:
    background 0.1s,
    opacity 0.1s;
}
/* Club identity bar. Ringed, because a white kit on a white card is
   otherwise invisible — see modules/teams/color.ts. */
.mc-row::before {
  content: "";
  position: absolute;
  inset-inline-start: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--tc, transparent);
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.18);
}
.mc-row--away {
  border-bottom: none;
}
/* Won matches take the winner's colour rather than one shared green, so a
   fixture list reads as "who won" and not just "played / not played". */
.mc-row.winner {
  background: color-mix(in srgb, var(--tc, var(--success)) 14%, var(--surface));
  font-weight: 700;
}
.mc-row.loser {
  opacity: 0.45;
}

.mc-scores {
  position: relative;
  width: 52px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--border-light);
  transition: background 0.12s;
}
.mc-edit-hint {
  position: absolute;
  top: 2px;
  right: 2px;
  color: var(--text-muted);
  opacity: 0.5;
  pointer-events: none;
}

.mc-scell {
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 0 4px;
  border-bottom: 1px solid var(--border-light);
  box-sizing: border-box;
  transition:
    background 0.1s,
    opacity 0.1s;
}
.mc-scell--away {
  border-bottom: none;
}
.mc-scell.winner {
  background: color-mix(in srgb, var(--tc, var(--success)) 14%, var(--surface));
}
.mc-scell.loser {
  opacity: 0.45;
}
</style>
