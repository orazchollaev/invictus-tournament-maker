<script setup lang="ts">
import type { Team } from "@/modules/teams/types"
import type { MatchResult } from "../../types"
import { getWinnerId } from "@/engine"
import { teamAbbr } from "@/composables/useTeamLookup"
import FlagCircle from "@/modules/teams/components/FlagCircle.vue"
import TeamBadge from "@/modules/teams/components/TeamBadge.vue"
import { useSettingsStore } from "@/modules/settings/store"
import { X, Shuffle, Pencil, Check } from "@lucide/vue"
import type { FlatMatch, MatchEditor } from "./useMatchEditor"

const settings = useSettingsStore()

const props = defineProps<{ match: FlatMatch; teams: Team[]; editor: MatchEditor }>()
defineEmits<{
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

function legWinner(result: MatchResult | null | undefined, side: "home" | "away"): boolean {
  if (!result) return false
  return side === "home" ? result.home > result.away : result.away > result.home
}

function aggLabel(match: FlatMatch): string | null {
  if (!match.result || !match.leg2Result) return null
  const h = match.result.home + match.leg2Result.away
  const hPen = (match.result?.penAway || 0) + (match.leg2Result?.penAway || 0)
  const a = match.result.away + match.leg2Result.home
  const aPen = (match.result?.penHome || 0) + (match.leg2Result?.penHome || 0)

  if (hPen || aPen) {
    return `${h + hPen} – ${a + aPen} with penalties`
  }

  return `${h} – ${a}`
}

function aggWinnerId(match: FlatMatch): string | null {
  if (!match.result || !match.leg2Result) return null
  return getWinnerId(match)
}

function hasPen(result: MatchResult | null | undefined): boolean {
  return !!result && result.penHome !== undefined
}
</script>

<!-- eslint-disable vue/no-mutating-props -- `editor` is a shared reactive store object owned by FixtureView; mutating its fields is the intended contract -->
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

    <!-- Leg rows -->
    <div class="tie-legs">
      <!-- Leg 1 -->
      <div class="leg">
        <div class="leg-label">L1</div>
        <div class="leg-teams">
          <div
            class="leg-tr"
            :class="{
              winner: legWinner(match.result, 'home'),
              loser: !!match.result && !legWinner(match.result, 'home'),
            }"
          >
            <TeamBadge :team="getTeam(match.homeId)" />
          </div>
          <div
            class="leg-tr leg-tr--away"
            :class="{
              winner: legWinner(match.result, 'away'),
              loser: !!match.result && !legWinner(match.result, 'away'),
            }"
          >
            <TeamBadge :team="getTeam(match.awayId)" />
          </div>
        </div>
        <div v-if="match.homeId && match.awayId" class="leg-scores">
          <div
            class="leg-sc"
            :class="{
              winner: legWinner(match.result, 'home'),
              loser: !!match.result && !legWinner(match.result, 'home'),
            }"
          >
            <input
              v-if="editor.isEditing(match, 1)"
              v-model.number="editor.home"
              type="number"
              min="0"
              class="sinp"
            />
            <span v-else class="sc" :class="{ tbd: !match.result }">
              {{ match.result?.home ?? "–" }}
            </span>
          </div>
          <div
            class="leg-sc leg-sc--away"
            :class="{
              winner: legWinner(match.result, 'away'),
              loser: !!match.result && !legWinner(match.result, 'away'),
            }"
          >
            <input
              v-if="editor.isEditing(match, 1)"
              v-model.number="editor.away"
              type="number"
              min="0"
              class="sinp"
            />
            <span v-else class="sc" :class="{ tbd: !match.result }">
              {{ match.result?.away ?? "–" }}
            </span>
          </div>
        </div>
        <div v-if="match.homeId && match.awayId" class="leg-acts">
          <template v-if="editor.isEditing(match, 1)">
            <button class="abt ok" @click="$emit('save', match, 1)"><Check :size="11" /></button>
            <button class="abt" @click="editor.cancel()"><X :size="11" /></button>
          </template>
          <template v-else>
            <button class="abt" title="Edit" @click="editor.startEdit(match, 1)">
              <Pencil :size="11" />
            </button>
            <button class="abt" title="Simulate leg 1" @click="$emit('sim-leg1', match)">
              <Shuffle :size="11" />
            </button>
          </template>
        </div>
      </div>

      <!-- Leg 2 -->
      <div class="leg" :class="{ 'leg--locked': !match.result }">
        <div class="leg-label">L2</div>
        <div class="leg-teams">
          <div
            class="leg-tr"
            :class="{
              winner: legWinner(match.leg2Result, 'home'),
              loser: !!match.leg2Result && !legWinner(match.leg2Result, 'home'),
            }"
          >
            <TeamBadge :team="getTeam(match.awayId)" />
          </div>
          <div
            class="leg-tr leg-tr--away"
            :class="{
              winner: legWinner(match.leg2Result, 'away'),
              loser: !!match.leg2Result && !legWinner(match.leg2Result, 'away'),
            }"
          >
            <TeamBadge :team="getTeam(match.homeId)" />
          </div>
        </div>
        <div v-if="match.homeId && match.awayId" class="leg-scores">
          <template v-if="editor.isEditing(match, 2) && editor.mode === 'penalty'">
            <div class="leg-sc">
              <span class="pen-base">{{ editor.home }}</span>
              <input v-model.number="editor.penHome" type="number" min="0" class="sinp sinp--pen" />
            </div>
            <div class="leg-sc leg-sc--away">
              <span class="pen-base">{{ editor.away }}</span>
              <input v-model.number="editor.penAway" type="number" min="0" class="sinp sinp--pen" />
            </div>
          </template>
          <template v-else>
            <div
              class="leg-sc"
              :class="{
                winner: legWinner(match.leg2Result, 'home'),
                loser: !!match.leg2Result && !legWinner(match.leg2Result, 'home'),
              }"
            >
              <input
                v-if="editor.isEditing(match, 2)"
                v-model.number="editor.home"
                type="number"
                min="0"
                class="sinp"
              />
              <template v-else>
                <span class="sc" :class="{ tbd: !match.leg2Result }">
                  {{ match.leg2Result?.home ?? "–" }}
                </span>
                <span v-if="hasPen(match.leg2Result)" class="pen-sup">
                  [{{ match.leg2Result!.penHome }}p]
                </span>
              </template>
            </div>
            <div
              class="leg-sc leg-sc--away"
              :class="{
                winner: legWinner(match.leg2Result, 'away'),
                loser: !!match.leg2Result && !legWinner(match.leg2Result, 'away'),
              }"
            >
              <input
                v-if="editor.isEditing(match, 2)"
                v-model.number="editor.away"
                type="number"
                min="0"
                class="sinp"
              />
              <template v-else>
                <span class="sc" :class="{ tbd: !match.leg2Result }">
                  {{ match.leg2Result?.away ?? "–" }}
                </span>
                <span v-if="hasPen(match.leg2Result)" class="pen-sup">
                  [{{ match.leg2Result!.penAway }}p]
                </span>
              </template>
            </div>
          </template>
        </div>
        <div v-if="match.homeId && match.awayId" class="leg-acts">
          <template v-if="editor.isEditing(match, 2)">
            <button
              class="abt ok"
              :disabled="editor.mode === 'penalty' && editor.penHome === editor.penAway"
              @click="editor.mode === 'penalty' ? $emit('save-pens', match, 2) : $emit('save', match, 2)"
            >
              <Check :size="11" />
            </button>
            <button class="abt" @click="editor.cancel()"><X :size="11" /></button>
          </template>
          <template v-else>
            <button
              class="abt"
              title="Edit"
              :disabled="!match.result"
              @click="match.result ? editor.startEdit(match, 2) : undefined"
            >
              <Pencil :size="11" />
            </button>
            <button
              class="abt"
              title="Simulate leg 2"
              :disabled="!match.result"
              @click="match.result ? $emit('sim-leg2', match) : undefined"
            >
              <Shuffle :size="11" />
            </button>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped src="./fixture-card-shared.css"></style>
