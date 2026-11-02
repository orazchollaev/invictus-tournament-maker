<script setup lang="ts">
import { computed, ref } from "vue"
import type { Tournament } from "@/modules/tournament/types"
import type { Team } from "@/modules/teams/types"
import { doubleElimLayout } from "@/engine"
import BracketMatchCard from "./BracketMatchCard.vue"
import { type DisplayMatch, reuseDisplayRounds } from "./bracketUtils"
import { useSettingsStore } from "@/modules/settings/store"
import { useEngineLabels } from "@/composables/useEngineLabels"

const props = defineProps<{ tournament: Tournament; teams: Team[]; isExporting?: boolean }>()
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
  "clear-result": [round: number, match: number]
  "clear-leg2-result": [round: number, match: number]
  "clear-third-place-result": []
  "sim-third-place": []
}>()

const settings = useSettingsStore()
const { engineLabel } = useEngineLabels()
const hoveredTeamId = ref<string | null>(null)

let lastDisplayRounds: DisplayMatch[][] | undefined
const displayRounds = computed(
  (): DisplayMatch[][] =>
    (lastDisplayRounds = reuseDisplayRounds(props.tournament.rounds, lastDisplayRounds))
)

/** The flat round array, cut into the three parts a double bracket reads as. */
const sections = computed(() => {
  const l = doubleElimLayout(props.tournament.rounds.length)
  const range = (from: number, to: number) =>
    Array.from({ length: Math.max(0, to - from) }, (_, i) => from + i)
  return [
    { key: "winners", rounds: range(0, l.losersStart) },
    { key: "losers", rounds: range(l.losersStart, l.grandFinal) },
    { key: "finals", rounds: range(l.grandFinal, l.reset + 1) },
  ] as const
})

function isDimmed(ri: number, mi: number): boolean {
  if (!settings.bracketHighlightOnHover || !hoveredTeamId.value) return false
  const m = displayRounds.value[ri]?.[mi]
  return m?.homeId !== hoveredTeamId.value && m?.awayId !== hoveredTeamId.value
}
</script>

<template>
  <div class="de-wrap">
    <section v-for="section in sections" :key="section.key" class="de-section">
      <div class="de-section-title" :class="`de-section-title--${section.key}`">
        {{ $t(`tournament.bracket.doubleElim.${section.key}`) }}
      </div>
      <div class="de-row">
        <div v-for="ri in section.rounds" :key="ri" class="de-col">
          <div
            class="de-round-title"
            :class="{ 'de-round-title--final': section.key === 'finals' }"
          >
            {{ engineLabel(tournament.rounds[ri].name) }}
          </div>
          <div class="de-matches">
            <BracketMatchCard
              v-for="(match, mi) in displayRounds[ri]"
              :key="match.id"
              :match="match"
              :teams="teams"
              :is-final="section.key === 'finals'"
              :is-exporting="isExporting"
              :dimmed="isDimmed(ri, mi)"
              @set-result="
                (h, a, ph, pa) =>
                  emit('set-result', match._origRound, match._origMatch, h, a, ph, pa)
              "
              @set-leg2-result="
                (h, a, ph, pa) =>
                  emit('set-leg2-result', match._origRound, match._origMatch, h, a, ph, pa)
              "
              @clear-result="emit('clear-result', match._origRound, match._origMatch)"
              @clear-leg2-result="emit('clear-leg2-result', match._origRound, match._origMatch)"
              @sim-match="emit('sim-match', match._origRound, match._origMatch)"
              @sim-leg1="emit('sim-leg1', match._origRound, match._origMatch)"
              @sim-leg2="emit('sim-leg2', match._origRound, match._origMatch)"
              @hover-team="(id) => (hoveredTeamId = id)"
            />
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.de-wrap {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
  width: fit-content;
  padding-bottom: 8px;
}
.de-section-title {
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  padding: 0 8px 6px;
  border-bottom: 1px solid var(--border-light);
  margin-bottom: var(--sp-2);
}
.de-section-title--winners {
  color: var(--accent);
}
.de-section-title--losers {
  color: var(--accent-2);
}
.de-section-title--finals {
  color: var(--gold);
}
.de-row {
  display: flex;
  align-items: stretch;
  gap: 32px;
}
.de-col {
  display: flex;
  flex-direction: column;
  width: 190px;
  flex-shrink: 0;
}
.de-round-title {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  padding: 4px 8px 8px;
  text-align: center;
  height: 28px;
  box-sizing: border-box;
  flex-shrink: 0;
}
.de-round-title--final {
  color: var(--gold);
}
.de-matches {
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  gap: 16px;
  flex: 1;
}
</style>
