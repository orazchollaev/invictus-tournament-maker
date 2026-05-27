<script setup lang="ts">
import { ref, computed } from "vue"
import type { Tournament, Match, MatchResult } from "../types"
import type { Team } from "@/modules/teams/types"
import { getWinnerId } from "@/engine"
import { teamAbbr } from "@/composables/useTeamLookup"
import TeamNameAuto from "@/modules/teams/components/TeamNameAuto.vue"
import { useSettingsStore } from "@/modules/settings/store"
import { X, Shuffle, Pencil, Check } from "lucide-vue-next"

const settings = useSettingsStore()

const props = defineProps<{ tournament: Tournament; teams: Team[] }>()
const emit = defineEmits<{
  "set-result": [
    round: number,
    match: number,
    home: number,
    away: number,
    penHome?: number,
    penAway?: number,
  ]
  "set-leg2-result": [
    round: number,
    match: number,
    home: number,
    away: number,
    penHome?: number,
    penAway?: number,
  ]
  "sim-match": [round: number, match: number]
  "sim-leg1": [round: number, match: number]
  "sim-leg2": [round: number, match: number]
  "set-third-place-result": [home: number, away: number, penHome?: number, penAway?: number]
  "sim-third-place": []
}>()

const roundOptions = computed(() => {
  const opts: { label: string; value: number | "tp" }[] = props.tournament.rounds.map((r, i) => ({
    label: r.name,
    value: i,
  }))
  if (props.tournament.hasThirdPlace && props.tournament.thirdPlaceMatch) {
    opts.push({ label: "3rd Place", value: "tp" })
  }
  return opts
})

const selectedRound = ref<number | "tp">(roundOptions.value[0]?.value ?? 0)

const editingKey = ref<string | null>(null)
const editMode = ref<"score" | "penalty">("score")
const editHome = ref(0)
const editAway = ref(0)
const editPenHome = ref(0)
const editPenAway = ref(0)

interface FlatMatch extends Match {
  _origRound: number
  _origMatch: number
  _isThirdPlace?: boolean
}

function getEditKey(match: FlatMatch, leg: 1 | 2 = 1): string {
  return match.leg2Result !== undefined ? `${match.id}_leg${leg}` : match.id
}

function startEdit(match: FlatMatch, leg: 1 | 2 = 1) {
  editingKey.value = getEditKey(match, leg)
  editMode.value = "score"
  const src: MatchResult | null | undefined = leg === 2 ? match.leg2Result : match.result
  editHome.value = src?.home ?? 0
  editAway.value = src?.away ?? 0
  editPenHome.value = src?.penHome ?? 0
  editPenAway.value = src?.penAway ?? 0
}

function cancelEdit() {
  editingKey.value = null
  editMode.value = "score"
}

function isEditing(match: FlatMatch, leg: 1 | 2 = 1): boolean {
  return editingKey.value === getEditKey(match, leg)
}

function saveResult(match: FlatMatch, leg: 1 | 2 = 1) {
  if (leg === 2) {
    const l1 = match.result
    if (l1) {
      const aggHome = l1.home + editAway.value
      const aggAway = l1.away + editHome.value
      if (aggHome === aggAway) {
        editMode.value = "penalty"
        editPenHome.value = 0
        editPenAway.value = 0
        return
      }
    }
    emit("set-leg2-result", match._origRound, match._origMatch, editHome.value, editAway.value)
    cancelEdit()
    return
  }

  if (match.leg2Result !== undefined) {
    if (match._isThirdPlace) {
      emit("set-third-place-result", editHome.value, editAway.value)
    } else {
      emit("set-result", match._origRound, match._origMatch, editHome.value, editAway.value)
    }
    cancelEdit()
    return
  }

  if (editHome.value === editAway.value) {
    editMode.value = "penalty"
    editPenHome.value = match.result?.penHome ?? 0
    editPenAway.value = match.result?.penAway ?? 0
    return
  }
  if (match._isThirdPlace) {
    emit("set-third-place-result", editHome.value, editAway.value)
  } else {
    emit("set-result", match._origRound, match._origMatch, editHome.value, editAway.value)
  }
  cancelEdit()
}

function savePenalties(match: FlatMatch, leg: 1 | 2 = 1) {
  if (editPenHome.value === editPenAway.value) return
  if (leg === 2) {
    emit(
      "set-leg2-result",
      match._origRound,
      match._origMatch,
      editHome.value,
      editAway.value,
      editPenHome.value,
      editPenAway.value
    )
    cancelEdit()
    return
  }
  if (match._isThirdPlace) {
    emit(
      "set-third-place-result",
      editHome.value,
      editAway.value,
      editPenHome.value,
      editPenAway.value
    )
  } else {
    emit(
      "set-result",
      match._origRound,
      match._origMatch,
      editHome.value,
      editAway.value,
      editPenHome.value,
      editPenAway.value
    )
  }
  cancelEdit()
}

