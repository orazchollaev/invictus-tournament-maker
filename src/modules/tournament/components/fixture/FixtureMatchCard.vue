<script setup lang="ts">
import type { Team } from "@/modules/teams/types"
import { getWinnerId } from "@/engine"
import TeamBadge from "@/modules/teams/components/TeamBadge.vue"
import { X, Shuffle, Pencil, Check } from "@lucide/vue"
import type { FlatMatch, MatchEditor } from "./useMatchEditor"

const props = defineProps<{ match: FlatMatch; teams: Team[]; editor: MatchEditor }>()
defineEmits<{
  save: [match: FlatMatch]
  "save-pens": [match: FlatMatch]
  sim: [match: FlatMatch]
}>()

function getTeam(id: string | null): Team | null {
  if (!id) return null
  return props.teams.find((t) => t.id === id) ?? null
}
</script>

<!-- eslint-disable vue/no-mutating-props -- `editor` is a shared reactive store object owned by FixtureView; mutating its fields is the intended contract -->
<template>
  <div class="mc" :class="{ 'mc--played': !!match.result }">
    <div class="mc-teams">
      <div
        class="mc-row"
        :class="{
          winner: match.result && getWinnerId(match) === match.homeId,
          loser: match.result && getWinnerId(match) !== match.homeId,
        }"
      >
        <TeamBadge :team="getTeam(match.homeId)" />
      </div>
      <div
        class="mc-row mc-row--away"
        :class="{
          winner: match.result && getWinnerId(match) === match.awayId,
          loser: match.result && getWinnerId(match) !== match.awayId,
        }"
      >
        <TeamBadge :team="getTeam(match.awayId)" />
      </div>
    </div>

    <template v-if="match.homeId && match.awayId">
      <div class="mc-scores">
        <!-- Home score cell -->
        <div
          class="mc-scell"
          :class="{
            winner: match.result && getWinnerId(match) === match.homeId,
            loser: match.result && getWinnerId(match) !== match.homeId,
          }"
        >
          <template v-if="editor.isEditing(match) && editor.mode === 'score'">
            <input v-model.number="editor.home" type="number" min="0" class="sinp" />
          </template>
          <template v-else-if="editor.isEditing(match) && editor.mode === 'penalty'">
            <span class="pen-base">{{ editor.home }}</span>
            <input v-model.number="editor.penHome" type="number" min="0" class="sinp sinp--pen" />
          </template>
          <template v-else>
            <span class="sc" :class="{ tbd: !match.result }">
              {{ match.result ? match.result.home : "–" }}
              <span v-if="match.result?.penHome !== undefined" class="pen-sup">
                [{{ match.result.penHome }}p]
              </span>
            </span>
          </template>
        </div>
        <!-- Away score cell -->
        <div
          class="mc-scell mc-scell--away"
          :class="{
            winner: match.result && getWinnerId(match) === match.awayId,
            loser: match.result && getWinnerId(match) !== match.awayId,
          }"
        >
          <template v-if="editor.isEditing(match) && editor.mode === 'score'">
            <input v-model.number="editor.away" type="number" min="0" class="sinp" />
          </template>
          <template v-else-if="editor.isEditing(match) && editor.mode === 'penalty'">
            <span class="pen-base">{{ editor.away }}</span>
            <input v-model.number="editor.penAway" type="number" min="0" class="sinp sinp--pen" />
          </template>
          <template v-else>
            <span class="sc" :class="{ tbd: !match.result }">
              {{ match.result ? match.result.away : "–" }}
              <span v-if="match.result?.penAway !== undefined" class="pen-sup">
                [{{ match.result.penAway }}p]
              </span>
            </span>
          </template>
        </div>
      </div>

      <!-- Actions -->
      <div class="mc-acts">
        <template v-if="editor.isEditing(match)">
          <button
            class="abt ok"
            :disabled="editor.mode === 'penalty' && editor.penHome === editor.penAway"
            @click="editor.mode === 'penalty' ? $emit('save-pens', match) : $emit('save', match)"
          >
            <Check :size="11" />
          </button>
          <button class="abt" @click="editor.cancel()"><X :size="11" /></button>
        </template>
        <template v-else>
          <button class="abt" title="Edit" @click="editor.startEdit(match)">
            <Pencil :size="11" />
          </button>
          <button class="abt" title="Simulate" @click="$emit('sim', match)">
            <Shuffle :size="11" />
          </button>
        </template>
      </div>
    </template>
  </div>
</template>

<style scoped src="./fixture-card-shared.css"></style>
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

.mc-teams {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.mc-row {
  display: flex;
  align-items: center;
  height: 28px;
  padding: 0 8px;
  gap: 5px;
  border-bottom: 1px solid var(--border-light);
  box-sizing: border-box;
  overflow: hidden;
  transition:
    background 0.1s,
    opacity 0.1s;
}
.mc-row--away {
  border-bottom: none;
}
.mc-row.winner {
  background: color-mix(in srgb, var(--success) 10%, var(--surface));
  font-weight: 700;
}
.mc-row.loser {
  opacity: 0.45;
}

.mc-scores {
  width: 52px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--border-light);
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
  background: color-mix(in srgb, var(--success) 10%, var(--surface));
}
.mc-scell.loser {
  opacity: 0.45;
}

.mc-acts {
  width: 28px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 0 4px;
  border-left: 1px solid var(--border-light);
  background: var(--bg);
  box-sizing: border-box;
}
</style>
