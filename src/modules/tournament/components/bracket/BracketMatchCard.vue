<script setup lang="ts">
import { ref, computed } from "vue"
import { useI18n } from "vue-i18n"
import type { Match } from "../../types"
import type { Team } from "@/modules/teams/types"
import TeamBadge from "@/modules/teams/components/TeamBadge.vue"
import { NO_TEAM_COLOR } from "@/modules/teams/color"
import { getWinnerId } from "@/engine"
import { useSettingsStore } from "@/modules/settings/store"
import MatchScoreModal from "../match-stats/MatchScoreModal.vue"
import { Pencil } from "@lucide/vue"

const { t } = useI18n()
const settings = useSettingsStore()
const lowQuality = computed(() => settings.bracketQuality === "low")

const props = withDefaults(
  defineProps<{
    match: Match
    teams: Team[]
    variant?: "match" | "third-place"
    isFinal?: boolean
    isExporting?: boolean
    dimmed?: boolean
  }>(),
  { variant: "match" }
)

/**
 * Emits carry no round/match indices — the parent owns the bracket coordinates and
 * already has them in scope at the call site. That keeps this card usable for the
 * third-place match, which has no position in the round grid.
 */
const emit = defineEmits<{
  "set-result": [home: number, away: number, penHome?: number, penAway?: number]
  "set-leg2-result": [home: number, away: number, penHome?: number, penAway?: number]
  "clear-result": []
  "clear-leg2-result": []
  "sim-match": []
  "sim-leg1": []
  "sim-leg2": []
  "hover-team": [teamId: string | null]
}>()

const isDouble = computed(() => props.match.leg2Result !== undefined)

const agg = computed(() => {
  const m = props.match
  if (!m.result || m.leg2Result == null) return null
  return { home: m.result.home + m.leg2Result.away, away: m.result.away + m.leg2Result.home }
})

// Per-team per-leg goals (+ penalty) for compact display
const legs = computed(() => {
  const m = props.match
  if (!isDouble.value) return null
  return {
    homeL1: m.result?.home ?? null,
    homeL2: m.leg2Result?.away ?? null,
    homeP: m.leg2Result?.penAway ?? null, // homeId penalty goals
    awayL1: m.result?.away ?? null,
    awayL2: m.leg2Result?.home ?? null,
    awayP: m.leg2Result?.penHome ?? null, // awayId penalty goals
  }
})

function isWinner(teamId: string | null) {
  if (!props.match.result || !teamId) return false
  return getWinnerId(props.match) === teamId
}

/* Row identity colour, matching the connector strands the bracket already
   draws in the winner's colour — the card and the line it feeds now agree. */
function colorOf(teamId: string | null) {
  if (!teamId) return NO_TEAM_COLOR
  return props.teams.find((t) => t.id === teamId)?.color ?? NO_TEAM_COLOR
}
const homeColor = computed(() => colorOf(props.match.homeId))
const awayColor = computed(() => colorOf(props.match.awayId))
const homeTeam = computed(() => props.teams.find((t) => t.id === props.match.homeId) ?? null)
const awayTeam = computed(() => props.teams.find((t) => t.id === props.match.awayId) ?? null)

// ── Score entry ────────────────────────────────────────────────
// A bracket card is 28px per row and lives inside a pan/zoom layer, so it holds
// no controls at all: it opens the shared score modal. A two-legged tie shows an
// aggregate, which nothing can step, so the leg is picked first.
const editingLeg = ref<null | 1 | 2>(null)
const pickingLeg = ref(false)
const closingPicker = ref(false)
const canEdit = computed(() => !props.isExporting && !!props.match.homeId && !!props.match.awayId)

/** Leg 2 is played reversed, so its rows read away-first against this card. */
const modalHome = computed(() => (editingLeg.value === 2 ? awayTeam.value : homeTeam.value))
const modalAway = computed(() => (editingLeg.value === 2 ? homeTeam.value : awayTeam.value))
const modalResult = computed(() =>
  editingLeg.value === 2 ? props.match.leg2Result : props.match.result
)
const modalSubtitle = computed(() => (isDouble.value ? `Leg ${editingLeg.value}` : undefined))
/** Leg 2's modal frame is home=awayId/away=homeId, so leg 1's score offsets swapped. */
const modalAggregateOffset = computed(() => {
  if (editingLeg.value !== 2 || !props.match.result) return null
  return { home: props.match.result.away, away: props.match.result.home }
})

/* Panning the bracket must not count as a tap. The layer swallows the click if
   the pointer moved, so only a still press opens the modal. */
