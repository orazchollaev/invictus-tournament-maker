<script setup lang="ts">
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { ChevronLeft, ChevronRight, Shuffle } from "@lucide/vue"
import type { Tournament, GroupMatch } from "@/modules/tournament/types"
import type { Team } from "@/modules/teams/types"
import { getLeaguePlayoffData, isGroupFormat as isGroupFormatFn } from "@/engine"
import { useTournamentStore } from "@/modules/tournament/store"
import { useSettingsStore } from "@/modules/settings/store"
import { useGradualSim } from "@/modules/tournament/composables/useGradualSim"
import { useBracketActions } from "@/modules/tournament/composables/useBracketActions"
import { useFixtureStages } from "@/modules/tournament/composables/useFixtureStages"
import { useTeamLookup } from "@/composables/useTeamLookup"
import { useEngineLabels } from "@/composables/useEngineLabels"
import { AppSelect, AppButton, AppIcon } from "@/components/ui"
import { LeagueMatchRow } from "@/modules/tournament/components/league"
import FixtureMatchCard from "./FixtureMatchCard.vue"
import FixtureTieCard from "./FixtureTieCard.vue"
import type { FlatMatch } from "./types"

const props = defineProps<{ tournament: Tournament; teams: Team[] }>()

const { t } = useI18n()
const { engineLabel } = useEngineLabels()
const store = useTournamentStore()
const settings = useSettingsStore()
const { runSequential } = useGradualSim()
const { teamById } = useTeamLookup(() => props.teams)
const bracketActions = useBracketActions(() => props.tournament.id)

const isGroupFormat = computed(() => isGroupFormatFn(props.tournament))
const leaguePlayoffData = computed(() => getLeaguePlayoffData(props.tournament))

const { selectedIdx, selectedStage, options, isFirst, isLast, goPrev, goNext } = useFixtureStages(
  () => props.tournament
)

const stageModel = computed<string>({
  get: () => String(selectedIdx.value),
  set: (v) => (selectedIdx.value = Number(v)),
})

// ── Normalize the selected stage into flat match lists ─────────────────
type SimpleRow = { match: GroupMatch; mi: number }
type GroupWeekSection = { groupIdx: number; groupName: string; rows: SimpleRow[] }

const groupWeekSections = computed<GroupWeekSection[]>(() => {
  const stage = selectedStage.value
  if (!stage || stage.kind !== "group-week") return []
  return (props.tournament.groups ?? [])
    .map((group, gi) => {
      const perRound = Math.floor(group.teamIds.length / 2) || group.matches.length
      const start = stage.roundIdx * perRound
      const rows = group.matches
        .slice(start, start + perRound)
        .map((match, j) => ({ match, mi: start + j }))
      return { groupIdx: gi, groupName: engineLabel(group.name), rows }
    })
    .filter((section) => section.rows.length > 0)
})

const leagueRows = computed<SimpleRow[]>(() => {
  const stage = selectedStage.value
  if (!stage || stage.kind !== "league") return []
  const md =
    stage.tierIdx === null
      ? props.tournament.league?.matchdays[stage.matchdayIdx]
      : props.tournament.tiers?.[stage.tierIdx]?.league.matchdays[stage.matchdayIdx]
  return (md?.matches ?? []).map((match, mi) => ({ match, mi }))
})

// True once the selected knockout/third-place stage has real matches to show
// (group-week/league stages always do — only the bracket can be a
// not-yet-seeded placeholder).
const stageReady = computed(() => {
  const stage = selectedStage.value
  if (stage?.kind === "knockout" || stage?.kind === "third-place") return stage.ready
  return true
})

const knockoutLockedMessage = computed(() =>
  t(
    isGroupFormat.value
      ? "tournament.locked.bracketNeedsGroups"
      : "tournament.locked.bracketNeedsPlayoff"
  )
)

const knockoutMatches = computed<FlatMatch[]>(() => {
  const stage = selectedStage.value
  if (!stage || !stageReady.value) return []
  if (stage.kind === "third-place") {
    const tp = props.tournament.thirdPlaceMatch
    return tp ? [{ ...tp, _origRound: -1, _origMatch: -1, _isThirdPlace: true }] : []
  }
  if (stage.kind !== "knockout") return []
  return (props.tournament.rounds[stage.roundIdx]?.matches ?? []).map((m, mi) => ({
    ...m,
    _origRound: stage.roundIdx,
    _origMatch: mi,
  }))
})

const stageLocked = computed(() => {
  const stage = selectedStage.value
  if (!stage) return false
  if (stage.kind === "group-week") return !!props.tournament.groupsDone
  if (stage.kind === "league") {
    if (stage.tierIdx !== null && stage.tierIdx !== 0) return false
    return !!leaguePlayoffData.value?.started
  }
  return false
})