const filteredMatches = computed((): FlatMatch[] => {
  if (selectedRound.value === "tp") {
    const tp = props.tournament.thirdPlaceMatch
    if (!tp) return []
    return [{ ...tp, _origRound: -1, _origMatch: -1, _isThirdPlace: true }]
  }
  const ri = selectedRound.value as number
  return (props.tournament.rounds[ri]?.matches ?? []).map((m, mi) => ({
    ...m,
    _origRound: ri,
    _origMatch: mi,
  }))
})

function getTeam(id: string | null): Team | null {
  if (!id) return null
  return props.teams.find((t) => t.id === id) ?? null
}

function getAbbr(id: string | null): string {
  const t = getTeam(id)
  if (!t) return "TBD"
  return settings.showTeamAbbr ? teamAbbr(t) : t.name
}

const isSoloLayout = computed(() => {
  const lastRoundIdx = props.tournament.rounds.length - 1
  return selectedRound.value === lastRoundIdx || selectedRound.value === "tp"
})

function legWinner(result: MatchResult | null | undefined, side: "home" | "away"): boolean {
  if (!result) return false
  return side === "home" ? result.home > result.away : result.away > result.home
}

function aggLabel(match: FlatMatch): string {
  if (!match.result || !match.leg2Result) return null as unknown as string
  const h = match.result.home + match.leg2Result.away
  const a = match.result.away + match.leg2Result.home
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

<template>
  <div class="fv">
    <!-- Round tabs -->
    <div class="fv-tabs">
      <button
        v-for="opt in roundOptions"
        :key="String(opt.value)"
        class="fv-tab"
        :class="{ active: selectedRound === opt.value, 'tp-tab': opt.value === 'tp' }"
        @click="selectedRound = opt.value"
      >
        {{ opt.label }}
      </button>
    </div>

    <!-- Match grid -->
    <div class="fv-grid" :class="{ solo: isSoloLayout }">
      <template v-for="match in filteredMatches" :key="match.id">
        <!-- ══ DOUBLE-LEG TIE ══ -->
        <div v-if="match.leg2Result !== undefined" class="tie-card">
          <!-- Aggregate header -->
          <div class="tie-hd">
            <div class="tie-hd-team">
              <span class="cdot" :style="{ background: getTeam(match.homeId)?.color ?? '#ccc' }" />
              <span class="tie-hd-name">{{ getAbbr(match.homeId) }}</span>
            </div>
            <div class="tie-hd-center">
              <span
                v-if="aggLabel(match)"
                class="agg"
                :class="{ 'agg--decided': aggWinnerId(match) }"
              >
                {{ aggLabel(match) }}
              </span>
              <span v-else class="agg agg--tbd">agg</span>
              <span v-if="aggWinnerId(match)" class="agg-adv">
                {{ getAbbr(aggWinnerId(match)) }} advances
              </span>
            </div>
            <div class="tie-hd-team tie-hd-team--r">
              <span class="tie-hd-name">{{ getAbbr(match.awayId) }}</span>
              <span class="cdot" :style="{ background: getTeam(match.awayId)?.color ?? '#ccc' }" />
            </div>
            <button
              v-if="match.homeId && match.awayId"
              class="tie-sim"
              title="Simulate both legs"
              @click="$emit('sim-match', match._origRound, match._origMatch)"
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
                  <span
                    class="cdot"
                    :style="{ background: getTeam(match.homeId)?.color ?? '#ccc' }"
                  />
                  <TeamNameAuto :team="getTeam(match.homeId)" />
                </div>
                <div
                  class="leg-tr leg-tr--away"
                  :class="{
                    winner: legWinner(match.result, 'away'),
                    loser: !!match.result && !legWinner(match.result, 'away'),
                  }"
                >
                  <span
                    class="cdot"
                    :style="{ background: getTeam(match.awayId)?.color ?? '#ccc' }"
                  />
                  <TeamNameAuto :team="getTeam(match.awayId)" />
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
                    v-if="isEditing(match, 1)"
                    v-model.number="editHome"
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
                    v-if="isEditing(match, 1)"
                    v-model.number="editAway"
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
                <template v-if="isEditing(match, 1)">
                  <button class="abt ok" @click="saveResult(match, 1)"><Check :size="11" /></button>
                  <button class="abt" @click="cancelEdit"><X :size="11" /></button>
                </template>
                <template v-else>
                  <button class="abt" title="Edit" @click="startEdit(match, 1)">
                    <Pencil :size="11" />
                  </button>
                  <button
                    class="abt"
                    title="Simulate leg 1"
                    @click="$emit('sim-leg1', match._origRound, match._origMatch)"
                  >
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
                  <span
                    class="cdot"
                    :style="{ background: getTeam(match.awayId)?.color ?? '#ccc' }"
                  />
                  <TeamNameAuto :team="getTeam(match.awayId)" />
                </div>
                <div
                  class="leg-tr leg-tr--away"
                  :class="{
                    winner: legWinner(match.leg2Result, 'away'),
                    loser: !!match.leg2Result && !legWinner(match.leg2Result, 'away'),
                  }"
                >
                  <span
                    class="cdot"
                    :style="{ background: getTeam(match.homeId)?.color ?? '#ccc' }"
                  />
                  <TeamNameAuto :team="getTeam(match.homeId)" />
                </div>
              </div>
              <div v-if="match.homeId && match.awayId" class="leg-scores">
                <template v-if="isEditing(match, 2) && editMode === 'penalty'">
                  <div class="leg-sc">
                    <span class="pen-base">{{ editHome }}</span>
                    <input
                      v-model.number="editPenHome"
                      type="number"
                      min="0"
                      class="sinp sinp--pen"
                    />
                  </div>
                  <div class="leg-sc leg-sc--away">
                    <span class="pen-base">{{ editAway }}</span>
                    <input
                      v-model.number="editPenAway"
                      type="number"
                      min="0"
                      class="sinp sinp--pen"
                    />
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
                      v-if="isEditing(match, 2)"
                      v-model.number="editHome"
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
                      v-if="isEditing(match, 2)"
                      v-model.number="editAway"
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
                <template v-if="isEditing(match, 2)">
                  <button
                    class="abt ok"
                    :disabled="editMode === 'penalty' && editPenHome === editPenAway"
                    @click="editMode === 'penalty' ? savePenalties(match, 2) : saveResult(match, 2)"
                  >
                    <Check :size="11" />
                  </button>
                  <button class="abt" @click="cancelEdit"><X :size="11" /></button>
                </template>
                <template v-else>
                  <button
                    class="abt"
                    title="Edit"
                    :disabled="!match.result"
                    @click="match.result ? startEdit(match, 2) : undefined"
                  >
                    <Pencil :size="11" />
                  </button>
                  <button
                    class="abt"
                    title="Simulate leg 2"
                    :disabled="!match.result"
                    @click="
                      match.result
                        ? $emit('sim-leg2', match._origRound, match._origMatch)
                        : undefined
                    "
                  >
                    <Shuffle :size="11" />
                  </button>
                </template>
              </div>
            </div>
          </div>
        </div>

        <!-- ══ SINGLE-LEG MATCH ══ -->
        <div v-else class="mc" :class="{ 'mc--played': !!match.result }">
          <div class="mc-teams">
            <div
              class="mc-row"
              :class="{
                winner: match.result && getWinnerId(match) === match.homeId,
                loser: match.result && getWinnerId(match) !== match.homeId,
              }"
            >
              <span class="cdot" :style="{ background: getTeam(match.homeId)?.color ?? '#ccc' }" />
              <TeamNameAuto :team="getTeam(match.homeId)" />
            </div>
            <div
              class="mc-row mc-row--away"
              :class="{
                winner: match.result && getWinnerId(match) === match.awayId,
                loser: match.result && getWinnerId(match) !== match.awayId,
              }"
            >
              <span class="cdot" :style="{ background: getTeam(match.awayId)?.color ?? '#ccc' }" />
              <TeamNameAuto :team="getTeam(match.awayId)" />
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
                <template v-if="isEditing(match) && editMode === 'score'">
                  <input v-model.number="editHome" type="number" min="0" class="sinp" />
                </template>
                <template v-else-if="isEditing(match) && editMode === 'penalty'">
                  <span class="pen-base">{{ editHome }}</span>
                  <input
                    v-model.number="editPenHome"
                    type="number"
                    min="0"
                    class="sinp sinp--pen"
                  />
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
                <template v-if="isEditing(match) && editMode === 'score'">
                  <input v-model.number="editAway" type="number" min="0" class="sinp" />
                </template>
                <template v-else-if="isEditing(match) && editMode === 'penalty'">
                  <span class="pen-base">{{ editAway }}</span>
                  <input
                    v-model.number="editPenAway"
                    type="number"
                    min="0"
                    class="sinp sinp--pen"
                  />
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
              <template v-if="isEditing(match)">
                <button
                  class="abt ok"
                  :disabled="editMode === 'penalty' && editPenHome === editPenAway"
                  @click="editMode === 'penalty' ? savePenalties(match) : saveResult(match)"
                >
                  <Check :size="11" />
                </button>
                <button class="abt" @click="cancelEdit"><X :size="11" /></button>
              </template>
              <template v-else>
                <button class="abt" title="Edit" @click="startEdit(match)">
                  <Pencil :size="11" />
                </button>
                <button
                  class="abt"
                  title="Simulate"
                  @click="
                    match._isThirdPlace
                      ? $emit('sim-third-place')
                      : $emit('sim-match', match._origRound, match._origMatch)
                  "
                >
                  <Shuffle :size="11" />
                </button>
              </template>
            </div>
          </template>
        </div>
      </template>

      <div v-if="filteredMatches.length === 0" class="fv-empty">No matches yet.</div>
    </div>
  </div>
