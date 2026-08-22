<script setup lang="ts">
import { computed, ref } from "vue"
import type { Team } from "@/modules/teams/types"
import type { MatchResult } from "../../types"
import TeamBadge from "@/modules/teams/components/TeamBadge.vue"
import MatchScoreModal from "../MatchScoreModal.vue"
import MatchStatsButton from "../match-stats/MatchStatsButton.vue"
import type { FlatMatch } from "./types"

const props = defineProps<{
  match: FlatMatch
  leg: 1 | 2
  /** Side shown on top — leg 2 is played with the fixture reversed. */
  homeId: string | null
  awayId: string | null
  result: MatchResult | null | undefined
  teams: Team[]
  /** Leg 2 cannot be entered before leg 1 has a result. */
  disabled?: boolean
  /** Leg 2 only: leg 1's score, in this row's home/away frame, to judge level on aggregate. */
  aggregateOffset?: { home: number; away: number } | null
}>()

const emit = defineEmits<{
  "set-result": [leg: 1 | 2, home: number, away: number, penHome?: number, penAway?: number]
  "clear-result": [leg: 1 | 2]
  sim: [leg: 1 | 2]
}>()

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

/* A leg row is 26px tall, so the score is entered in the modal. */
const editing = ref(false)
const canEdit = computed(() => !!props.match.homeId && !!props.match.awayId && !props.disabled)

/** Only the deciding leg offers a shootout. */
const requiresWinner = computed(() => props.leg === 2)
</script>

<template>
  <div class="leg" :class="{ 'leg--locked': disabled }">
    <button
      class="leg-open"
      type="button"
      :disabled="!canEdit"
      :aria-label="`Set leg ${leg} result`"
      @click="editing = true"
    >
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
        <div class="leg-sc" :class="sideClass('home')">
          <span class="sc" :class="{ tbd: !result }">{{ result?.home ?? "–" }}</span>
          <span v-if="hasPen()" class="pen-sup">[{{ result!.penHome }}p]</span>
        </div>
        <div class="leg-sc leg-sc--away" :class="sideClass('away')">
          <span class="sc" :class="{ tbd: !result }">{{ result?.away ?? "–" }}</span>
          <span v-if="hasPen()" class="pen-sup">[{{ result!.penAway }}p]</span>
        </div>
      </div>
    </button>

    <span v-if="result?.stats" class="leg-report">
      <MatchStatsButton
        :home-team="getTeam(homeId)"
        :away-team="getTeam(awayId)"
        :result="result"
        :subtitle="`Leg ${leg}`"
        size="xs"
      />
    </span>

    <!-- Inside the row, so the component keeps a single root element. -->
    <MatchScoreModal
      v-if="editing && canEdit"
      :home-team="getTeam(homeId)"
      :away-team="getTeam(awayId)"
      :result="result"
      :subtitle="`Leg ${leg}`"
      :requires-winner="requiresWinner"
      :aggregate-offset="leg === 2 ? aggregateOffset : null"
      @save="(h, a, ph, pa) => emit('set-result', leg, h, a, ph, pa)"
      @simulate="emit('sim', leg)"
      @clear="emit('clear-result', leg)"
      @close="editing = false"
    />
  </div>
</template>

<style scoped src="../match-card-shared.css"></style>
<style scoped src="./fixture-leg-row.css"></style>
<style scoped>
.leg-report {
  display: flex;
  align-items: center;
  padding-inline: var(--sp-1);
  border-inline-start: 1px solid var(--border-light);
}
</style>