const stageDone = computed(() => {
  const stage = selectedStage.value
  if (!stage) return false
  if (stage.kind === "group-week") {
    return groupWeekSections.value.every((s) => s.rows.every((r) => !!r.match.result))
  }
  if (stage.kind === "league") return leagueRows.value.every((r) => !!r.match.result)
  return knockoutMatches.value.every((m) => !!m.result)
})

// ── League result entry ──────────────────────────────────────────────
function setLeagueRowResult(mi: number, home: number, away: number) {
  const stage = selectedStage.value
  if (!stage || stage.kind !== "league") return
  if (stage.tierIdx === null)
    store.setLeagueResult(props.tournament.id, stage.matchdayIdx, mi, home, away)
  else store.setTierResult(props.tournament.id, stage.tierIdx, stage.matchdayIdx, mi, home, away)
}

function clearLeagueRowResult(mi: number) {
  const stage = selectedStage.value
  if (!stage || stage.kind !== "league") return
  if (stage.tierIdx === null) store.clearLeagueResult(props.tournament.id, stage.matchdayIdx, mi)
  else store.clearTierResult(props.tournament.id, stage.tierIdx, stage.matchdayIdx, mi)
}

function simLeagueRow(mi: number) {
  const stage = selectedStage.value
  if (!stage || stage.kind !== "league") return
  if (stage.tierIdx === null) store.simLeagueMatch(props.tournament.id, stage.matchdayIdx, mi)
  else store.simTierMatch(props.tournament.id, stage.tierIdx, stage.matchdayIdx, mi)
}

// ── Group result entry ───────────────────────────────────────────────
function setGroupRowResult(gi: number, mi: number, home: number, away: number) {
  store.setGroupResult(props.tournament.id, gi, mi, home, away)
}
function clearGroupRowResult(gi: number, mi: number) {
  store.clearGroupResult(props.tournament.id, gi, mi)
}
function simGroupRow(gi: number, mi: number) {
  store.simGroupMatch(props.tournament.id, gi, mi)
}

// ── Knockout result entry (mirrors the old FixtureView.vue) ────────────
function onSetResult(
  match: FlatMatch,
  home: number,
  away: number,
  penHome?: number,
  penAway?: number
) {
  if (match._isThirdPlace) bracketActions.onSetThirdPlaceResult(home, away, penHome, penAway)
  else bracketActions.onSetResult(match._origRound, match._origMatch, home, away, penHome, penAway)
}

function onClearResult(match: FlatMatch) {
  if (match._isThirdPlace) bracketActions.onClearThirdPlaceResult()
  else bracketActions.onClearResult(match._origRound, match._origMatch)
}

function onSetTieResult(
  match: FlatMatch,
  leg: 1 | 2,
  home: number,
  away: number,
  penHome?: number,
  penAway?: number
) {
  if (leg === 2) {
    if (match._isThirdPlace) bracketActions.onSetThirdPlaceLeg2Result(home, away, penHome, penAway)
    else
      bracketActions.onSetLeg2Result(
        match._origRound,
        match._origMatch,
        home,
        away,
        penHome,
        penAway
      )
  } else {
    onSetResult(match, home, away, penHome, penAway)
  }
}

function onClearTieResult(match: FlatMatch, leg: 1 | 2) {
  if (leg === 2) {
    if (match._isThirdPlace) bracketActions.onClearThirdPlaceLeg2Result()
    else bracketActions.onClearLeg2Result(match._origRound, match._origMatch)
  } else {
    onClearResult(match)
  }
}

function simKnockoutMatch(match: FlatMatch) {
  if (match._isThirdPlace) bracketActions.onSimThirdPlace()
  else bracketActions.onSimMatch(match._origRound, match._origMatch)
}

function simTieLeg(match: FlatMatch, leg: 1 | 2) {
  if (match._isThirdPlace) {
    if (leg === 1) bracketActions.onSimThirdPlaceLeg1()
    else bracketActions.onSimThirdPlaceLeg2()
  } else if (leg === 1) {
    bracketActions.onSimLeg1(match._origRound, match._origMatch)
  } else {
    bracketActions.onSimLeg2(match._origRound, match._origMatch)
  }
}

// ── "Simulate this stage" ───────────────────────────────────────────────
async function simStage() {
  const stage = selectedStage.value
  if (!stage || stageLocked.value || !stageReady.value) return

  if (stage.kind === "knockout") {
    const round = props.tournament.rounds[stage.roundIdx]
    if (!round) return
    const cbs = round.matches
      .map((m, mi) => ({ m, mi }))
      .filter(({ m }) => m.homeId && m.awayId && (!m.result || m.leg2Result === null))
      .map(
        ({ mi }) =>
          () =>
            bracketActions.onSimMatch(stage.roundIdx, mi)
      )
    await runSequential(cbs)
  } else if (stage.kind === "third-place") {
    bracketActions.onSimThirdPlace()
  } else if (stage.kind === "group-week") {
    const cbs = groupWeekSections.value.flatMap((section) =>
      section.rows
        .filter((r) => !r.match.result)
        .map((r) => () => simGroupRow(section.groupIdx, r.mi))
    )
    await runSequential(cbs)
  } else {
    const cbs = leagueRows.value.filter((r) => !r.match.result).map((r) => () => simLeagueRow(r.mi))
    await runSequential(cbs)
  }

  if (settings.autoAdvanceFixtureStage && !isLast.value) goNext()
}
</script>