</template>

<style scoped>
/* ── Layout ── */
.fv {
  width: 100%;
}

.fv-tabs {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  padding: 0 12px 10px;
  border-bottom: 1px solid var(--border-light);
  margin-bottom: 12px;
}

.fv-tab {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 12px;
  border-radius: 99px;
  border: 1px solid var(--border-light);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  letter-spacing: 0.03em;
  transition:
    background 0.12s,
    color 0.12s,
    border-color 0.12s;
}
.fv-tab:hover:not(.active) {
  background: var(--bg);
  color: var(--text);
  border-color: var(--border);
}
.fv-tab.active {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}
.fv-tab.tp-tab.active {
  background: var(--accent-2);
  border-color: var(--accent-2);
}

.fv-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  padding: 0 12px 12px;
}
.fv-grid.solo {
  grid-template-columns: 1fr;
  max-width: 440px;
  margin: 0 auto;
}

@media (max-width: 580px) {
  .fv-grid {
    grid-template-columns: 1fr;
  }
}

.fv-empty {
  grid-column: 1 / -1;
  text-align: center;
  font-size: 13px;
  color: var(--text-muted);
  padding: 24px 0;
}

/* ── Single-leg match card ── */
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

/* ── Double-leg tie card ── */
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
.agg-adv {
  font-size: 9px;
  font-weight: 600;
  color: var(--accent);
  white-space: nowrap;
}

