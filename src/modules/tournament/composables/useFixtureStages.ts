import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import type { Round, Tournament } from "@/modules/tournament/types"
import { useEngineLabels } from "@/composables/useEngineLabels"
import {
  isBracketOnly,
  isGroupFormat,
  getLeaguePlayoffData,
  buildEmptyBracketRounds,
} from "@/engine"

/**
 * One entry in the unified Fixtures panel's stage picker — a knockout round,
 * a group's round, a league/tier matchday, or the third-place match. Every
 * format's fixtures reduce to this same flat, ordered list.
 *
 * A knockout/third-place stage can exist in the list before its matches do —
 * `ready: false` means it's a placeholder sized from how many teams will
 * eventually qualify, shown so the picker never hides where the bracket is
 * going, but with nothing to play yet.
 */
export type FixtureStage =
  | { kind: "knockout"; roundIdx: number; label: string; ready: boolean }
  | { kind: "third-place"; label: string; ready: boolean }
  | { kind: "group-week"; roundIdx: number; label: string }
  | { kind: "league"; tierIdx: number | null; matchdayIdx: number; label: string }

/** How many matches make up one round of a group, mirroring GroupCard.vue. */
function groupRoundCount(teamCount: number, matchCount: number): number {
  const perRound = Math.floor(teamCount / 2)
  return perRound < 1 ? 1 : Math.ceil(matchCount / perRound)
}

export function useFixtureStages(getTournament: () => Tournament) {
  const { t } = useI18n()
  const { engineLabel } = useEngineLabels()

  function knockoutStages(rounds: Round[], ready: boolean, hasThirdPlace: boolean): FixtureStage[] {
    const out: FixtureStage[] = rounds.map((r, ri) => ({
      kind: "knockout",
      roundIdx: ri,
      label: engineLabel(r.name),
      ready,
    }))
    if (hasThirdPlace) {
      out.push({ kind: "third-place", label: t("history.table.thirdPlace"), ready })
    }
    return out
  }

  /** A bracket sized from how many teams will eventually qualify — only for
   *  labels, so the picker can list "Semifinal", "Final" before the league
   *  playoff (whose rounds start out empty) has actually been seeded. */
  function placeholderBracket(qualifierCount: number): Round[] {
    const size = Math.pow(2, Math.ceil(Math.log2(Math.max(qualifierCount, 2))))
    return buildEmptyBracketRounds(size)
  }

  const stages = computed<FixtureStage[]>(() => {
    const tour = getTournament()
    const out: FixtureStage[] = []

    if (isBracketOnly(tour)) return knockoutStages(tour.rounds, true, !!tour.hasThirdPlace)

    if (isGroupFormat(tour)) {
      const groups = tour.groups ?? []
      const maxRounds = groups.reduce(
        (max, g) => Math.max(max, groupRoundCount(g.teamIds.length, g.matches.length)),
        0
      )
      for (let ri = 0; ri < maxRounds; ri++) {
        out.push({
          kind: "group-week",
          roundIdx: ri,
          label: t("tournament.fixtures.groupWeek", { n: ri + 1 }),
        })
      }
      // The bracket is pre-sized from qualifiersPerGroup/wildcards at
      // creation, so its rounds — and their names — already exist before
      // groupsDone; only the matches inside are still unplayable.
      out.push(...knockoutStages(tour.rounds, !!tour.groupsDone, !!tour.hasThirdPlace))
      return out
    }

    // League-like (league, swiss) — single or multi-tier.
    if (tour.tiers?.length) {
      tour.tiers.forEach((tier, ti) => {
        tier.league.matchdays.forEach((md, mi) => {
          out.push({
            kind: "league",
            tierIdx: ti,
            matchdayIdx: mi,
            label: `${engineLabel(tier.name)} — ${engineLabel(md.name)}`,
          })
        })
      })
    } else if (tour.league) {
      tour.league.matchdays.forEach((md, mi) => {
        out.push({ kind: "league", tierIdx: null, matchdayIdx: mi, label: engineLabel(md.name) })
      })
    }
    const playoff = getLeaguePlayoffData(tour)
    if (playoff?.enabled) {
      const rounds = playoff.started ? tour.rounds : placeholderBracket(playoff.qualifierCount)
      out.push(...knockoutStages(rounds, playoff.started, !!tour.hasThirdPlace))
    }
    return out
  })

  function isStageDone(tour: Tournament, stage: FixtureStage): boolean {
    if (stage.kind === "knockout") {
      if (!stage.ready) return false
      const round = tour.rounds[stage.roundIdx]
      return !!round && round.matches.every((m) => !!m.result)
    }
    if (stage.kind === "third-place") return stage.ready && !!tour.thirdPlaceMatch?.result
    if (stage.kind === "group-week") {
      return (tour.groups ?? []).every((group) => {
        const perRound = Math.floor(group.teamIds.length / 2) || group.matches.length
        const start = stage.roundIdx * perRound
        const slice = group.matches.slice(start, start + perRound)
        return slice.every((m) => !!m.result)
      })
    }
    const md =
      stage.tierIdx === null
        ? tour.league?.matchdays[stage.matchdayIdx]
        : tour.tiers?.[stage.tierIdx]?.league.matchdays[stage.matchdayIdx]
    return !md || md.matches.every((m) => !!m.result)
  }

  function defaultIdx(): number {
    const tour = getTournament()
    const list = stages.value
    const firstUnplayed = list.findIndex((s) => !isStageDone(tour, s))
    return firstUnplayed === -1 ? Math.max(0, list.length - 1) : firstUnplayed
  }

  const selectedIdx = ref(defaultIdx())

  // A new season / different tournament resets to the first unplayed stage.
  watch(
    () => getTournament().id,
    () => {
      selectedIdx.value = defaultIdx()
    }
  )

  // A stage list can grow (groups seed the bracket, playoff starts) or shrink
  // mid-session — keep the index in range instead of pointing past the end.
  watch(
    () => stages.value.length,
    (len) => {
      if (selectedIdx.value >= len) selectedIdx.value = Math.max(0, len - 1)
    }
  )

  const selectedStage = computed<FixtureStage | undefined>(() => stages.value[selectedIdx.value])

  const options = computed(() => stages.value.map((s, i) => ({ value: String(i), label: s.label })))

  const isFirst = computed(() => selectedIdx.value <= 0)
  const isLast = computed(() => selectedIdx.value >= stages.value.length - 1)

  function goPrev() {
    if (!isFirst.value) selectedIdx.value--
  }
  function goNext() {
    if (!isLast.value) selectedIdx.value++
  }

  return {
    stages,
    selectedIdx,
    selectedStage,
    options,
    isFirst,
    isLast,
    goPrev,
    goNext,
    isStageDone: (stage: FixtureStage) => isStageDone(getTournament(), stage),
  }
}