const pressAt = ref<{ x: number; y: number } | null>(null)
const TAP_SLOP = 6

function onPointerDown(e: PointerEvent) {
  pressAt.value = { x: e.clientX, y: e.clientY }
}

function onPointerUp(e: PointerEvent) {
  const start = pressAt.value
  pressAt.value = null
  if (!start || !canEdit.value) return
  if (Math.abs(e.clientX - start.x) > TAP_SLOP || Math.abs(e.clientY - start.y) > TAP_SLOP) return
  if (isDouble.value) pickingLeg.value = true
  else editingLeg.value = 1
}

function openLeg(leg: 1 | 2) {
  pickingLeg.value = false
  editingLeg.value = leg
}

function closePicker() {
  if (closingPicker.value) return
  closingPicker.value = true
  setTimeout(() => {
    pickingLeg.value = false
    closingPicker.value = false
  }, 180)
}

function onSave(home: number, away: number, penHome?: number, penAway?: number) {
  if (isDouble.value && editingLeg.value === 2) {
    emit("set-leg2-result", home, away, penHome, penAway)
  } else {
    emit("set-result", home, away, penHome, penAway)
  }
}

function onClear() {
  if (isDouble.value && editingLeg.value === 2) emit("clear-leg2-result")
  else emit("clear-result")
}

function onSimulate() {
  if (!isDouble.value) emit("sim-match")
  else if (editingLeg.value === 1) emit("sim-leg1")
  else emit("sim-leg2")
}

const isChampion = computed(() => props.isFinal && !!props.match.result)

/**
 * Whether the tie needed extra time. A two-legged tie is settled in leg 2, so
 * that is the leg that carries the score at ninety.
 */
const wentToExtraTime = computed(() =>
  props.match.leg2Result !== undefined ? !!props.match.leg2Result?.ft : !!props.match.result?.ft
)
</script>

<template>
  <div
    class="mc"
    :class="{
      final: isFinal,
      dimmed,
      champion: isChampion,
      'mc--third': variant === 'third-place',
      'mc--low-q': lowQuality,
      'mc--editable': canEdit,
    }"
    @pointerdown="onPointerDown"
    @pointerup="onPointerUp"
    @mouseleave="$emit('hover-team', null)"
  >
    <div class="mc-teams">
      <div
        class="mc-row"
        :style="{ '--tc': homeColor }"
        :class="{ winner: isWinner(match.homeId), loser: match.result && !isWinner(match.homeId) }"
        @mouseenter="match.homeId && $emit('hover-team', match.homeId)"
      >
        <TeamBadge :team-id="match.homeId" :teams="teams" :size="14" />
      </div>
      <div
        class="mc-row mc-row--away"
        :style="{ '--tc': awayColor }"
        :class="{ winner: isWinner(match.awayId), loser: match.result && !isWinner(match.awayId) }"
        @mouseenter="match.awayId && $emit('hover-team', match.awayId)"
      >
        <TeamBadge :team-id="match.awayId" :teams="teams" :size="14" />
      </div>
    </div>

    <!-- ── Right: scores (only when teams assigned) ── -->
    <div v-if="match.homeId && match.awayId" class="mc-scores">
      <!-- Static "you can tap this" cue — the score cells give no other hint
           that they open the edit modal, and hover means nothing on touch. -->
      <Pencil v-if="canEdit && !match.result" :size="9" class="mc-edit-hint" />
      <span v-else-if="wentToExtraTime" class="mc-aet">{{ t("matchStats.aet") }}</span>
      <!-- Home score cell -->
      <div
        class="mc-scell"
        :style="{ '--tc': homeColor }"
        :class="{
          winner: isWinner(match.homeId),
          loser: match.result && !isWinner(match.homeId),
        }"
      >
        <span v-if="agg !== null" class="sc">{{ agg.home }}</span>
        <span v-else-if="match.result" class="sc">
          {{ match.result.home }}
          <span v-if="match.result.penHome !== undefined" class="pen-sup">
            [{{ match.result.penHome }}p]
          </span>
        </span>
        <span v-else class="sc tbd">–</span>
        <span v-if="legs && legs.homeL1 !== null" class="leg-mini">
          {{ legs.homeL1 }}·{{ legs.homeL2 ?? "–" }}
          <span v-if="legs.homeP !== null" class="pen-sup">[{{ legs.homeP }}p]</span>
        </span>
      </div>

      <!-- Away score cell -->
      <div
        class="mc-scell mc-scell--away"
        :style="{ '--tc': awayColor }"
        :class="{
          winner: isWinner(match.awayId),
          loser: match.result && !isWinner(match.awayId),
        }"
      >
        <span v-if="agg !== null" class="sc">{{ agg.away }}</span>
        <span v-else-if="match.result" class="sc">
          {{ match.result.away }}
          <span v-if="match.result.penAway !== undefined" class="pen-sup">
            [{{ match.result.penAway }}p]
          </span>
        </span>
        <span v-else class="sc tbd">–</span>
        <span v-if="legs && legs.awayL1 !== null" class="leg-mini">
          {{ legs.awayL1 }}·{{ legs.awayL2 ?? "–" }}
          <span v-if="legs.awayP !== null" class="pen-sup">[{{ legs.awayP }}p]</span>
        </span>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="pickingLeg"
        class="leg-pick-backdrop"
        :class="{ closing: closingPicker }"
        @pointerdown="closePicker"
      >
        <div class="leg-pick" :class="{ closing: closingPicker }" @pointerdown.stop>
          <span class="leg-pick-title">{{ t("bracket.legPick") }}</span>
          <div class="leg-pick-btns">
            <button class="leg-pick-btn" @click="openLeg(1)">L1</button>
            <button class="leg-pick-btn" :disabled="!match.result" @click="openLeg(2)">L2</button>
          </div>
        </div>
      </div>
    </Teleport>

    <MatchScoreModal
      v-if="editingLeg !== null && canEdit"
      :home-team="modalHome"
      :away-team="modalAway"
      :result="modalResult"
      :subtitle="modalSubtitle"
      :requires-winner="!isDouble || editingLeg === 2"
      :match-id="match.id"
      :leg="editingLeg"
      :aggregate-offset="modalAggregateOffset"
      @save="onSave"
      @simulate="onSimulate"
      @clear="onClear"
      @close="editingLeg = null"
    />
  </div>