.tie-sim {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: 1px solid var(--border-light);
  border-radius: 3px;
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

/* ── Score chip ── */
.sc {
  font-weight: 700;
  font-size: 12px;
  background: color-mix(in srgb, var(--text-muted) 10%, var(--surface));
  border-radius: 3px;
  padding: 1px 5px;
  min-width: 18px;
  text-align: center;
  flex-shrink: 0;
  display: inline-flex;
  align-items: baseline;
  gap: 2px;
  animation: score-pop 0.22s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
.sc.tbd {
  color: var(--text-muted);
  font-weight: 400;
  background: transparent;
  animation: none;
}
.pen-sup {
  font-size: 9px;
  font-weight: 400;
  color: var(--text-muted);
}
.pen-base {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
  min-width: 10px;
  text-align: center;
  flex-shrink: 0;
}

/* ── Color dot ── */
.cdot {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 0 1.5px rgba(0, 0, 0, 0.08);
}

/* ── Number inputs ── */
.sinp {
  width: 26px;
  text-align: center;
  background: var(--bg);
  border: 1px solid var(--accent);
  border-radius: 3px;
  padding: 1px 2px;
  font-size: 12px;
  font-weight: 700;
  color: inherit;
  flex-shrink: 0;
  -moz-appearance: textfield;
  appearance: textfield;
  box-sizing: border-box;
}
.sinp--pen {
  width: 22px;
  font-size: 11px;
}
.sinp:focus {
  outline: none;
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 20%, transparent);
}
.sinp::-webkit-outer-spin-button,
.sinp::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

/* ── Action buttons ── */
.abt {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border: 1px solid var(--border-light);
  border-radius: 3px;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  flex-shrink: 0;
  padding: 0;
  transition:
    color 0.1s,
    border-color 0.1s,
    background 0.1s;
}
.abt:hover:not(:disabled) {
  color: var(--text);
  border-color: var(--border);
  background: color-mix(in srgb, var(--border) 30%, transparent);
}
.abt.ok {
  color: var(--success);
  border-color: color-mix(in srgb, var(--success) 40%, var(--border-light));
}
.abt.ok:hover:not(:disabled) {
  background: color-mix(in srgb, var(--success) 10%, transparent);
}
.abt:disabled {
  opacity: 0.25;
  cursor: default;
}
</style>