<template>
  <div class="fp">
    <div class="fp-nav">
      <AppSelect v-model="stageModel" class="fp-select" size="sm" :options="options" />

      <AppButton
        v-if="!stageLocked && stageReady"
        icon-only
        variant="outlined"
        size="sm"
        :disabled="stageDone"
        :aria-label="t('tournament.fixtures.simulateStage')"
        :title="t('tournament.fixtures.simulateStage')"
        @click="simStage"
      >
        <AppIcon :icon="Shuffle" size="sm" />
      </AppButton>

      <AppButton
        icon-only
        variant="outlined"
        size="sm"
        :disabled="isFirst"
        :aria-label="t('common.back')"
        @click="goPrev"
      >
        <AppIcon :icon="ChevronLeft" size="sm" />
      </AppButton>
      <AppButton
        icon-only
        variant="outlined"
        size="sm"
        :disabled="isLast"
        :aria-label="t('common.next')"
        @click="goNext"
      >
        <AppIcon :icon="ChevronRight" size="sm" />
      </AppButton>
    </div>

    <div v-if="selectedStage" class="fp-body">
      <template v-if="selectedStage.kind === 'group-week'">
        <div v-for="section in groupWeekSections" :key="section.groupIdx" class="fp-group-section">
          <div class="fp-group-label">{{ section.groupName }}</div>
          <div class="fp-rows">
            <LeagueMatchRow
              v-for="row in section.rows"
              :key="row.match.id"
              :home-team="teamById(row.match.homeId)"
              :away-team="teamById(row.match.awayId)"
              :result="row.match.result"
              :match-id="row.match.id"
              :label="section.groupName"
              :locked="stageLocked"
              @save="(h, a) => setGroupRowResult(section.groupIdx, row.mi, h, a)"
              @clear="clearGroupRowResult(section.groupIdx, row.mi)"
              @sim="simGroupRow(section.groupIdx, row.mi)"
            />
          </div>
        </div>
        <div v-if="!groupWeekSections.length" class="empty-inline">
          {{ t("tournament.noFixtures") }}
        </div>
      </template>

      <template v-else-if="selectedStage.kind === 'league'">
        <div class="fp-rows">
          <LeagueMatchRow
            v-for="row in leagueRows"
            :key="row.match.id"
            :home-team="teamById(row.match.homeId)"
            :away-team="teamById(row.match.awayId)"
            :result="row.match.result"
            :match-id="row.match.id"
            :label="selectedStage.label"
            :locked="stageLocked"
            @save="(h, a) => setLeagueRowResult(row.mi, h, a)"
            @clear="clearLeagueRowResult(row.mi)"
            @sim="simLeagueRow(row.mi)"
          />
          <div v-if="!leagueRows.length" class="empty-inline">
            {{ t("tournament.noFixtures") }}
          </div>
        </div>
      </template>

      <template v-else>
        <div v-if="!stageReady" class="locked-panel">
          {{ knockoutLockedMessage }}
        </div>
        <div v-else class="fp-rows">
          <template v-for="match in knockoutMatches" :key="match.id">
            <FixtureTieCard
              v-if="match.leg2Result !== undefined"
              :match="match"
              :teams="teams"
              @set-result="onSetTieResult"
              @clear-result="onClearTieResult"
              @sim-leg1="(m) => simTieLeg(m, 1)"
              @sim-leg2="(m) => simTieLeg(m, 2)"
            />
            <FixtureMatchCard
              v-else
              :match="match"
              :teams="teams"
              @set-result="onSetResult"
              @clear-result="onClearResult"
              @sim="simKnockoutMatch"
            />
          </template>
          <div v-if="!knockoutMatches.length" class="empty-inline">
            {{ t("tournament.noFixtures") }}
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.fp {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

.fp-nav {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}

/* Only the select gives up width — the icon buttons keep their square box. */
.fp-nav > .btn {
  flex-shrink: 0;
}

.fp-select {
  flex: 1;
  min-width: 0;
}

.fp-body {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

.fp-group-section {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
}

.fp-group-label {
  font-size: var(--fs-xs);
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
  padding: 0 var(--sp-1);
}

.fp-rows {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-width: 520px;
  margin: 0 auto;
  width: 100%;
}

.locked-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 160px;
  padding: var(--sp-4);
  text-align: center;
  color: var(--text-muted);
  font-size: var(--fs-sm);
}
</style>
