<script setup lang="ts">
/**
 * One leg of a two-legged tie, styled as the same row FixtureMatchCard uses
 * for a single fixture — side, score button, side — with just a small leg
 * marker in front, so a tie reads as two ordinary fixtures stacked, not a
 * different kind of card.
 */
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import type { Team } from "@/modules/teams/types"
import type { MatchResult } from "../../types"
import TeamBadge from "@/modules/teams/components/TeamBadge.vue"
import MatchScoreModal from "../match-stats/MatchScoreModal.vue"
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

const { t } = useI18n()

function getTeam(id: string | null): Team | null {
  if (!id) return null
  return props.teams.find((t) => t.id === id) ?? null
}

const homeTeam = computed(() => getTeam(props.homeId))
const awayTeam = computed(() => getTeam(props.awayId))

function scoreAccentColor(): string {
  const r = props.result
  if (!r) return ""
  if (r.home > r.away) return homeTeam.value?.color ?? ""
  if (r.away > r.home) return awayTeam.value?.color ?? ""
  return "var(--border)"
}

const editing = ref(false)
const canEdit = computed(() => !!props.match.homeId && !!props.match.awayId && !props.disabled)

/** Only the deciding leg offers a shootout. */
const requiresWinner = computed(() => props.leg === 2)
</script>

<template>
  <div class="leg" :class="{ 'leg--locked': disabled }">
    <span class="leg-no">L{{ leg }}</span>

    <TeamBadge :team="homeTeam" :size="16" reverse class="fx-team fx-team--home" />

    <button
      class="fx-score-btn"
      :class="{ 'fx-score-btn--played': !!result }"
      :style="result ? { borderColor: scoreAccentColor(), borderLeftWidth: '3px' } : {}"
      :disabled="!canEdit"
      @click="editing = true"
    >
      <template v-if="result">
        {{ result.home }} – {{ result.away }}
        <span v-if="result.ft" class="pen-sup">({{ t("matchStats.aet") }})</span>
        <span v-if="result.penHome !== undefined" class="pen-sup">
          ({{ result.penHome }}-{{ result.penAway }}p)
        </span>
      </template>
      <template v-else>vs</template>
    </button>

    <TeamBadge :team="awayTeam" :size="16" class="fx-team fx-team--away" />

    <span class="fx-report">
      <MatchStatsButton
        :home-team="homeTeam"
        :away-team="awayTeam"
        :result="result"
        :subtitle="`Leg ${leg}`"
        size="xs"
      />
    </span>

    <MatchScoreModal
      v-if="editing && canEdit"
      :home-team="homeTeam"
      :away-team="awayTeam"
      :result="result"
      :subtitle="`Leg ${leg}`"
      :requires-winner="requiresWinner"
      :match-id="match.id"
      :leg="leg"
      :aggregate-offset="leg === 2 ? aggregateOffset : null"
      @save="(h, a, ph, pa) => emit('set-result', leg, h, a, ph, pa)"
      @simulate="emit('sim', leg)"
      @clear="emit('clear-result', leg)"
      @close="editing = false"
    />
  </div>
</template>

<style scoped src="./fixture-row.css"></style>
<style scoped>
.leg {
  display: grid;
  grid-template-columns: 18px 1fr auto 1fr 18px;
  align-items: center;
  gap: var(--sp-2);
  font-size: var(--fs-base);
  padding: var(--sp-1);
  min-width: 0;
}

/* Leg 2 before leg 1 is entered. Readable, not invisible — you should still
   be able to see who it is between. */
.leg--locked {
  opacity: 0.5;
  pointer-events: none;
}

/* Leg number reads as a marker, not as content — same weight as the round
   labels elsewhere in the fixture list. */
.leg-no {
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--text-muted);
  text-align: center;
}
</style>