</template>

<style scoped src="./match-card-shared.css"></style>

<style scoped>
/* ── Card shell ── */
.mc {
  display: flex;
  flex-direction: row;
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: var(--elev-1);
  font-size: var(--fs-sm);
  box-sizing: border-box;
  overflow: hidden;
  animation: fade-up var(--dur-slow) var(--ease) both;
  transition: opacity var(--dur) var(--ease);
}
/* The whole card opens the score modal — the pencil, ✓/✗ and shuffle buttons
   that used to live in a third column are all in there now, which is what gives
   the names their width back. */
.mc--editable {
  cursor: pointer;
}
.mc.final {
  border-color: var(--gold);
}
.mc.dimmed {
  opacity: 0.22;
}
.bracket-pan-layer.zooming .mc.champion,
.bracket-pan-layer.dragging .mc.champion {
  animation-play-state: paused;
}
.mc.mc--low-q {
  animation: none;
}
.mc.mc--low-q.champion {
  animation: none;
  box-shadow:
    0 0 0 2px var(--gold-glow),
    0 0 22px var(--gold-glow);
}
@keyframes champion-glow {
  0%,
  100% {
    box-shadow:
      0 0 0 1px var(--gold-soft),
      0 2px 10px var(--gold-faint);
  }
  50% {
    box-shadow:
      0 0 0 2px var(--gold-glow),
      0 0 22px var(--gold-glow),
      0 0 38px var(--gold-soft);
  }
}

/* ── Teams column (left, fills remaining width) ── */
.mc-teams {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

/* ── Team row ── */
.mc-row {
  position: relative;
  display: flex;
  align-items: center;
  height: 28px;
  padding: 0 6px 0 10px;
  gap: 4px;
  border-bottom: 1px solid var(--border-light);
  box-sizing: border-box;
  overflow: hidden;
  transition:
    background var(--dur-fast) var(--ease),
    opacity var(--dur-fast) var(--ease);
}
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
.mc-row.winner {
  background: color-mix(in srgb, var(--tc, var(--success)) 14%, var(--surface));
  font-weight: 700;
}
.mc-row.loser {
  opacity: 0.5;
}

.mc-scores {
  position: relative;
  width: 54px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--border-light);
  transition: background var(--dur-fast) var(--ease);
}
.mc--editable:hover .mc-scores {
}
.mc-edit-hint {
  position: absolute;
  top: 2px;
  right: 2px;
  color: var(--text-muted);
  opacity: 0.5;
  pointer-events: none;
}

/* Sits where the edit hint would be, and never at the same time as it — a
   played tie has nothing left to hint at. */
