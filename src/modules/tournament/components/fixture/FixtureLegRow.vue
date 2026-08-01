<script setup lang="ts">
import type { Team } from "@/modules/teams/types"
import type { MatchResult } from "../../types"
import TeamBadge from "@/modules/teams/components/TeamBadge.vue"
import { Check, Pencil, Shuffle, X } from "@lucide/vue"
import type { FlatMatch, MatchEditor } from "./useMatchEditor"

const props = defineProps<{
  match: FlatMatch
  leg: 1 | 2
  /** Side shown on top — leg 2 is played with the fixture reversed. */
  homeId: string | null
  awayId: string | null
  result: MatchResult | null | undefined
  teams: Team[]
  editor: MatchEditor
  /** Leg 2 cannot be entered before leg 1 has a result. */
  disabled?: boolean
}>()

defineEmits<{
  save: [leg: 1 | 2]
  "save-pens": [leg: 1 | 2]
  sim: [leg: 1 | 2]
}>()

/** Only the deciding leg offers a shootout. */
const canEnterPenalties = props.leg === 2

function getTeam(id: string | null): Team | null {
  if (!id) return null
  return props.teams.find((t) => t.id === id) ?? null
}

function isLegWinner(side: "home" | "away"): boolean {
  const r = props.result
  if (!r) return false
  return side === "home" ? r.home > r.away : r.away > r.home
}

function sideClass(side: "home" | "away") {
  return { winner: isLegWinner(side), loser: !!props.result && !isLegWinner(side) }
}

function hasPen(): boolean {
  return !!props.result && props.result.penHome !== undefined
}
</script>

<!-- eslint-disable vue/no-mutating-props -- `editor` is a shared reactive store object owned by FixtureView; mutating its fields is the intended contract -->
<template>
  <div class="leg" :class="{ 'leg--locked': disabled }">
    <div class="leg-label">L{{ leg }}</div>

    <div class="leg-teams">
      <div class="leg-tr" :class="sideClass('home')">
        <TeamBadge :team="getTeam(homeId)" />
      </div>
      <div class="leg-tr leg-tr--away" :class="sideClass('away')">
        <TeamBadge :team="getTeam(awayId)" />
      </div>
    </div>

    <div v-if="match.homeId && match.awayId" class="leg-scores">
      <template
        v-if="canEnterPenalties && editor.isEditing(match, leg) && editor.mode === 'penalty'"
      >
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
        <div class="leg-sc" :class="sideClass('home')">
          <input
            v-if="editor.isEditing(match, leg)"
            v-model.number="editor.home"
            type="number"
            min="0"
            class="sinp"
          />
          <template v-else>
            <span class="sc" :class="{ tbd: !result }">{{ result?.home ?? "–" }}</span>
            <span v-if="hasPen()" class="pen-sup">[{{ result!.penHome }}p]</span>
          </template>
        </div>
        <div class="leg-sc leg-sc--away" :class="sideClass('away')">
          <input
            v-if="editor.isEditing(match, leg)"
            v-model.number="editor.away"
            type="number"
            min="0"
            class="sinp"
          />
          <template v-else>
            <span class="sc" :class="{ tbd: !result }">{{ result?.away ?? "–" }}</span>
            <span v-if="hasPen()" class="pen-sup">[{{ result!.penAway }}p]</span>
          </template>
        </div>
      </template>
    </div>

    <div v-if="match.homeId && match.awayId" class="leg-acts">
      <template v-if="editor.isEditing(match, leg)">
        <button
          class="abt ok"
          :disabled="editor.mode === 'penalty' && editor.penHome === editor.penAway"
          @click="
            editor.mode === 'penalty' && canEnterPenalties
              ? $emit('save-pens', leg)
              : $emit('save', leg)
          "
        >
          <Check :size="11" />
        </button>
        <button class="abt" @click="editor.cancel()"><X :size="11" /></button>
      </template>
      <template v-else>
        <button
          class="abt"
          title="Edit"
          :disabled="disabled"
          @click="disabled ? undefined : editor.startEdit(match, leg)"
        >
          <Pencil :size="11" />
        </button>
        <button
          class="abt"
          :title="`Simulate leg ${leg}`"
          :disabled="disabled"
          @click="disabled ? undefined : $emit('sim', leg)"
        >
          <Shuffle :size="11" />
        </button>
      </template>
    </div>
  </div>
</template>

<style scoped src="../match-card-shared.css"></style>
<style scoped src="./fixture-leg-row.css"></style>
