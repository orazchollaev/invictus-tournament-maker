<script setup lang="ts">
/**
 * One leg of a two-legged tie, on one line.
 *
 * It used to stack the two teams vertically, which meant a tie repeated both
 * names four times — twice in the card header, twice per leg — inside a 26px
 * row that truncated them anyway. The header already answers "who is playing";
 * a leg only has to answer "which way round, and what was the score". So this
 * is the same shape LeagueMatchRow uses for a single fixture: side, score,
 * side — with the leg number in front of it.
 */
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
  /** Side shown first — leg 2 is played with the fixture reversed. */
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

const homeTeam = computed(() => getTeam(props.homeId))
const awayTeam = computed(() => getTeam(props.awayId))

function isLegWinner(side: "home" | "away"): boolean {
  const r = props.result
  if (!r) return false
  return side === "home" ? r.home > r.away : r.away > r.home
}

const hasPen = computed(() => !!props.result && props.result.penHome !== undefined)

const editing = ref(false)
const canEdit = computed(() => !!props.match.homeId && !!props.match.awayId && !props.disabled)

/** Only the deciding leg offers a shootout. */
const requiresWinner = computed(() => props.leg === 2)
</script>

<template>
  <div class="leg" :class="{ 'leg--locked': disabled, 'leg--played': !!result }">
    <button
      class="leg-open"
      type="button"
      :disabled="!canEdit"
      :aria-label="`Set leg ${leg} result`"
      @click="editing = true"
    >
      <span class="leg-no">L{{ leg }}</span>

      <span class="leg-side leg-side--home" :class="{ dim: !!result && !isLegWinner('home') }">
        <TeamBadge :team="homeTeam" :size="15" reverse />
      </span>

      <span class="leg-score" :class="{ 'leg-score--tbd': !result }">
        <template v-if="result">
          <span class="sc-half" :class="{ lead: isLegWinner('home') }">{{ result.home }}</span>
          <span class="sc-sep">–</span>
          <span class="sc-half" :class="{ lead: isLegWinner('away') }">{{ result.away }}</span>
          <span v-if="hasPen" class="pen-sup">({{ result!.penHome }}-{{ result!.penAway }}p)</span>
        </template>
        <template v-else>vs</template>
      </span>

      <span class="leg-side leg-side--away" :class="{ dim: !!result && !isLegWinner('away') }">
        <TeamBadge :team="awayTeam" :size="15" />
      </span>
    </button>

    <span class="leg-report">
      <MatchStatsButton
        :home-team="homeTeam"
        :away-team="awayTeam"
        :result="result"
        :subtitle="`Leg ${leg}`"
        size="xs"
      />
    </span>

    <!-- Inside the row, so the component keeps a single root element. -->
    <MatchScoreModal
      v-if="editing && canEdit"
      :home-team="homeTeam"
      :away-team="awayTeam"
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