.mc-aet {
  position: absolute;
  top: 1px;
  right: 2px;
  font-size: 8px;
  line-height: 1;
  letter-spacing: 0.02em;
  color: var(--text-muted);
  opacity: 0.7;
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
    background var(--dur-fast) var(--ease),
    opacity var(--dur-fast) var(--ease);
}
.mc-scell--away {
  border-bottom: none;
}
.mc-scell.winner {
  background: color-mix(in srgb, var(--tc, var(--success)) 14%, var(--surface));
}
.mc-scell.loser {
  opacity: 0.5;
}

/* ── Score chip ── */
.mc.final .sc {
  background: color-mix(in srgb, var(--gold) 16%, var(--surface));
  color: var(--gold-text);
}

/* Double-leg mini breakdown (e.g. "2·1") */
.leg-mini {
  font-size: 9px;
  color: var(--text-muted);
  font-family: var(--font-ui);
  white-space: nowrap;
  flex-shrink: 0;
}

/* ── Leg picker ──
   Teleported, because the card sits inside a transformed pan layer where a
   popover would be scaled along with the bracket. */
@keyframes leg-pick-backdrop-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
@keyframes leg-pick-backdrop-out {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}
@keyframes leg-pick-dialog-in {
  from {
    opacity: 0;
    transform: translate(-50%, -46%);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%);
  }
}
@keyframes leg-pick-dialog-out {
  from {
    opacity: 1;
    transform: translate(-50%, -50%);
  }
  to {
    opacity: 0;
    transform: translate(-50%, -46%);
  }
}
@keyframes leg-pick-sheet-in {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}
@keyframes leg-pick-sheet-out {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(100%);
  }
}

.leg-pick-backdrop {
  position: fixed;
  inset: 0;
  z-index: calc(var(--z-modal) + 10);
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(32, 33, 34, 0.4);
  animation: leg-pick-backdrop-in 0.16s ease both;
}
.leg-pick-backdrop.closing {
  animation: leg-pick-backdrop-out 0.18s ease both;
}
.leg-pick {
  position: fixed;
  top: 50%;
  left: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-3);
  min-width: 220px;
  padding: var(--sp-4);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  transform: translate(-50%, -50%);
  animation: leg-pick-dialog-in 0.18s var(--ease) both;
}
.leg-pick.closing {
  animation: leg-pick-dialog-out 0.18s var(--ease) both;
}
.leg-pick-title {
  font-family: var(--font-ui);
  font-size: var(--fs-sm);
  font-weight: 600;
  color: var(--text-muted);
  text-align: center;
}
.leg-pick-btns {
  display: flex;
  gap: var(--sp-2);
}
@media (max-width: 600px) {
  .leg-pick-backdrop {
    align-items: flex-end;
  }
  .leg-pick {
    position: static;
    width: 100%;
    min-width: 0;
    transform: none;
    border: none;
    border-top: 1px solid var(--border);
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    padding: var(--sp-4) var(--sp-3) calc(var(--sp-3) + var(--safe-bottom));
    animation: leg-pick-sheet-in 0.22s cubic-bezier(0.22, 1, 0.36, 1) both;
  }
  .leg-pick.closing {
    animation: leg-pick-sheet-out 0.18s cubic-bezier(0.4, 0, 1, 1) both;
  }
}
@media (prefers-reduced-motion: reduce) {
  .leg-pick,
  .leg-pick.closing,
  .leg-pick-backdrop,
  .leg-pick-backdrop.closing {
    animation: none;
  }
}
.leg-pick-btn {
  min-width: 64px;
  padding: var(--sp-2) var(--sp-3);
  font-family: var(--font-ui);
  font-size: var(--fs-md);
  font-weight: 700;
  color: var(--accent);
  background: transparent;
  border: 1px solid color-mix(in srgb, var(--accent) 35%, var(--border-light));
  border-radius: var(--radius);
  cursor: pointer;
}
.leg-pick-btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--accent) 10%, transparent);
  border-color: var(--accent);
}
.leg-pick-btn:disabled {
  opacity: 0.35;
  cursor: default;
}

.mc--third {
  border-color: color-mix(in srgb, var(--accent-2) 35%, var(--border-light));
  box-shadow: none;
  animation: none;
}
.mc--third .mc-row,
.mc--third .mc-scell {
  border-bottom-color: color-mix(in srgb, var(--accent-2) 25%, var(--border-light));
}
.mc--third .mc-row--away,
.mc--third .mc-scell--away {
  border-bottom: none;
}
.mc--third .mc-scores {
  border-left-color: color-mix(in srgb, var(--accent-2) 25%, var(--border-light));
}
</style>