<style scoped>
.tie-card {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  overflow: hidden;
  animation: fade-up 0.22s ease both;
}

.tie-hd {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  background: var(--bg);
  border-bottom: 1px solid var(--border-light);
}

.tie-hd-team {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
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
  font-size: 14px;
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
    color 0.1s,
    border-color 0.1s;
}
.tie-sim:hover {
  color: var(--accent);
  border-color: var(--accent);
}

.tie-legs {
  display: flex;
  flex-direction: column;
}

/* ── Leg row ── */
.leg {
  display: flex;
  flex-direction: row;
  border-bottom: 1px solid var(--border-light);
  font-size: 12px;
}
.leg:last-child {
  border-bottom: none;
}
.leg--locked {
  opacity: 0.38;
  pointer-events: none;
}

.leg-label {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  flex-shrink: 0;
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  border-right: 1px solid var(--border-light);
  background: var(--bg);
}

.leg-teams {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.leg-tr {
  display: flex;
  align-items: center;
  height: 26px;
  padding: 0 6px;
  gap: 5px;
  border-bottom: 1px solid var(--border-light);
  overflow: hidden;
  transition:
    background 0.1s,
    opacity 0.1s;
}
.leg-tr--away {
  border-bottom: none;
}
.leg-tr.winner {
  background: color-mix(in srgb, var(--success) 10%, var(--surface));
  font-weight: 700;
}
.leg-tr.loser {
  opacity: 0.45;
}

.leg-scores {
  width: 52px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--border-light);
}

.leg-sc {
  height: 26px;
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
.leg-sc--away {
  border-bottom: none;
}
.leg-sc.winner {
  background: color-mix(in srgb, var(--success) 10%, var(--surface));
}
.leg-sc.loser {
  opacity: 0.45;
}

.leg-acts {
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

/* ── Color dot ── */
.cdot {
  display: inline-block;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 0 1.5px rgba(0, 0, 0, 0.08);
}
</style>
