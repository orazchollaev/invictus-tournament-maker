<script setup lang="ts">
import { ref } from "vue"
import { useI18n } from "vue-i18n"
import type { Team } from "@/modules/teams/types"
import TeamBadge from "@/modules/teams/components/TeamBadge.vue"
import MatchScoreModal from "../match-stats/MatchScoreModal.vue"
import MatchStatsButton from "../match-stats/MatchStatsButton.vue"
import type { FlatMatch } from "./types"

const props = defineProps<{ match: FlatMatch; teams: Team[] }>()

const { t } = useI18n()
const emit = defineEmits<{
  "set-result": [match: FlatMatch, home: number, away: number, penHome?: number, penAway?: number]
  "clear-result": [match: FlatMatch]
  sim: [match: FlatMatch]
}>()

function getTeam(id: string | null): Team | null {
  if (!id) return null
  return props.teams.find((t) => t.id === id) ?? null
}

/* Same one-line row shape Group and League fixtures use — the score button is
   the whole edit affordance, so entry happens in the shared modal. */
const editing = ref(false)

function scoreAccentColor(): string {
  const r = props.match.result
  if (!r) return ""
  if (r.home > r.away) return getTeam(props.match.homeId)?.color ?? ""
  if (r.away > r.home) return getTeam(props.match.awayId)?.color ?? ""
  return "var(--border)"
}
</script>

<template>
  <div class="fm-match">
    <TeamBadge :team="getTeam(match.homeId)" :size="16" reverse class="fx-team fx-team--home" />

    <button
      class="fx-score-btn"
      :class="{ 'fx-score-btn--played': !!match.result }"
      :style="match.result ? { borderColor: scoreAccentColor(), borderLeftWidth: '3px' } : {}"
      :disabled="!match.homeId || !match.awayId"
      @click="editing = true"
    >
      <template v-if="match.result">
        {{ match.result.home }} – {{ match.result.away }}
        <span v-if="match.result.ft" class="pen-sup">({{ t("matchStats.aet") }})</span>
        <span v-if="match.result.penHome !== undefined" class="pen-sup">
          ({{ match.result.penHome }}-{{ match.result.penAway }}p)
        </span>
      </template>
      <template v-else>vs</template>
    </button>

    <TeamBadge :team="getTeam(match.awayId)" :size="16" class="fx-team fx-team--away" />

    <span class="fx-report">
      <MatchStatsButton
        :home-team="getTeam(match.homeId)"
        :away-team="getTeam(match.awayId)"
        :result="match.result"
        size="xs"
      />
    </span>

    <MatchScoreModal
      v-if="editing && match.homeId && match.awayId"
      :home-team="getTeam(match.homeId)"
      :away-team="getTeam(match.awayId)"
      :result="match.result"
      :match-id="match.id"
      requires-winner
      @save="(h, a, ph, pa) => emit('set-result', match, h, a, ph, pa)"
      @simulate="emit('sim', match)"
      @clear="emit('clear-result', match)"
      @close="editing = false"
    />
  </div>
</template>

<style scoped src="./fixture-row.css"></style>
<style scoped>
/* Mirrors LeagueMatchRow / GroupCard's .gs-match — the same row shape across
   League, Group and Bracket fixture lists, instead of a boxed card that only
   this view used. */
.fm-match {
  display: grid;
  grid-template-columns: 1fr auto 1fr 18px;
  align-items: center;
  gap: var(--sp-2);
  font-size: var(--fs-base);
  padding: var(--sp-1);
  min-width: 0;
}
</style>
