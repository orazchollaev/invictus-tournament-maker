<script setup lang="ts">
import { computed, ref } from "vue"
import { useRoute, RouterLink } from "vue-router"
import { useTournamentStore } from "@/modules/tournament/store"
import { useTeamsStore } from "@/modules/teams/store"
import type { Match } from "@/modules/tournament/types"
import { ArrowLeft, Trophy, Medal, BarChart3, Table2, Users } from "@lucide/vue"
import { useI18n } from "vue-i18n"
import ChampionsTab, { type ChampEntry } from "../components/ChampionsTab.vue"
import AllFinalsTab, { type FinalEntry } from "../components/AllFinalsTab.vue"
import LeagueSeasonsTab, { type LeagueSeasonEntry } from "../components/LeagueSeasonsTab.vue"
import LeagueAllTimeTab, { type AllTimeRow } from "../components/LeagueAllTimeTab.vue"
import StatisticsTab, { type HistoryStats } from "../components/StatisticsTab.vue"
import TeamStatsTab, { type TeamStatEntry } from "../components/TeamStatsTab.vue"

const route = useRoute()
const store = useTournamentStore()
const teamsStore = useTeamsStore()
const { t } = useI18n()

const name = computed(() => decodeURIComponent(route.params.name as string))

const allSeasons = computed(() =>
  store.tournaments.filter((t) => t.name === name.value).sort((a, b) => a.season - b.season)
)

const completedSeasons = computed(() =>
  allSeasons.value.filter((t) => store.isTournamentFinished(t.id))
)

const isLeagueSeries = computed(() => allSeasons.value[0]?.format === "league")

type TabId = "champions" | "finals" | "alltime" | "stats" | "teams"
const tab = ref<TabId>("champions")

function teamById(id: string | null | undefined) {
  if (!id) return null
  return teamsStore.teams.find((t) => t.id === id) ?? null
}

// ─── Champions ───────────────────────────────────────────────────
const champions = computed<ChampEntry[]>(() => {
  const map = new Map<string, { wins: number; finals: number }>()

  for (const t of completedSeasons.value) {
    if (!t.winnerId) continue
    const wId = t.winnerId

    const isLeague = t.format === "league" && (!!t.league || !!t.tiers?.length)

    const w = map.get(wId)
    if (w) {
      w.wins++
      if (!isLeague) w.finals++
    } else map.set(wId, { wins: 1, finals: isLeague ? 0 : 1 })

    if (isLeague) {
      const topStandings = t.tiers?.length ? t.tiers[0].league.standings : t.league?.standings
      const rId = topStandings?.[1]?.teamId
      if (rId && rId !== wId) {
        const r = map.get(rId)
        if (r) r.finals++
        else map.set(rId, { wins: 0, finals: 1 })
      }
    } else {
      const fm = t.rounds[t.rounds.length - 1]?.matches[0]
      if (fm) {
        const rId = fm.homeId === wId ? fm.awayId : fm.homeId
        if (rId && rId !== wId) {
          const r = map.get(rId)
          if (r) r.finals++
          else map.set(rId, { wins: 0, finals: 1 })
        }
      }
    }
  }

  return [...map.entries()]
    .map(([id, data]) => {
      const team = teamById(id)
      return { teamId: id, name: team?.name ?? "?", color: team?.color ?? "#888", ...data }
    })
    .sort((a, b) => b.wins - a.wins || b.finals - a.finals)
})

// ─── Finals ──────────────────────────────────────────────────────
// Always shows winner goals first, then loser goals.
function buildScore(fm: Match, winnerId: string | null): string {
  if (!fm.result) return "?"
  const winnerIsHome = fm.homeId === winnerId

  if (fm.leg2Result !== undefined && fm.leg2Result !== null) {
    // homeId aggregate = result.home (leg1 home) + leg2Result.away (leg2 away = homeId)
    const aggHome = fm.result.home + fm.leg2Result.away
    const aggAway = fm.result.away + fm.leg2Result.home
    const [w, l] = winnerIsHome ? [aggHome, aggAway] : [aggAway, aggHome]
    let pen = ""
    if (fm.leg2Result.penHome !== undefined && fm.leg2Result.penAway !== undefined) {
      // penAway = homeId's pens in leg2, penHome = awayId's pens in leg2
      const [pw, pl] = winnerIsHome
        ? [fm.leg2Result.penAway, fm.leg2Result.penHome]
        : [fm.leg2Result.penHome, fm.leg2Result.penAway]
      pen = ` (p: ${pw}–${pl})`
    }
    return `${w}–${l}${pen}`
  }

  const [w, l] = winnerIsHome ? [fm.result.home, fm.result.away] : [fm.result.away, fm.result.home]

  let pen = ""
  if (fm.result.penHome !== undefined && fm.result.penAway !== undefined) {
    const [pw, pl] = winnerIsHome
      ? [fm.result.penHome, fm.result.penAway]
      : [fm.result.penAway, fm.result.penHome]
    pen = ` (p: ${pw}–${pl})`
  }
  return `${w}–${l}${pen}`
}

const finals = computed<FinalEntry[]>(() =>
  completedSeasons.value.map((t) => {
    const fm = t.rounds[t.rounds.length - 1]?.matches[0]
    const champ = teamById(t.winnerId)
    const runnerId = fm ? (fm.homeId === t.winnerId ? fm.awayId : fm.homeId) : null
    const runner = teamById(runnerId)
    return {
      season: t.season,
      champName: champ?.name ?? "?",
      champColor: champ?.color ?? "#888",
      runnerName: runner?.name ?? "?",
      runnerColor: runner?.color ?? "#888",
      score: fm ? buildScore(fm, t.winnerId) : "?",
    }
  })
)

// ─── League Seasons ──────────────────────────────────────────────
const leagueSeasons = computed<LeagueSeasonEntry[]>(() =>
  completedSeasons.value.map((t) => {
    const getAt = (pos: number) => {
      const standings = t.tiers?.length ? t.tiers[0].league.standings : t.league?.standings
      if (!standings) return null
      const s = standings[pos]
      if (!s) return null
      const team = teamById(s.teamId)
      return { name: team?.name ?? "?", color: team?.color ?? "#888", pts: s.pts }
    }
    return { season: t.season, first: getAt(0), second: getAt(1), third: getAt(2) }
  })
)

// ─── League All-Time Table ────────────────────────────────────────
const allTimeRows = computed<AllTimeRow[]>(() => {
  const map = new Map<string, AllTimeRow>()
  for (const t of completedSeasons.value) {
    const allStandings = t.tiers?.length
      ? t.tiers.flatMap((tier) => tier.league.standings)
      : t.league?.standings
    if (!allStandings) continue
    for (const s of allStandings) {
      const team = teamById(s.teamId)
      const existing = map.get(s.teamId)
      if (existing) {
        existing.seasons++
        existing.played += s.played
        existing.won += s.won
        existing.drawn += s.drawn
        existing.lost += s.lost
        existing.gf += s.gf
        existing.ga += s.ga
        existing.gd += s.gd
        existing.pts += s.pts
        if (t.winnerId === s.teamId) existing.titles++
      } else {
        map.set(s.teamId, {
          teamId: s.teamId,
          name: team?.name ?? "?",
          color: team?.color ?? "#888",
          seasons: 1,
          titles: t.winnerId === s.teamId ? 1 : 0,
          played: s.played,
          won: s.won,
          drawn: s.drawn,
          lost: s.lost,
          gf: s.gf,
          ga: s.ga,
          gd: s.gd,
          pts: s.pts,
        })
      }
    }
  }
  return [...map.values()].sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)
})

// ─── Stats ───────────────────────────────────────────────────────
function knockoutGoals(m: Match): number {
  if (!m.result) return 0
  let g = m.result.home + m.result.away
  if (m.leg2Result) g += m.leg2Result.home + m.leg2Result.away
  return g
}

const stats = computed<HistoryStats>(() => {
  let totalMatches = 0
  let totalGoals = 0

  const teamGoals = new Map<string, number>()
  const teamCS = new Map<string, number>()
  let biggestWinDiff = 0
  let biggestWinEntry: HistoryStats["biggestWin"] = null

  function trackLeg(
    homeId: string | null | undefined,
    awayId: string | null | undefined,
    homeG: number,
    awayG: number
  ) {
    if (!homeId || !awayId) return
    teamGoals.set(homeId, (teamGoals.get(homeId) ?? 0) + homeG)
    teamGoals.set(awayId, (teamGoals.get(awayId) ?? 0) + awayG)
    if (awayG === 0) teamCS.set(homeId, (teamCS.get(homeId) ?? 0) + 1)
    if (homeG === 0) teamCS.set(awayId, (teamCS.get(awayId) ?? 0) + 1)
    const diff = Math.abs(homeG - awayG)
    if (diff > biggestWinDiff) {
      biggestWinDiff = diff
      const [wId, lId, wG, lG] =
        homeG > awayG ? [homeId, awayId, homeG, awayG] : [awayId, homeId, awayG, homeG]
      const w = teamById(wId)
      const l = teamById(lId)
      biggestWinEntry = {
        score: `${wG}–${lG}`,
        winnerName: w?.name ?? "?",
        winnerColor: w?.color ?? "#888",
        loserName: l?.name ?? "?",
        loserColor: l?.color ?? "#888",
      }
    }
  }

  for (const t of completedSeasons.value) {
    if (t.groups) {
      for (const group of t.groups) {
        for (const m of group.matches) {
          if (!m.result) continue
          totalMatches++
          totalGoals += m.result.home + m.result.away
          trackLeg(m.homeId, m.awayId, m.result.home, m.result.away)
        }
      }
    }
    for (const round of t.rounds) {
      for (const m of round.matches) {
        if (!m.result) continue
        totalMatches++
        totalGoals += knockoutGoals(m)
        trackLeg(m.homeId, m.awayId, m.result.home, m.result.away)
        if (m.leg2Result) {
          trackLeg(m.awayId, m.homeId, m.leg2Result.home, m.leg2Result.away)
        }
      }
    }
    const tp = t.thirdPlaceMatch
    if (tp?.result) {
      totalMatches++
      totalGoals += knockoutGoals(tp)
      trackLeg(tp.homeId, tp.awayId, tp.result.home, tp.result.away)
      if (tp.leg2Result) {
        trackLeg(tp.awayId, tp.homeId, tp.leg2Result.home, tp.leg2Result.away)
      }
    }
    if (t.league) {
      for (const matchday of t.league.matchdays) {
        for (const m of matchday.matches) {
          if (!m.result) continue
          totalMatches++
          totalGoals += m.result.home + m.result.away
          trackLeg(m.homeId, m.awayId, m.result.home, m.result.away)
        }
      }
    }
    for (const tier of t.tiers ?? []) {
      for (const matchday of tier.league.matchdays) {
        for (const m of matchday.matches) {
          if (!m.result) continue
          totalMatches++
          totalGoals += m.result.home + m.result.away
          trackLeg(m.homeId, m.awayId, m.result.home, m.result.away)
        }
      }
    }
  }

  // Top scoring team
  let topScoringTeam: HistoryStats["topScoringTeam"] = null
  if (teamGoals.size) {
    const [topId, topG] = [...teamGoals.entries()].reduce((a, b) => (b[1] > a[1] ? b : a))
    const t = teamById(topId)
    topScoringTeam = { name: t?.name ?? "?", color: t?.color ?? "#888", goals: topG }
  }

  // Most clean sheets
  let mostCleanSheets: HistoryStats["mostCleanSheets"] = null
  if (teamCS.size) {
    const [csId, csCount] = [...teamCS.entries()].reduce((a, b) => (b[1] > a[1] ? b : a))
    const t = teamById(csId)
    mostCleanSheets = { name: t?.name ?? "?", color: t?.color ?? "#888", count: csCount }
  }

  // Champion streak analysis
  let firstChampion: HistoryStats["firstChampion"] = null
  let longestStreak: HistoryStats["longestStreak"] = null
  let currentStreak: HistoryStats["currentStreak"] = null

  const sorted = [...completedSeasons.value].sort((a, b) => a.season - b.season)
  if (sorted.length) {
    const first = sorted[0]
    if (first.winnerId) {
      const t = teamById(first.winnerId)
      firstChampion = { name: t?.name ?? "?", color: t?.color ?? "#888", season: first.season }
    }

    let streak = 0
    let streakId: string | null = null
    let maxStreak = 0
    let maxStreakId: string | null = null
    for (const t of sorted) {
      if (!t.winnerId) continue
      if (t.winnerId === streakId) streak++
      else {
        streakId = t.winnerId
        streak = 1
      }
      if (streak > maxStreak) {
        maxStreak = streak
        maxStreakId = streakId
      }
    }

    if (maxStreak >= 2 && maxStreakId) {
      const t = teamById(maxStreakId)
      longestStreak = { name: t?.name ?? "?", color: t?.color ?? "#888", count: maxStreak }
    }
    if (streak >= 2 && streakId) {
      const t = teamById(streakId)
      currentStreak = { name: t?.name ?? "?", color: t?.color ?? "#888", count: streak }
    }
  }

  return {
    totalSeasons: completedSeasons.value.length,
    totalMatches,
    totalGoals,
    avgGoals: totalMatches > 0 ? (totalGoals / totalMatches).toFixed(2) : "—",
    topScoringTeam,
    biggestWin: biggestWinEntry,
    mostCleanSheets,
    firstChampion,
    longestStreak,
    currentStreak,
  }
})

// ─── Team Stats ──────────────────────────────────────────────────
const teamStats = computed<TeamStatEntry[]>(() => {
  interface MatchTally {
    played: number
    won: number
    drawn: number
    lost: number
    gf: number
    ga: number
    cleanSheets: number
    title: boolean
  }

  function emptyTally(): MatchTally {
    return { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, cleanSheets: 0, title: false }
  }

  const allTime = new Map<
    string,
    {
      titles: number
      seasonNums: Set<number>
      perSeason: Map<number, MatchTally>
      all: Omit<MatchTally, "title">
    }
  >()

  function getTeam(id: string) {
    let e = allTime.get(id)
    if (!e) {
      e = {
        titles: 0,
        seasonNums: new Set(),
        perSeason: new Map(),
        all: { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, cleanSheets: 0 },
      }
      allTime.set(id, e)
    }
    return e
  }

  function getSeasonTally(teamId: string, season: number): MatchTally {
    const e = getTeam(teamId)
    e.seasonNums.add(season)
    let s = e.perSeason.get(season)
    if (!s) {
      s = emptyTally()
      e.perSeason.set(season, s)
    }
    return s
  }

  function addResult(teamId: string, season: number, goalsFor: number, goalsAgainst: number) {
    const e = getTeam(teamId)
    const s = getSeasonTally(teamId, season)
    for (const tally of [e.all, s] as MatchTally[]) {
      tally.played++
      tally.gf += goalsFor
      tally.ga += goalsAgainst
      if (goalsFor > goalsAgainst) tally.won++
      else if (goalsFor === goalsAgainst) tally.drawn++
      else tally.lost++
      if (goalsAgainst === 0) tally.cleanSheets++
    }
  }

  for (const t of completedSeasons.value) {
    for (const id of t.teamIds) getSeasonTally(id, t.season)
    if (t.groups) {
      for (const g of t.groups) {
        for (const m of g.matches) {
          if (!m.result) continue
          addResult(m.homeId, t.season, m.result.home, m.result.away)
          addResult(m.awayId, t.season, m.result.away, m.result.home)
        }
      }
    }
    for (const round of t.rounds) {
      for (const m of round.matches) {
        if (!m.homeId || !m.awayId || !m.result) continue
        addResult(m.homeId, t.season, m.result.home, m.result.away)
        addResult(m.awayId, t.season, m.result.away, m.result.home)
        if (m.leg2Result) {
          addResult(m.awayId, t.season, m.leg2Result.home, m.leg2Result.away)
          addResult(m.homeId, t.season, m.leg2Result.away, m.leg2Result.home)
        }
      }
    }
    const tp = t.thirdPlaceMatch
    if (tp?.homeId && tp.awayId && tp.result) {
      addResult(tp.homeId, t.season, tp.result.home, tp.result.away)
      addResult(tp.awayId, t.season, tp.result.away, tp.result.home)
      if (tp.leg2Result) {
        addResult(tp.awayId, t.season, tp.leg2Result.home, tp.leg2Result.away)
        addResult(tp.homeId, t.season, tp.leg2Result.away, tp.leg2Result.home)
      }
    }
    if (t.league) {
      for (const md of t.league.matchdays) {
        for (const m of md.matches) {
          if (!m.result) continue
          addResult(m.homeId, t.season, m.result.home, m.result.away)
          addResult(m.awayId, t.season, m.result.away, m.result.home)
        }
      }
    }
    for (const tier of t.tiers ?? []) {
      for (const md of tier.league.matchdays) {
        for (const m of md.matches) {
          if (!m.result) continue
          addResult(m.homeId, t.season, m.result.home, m.result.away)
          addResult(m.awayId, t.season, m.result.away, m.result.home)
        }
      }
    }
    if (t.winnerId) {
      getTeam(t.winnerId).titles++
      getSeasonTally(t.winnerId, t.season).title = true
    }
  }

  return [...allTime.entries()]
    .map(([teamId, data]) => {
      const team = teamById(teamId)
      return {
        teamId,
        name: team?.name ?? "?",
        color: team?.color ?? "#888",
        seasons: data.seasonNums.size,
        titles: data.titles,
        played: data.all.played,
        won: data.all.won,
        drawn: data.all.drawn,
        lost: data.all.lost,
        gf: data.all.gf,
        ga: data.all.ga,
        gd: data.all.gf - data.all.ga,
        cleanSheets: data.all.cleanSheets,
        seasonBreakdown: [...data.perSeason.entries()]
          .sort(([a], [b]) => a - b)
          .map(([season, ss]) => ({
            season,
            played: ss.played,
            won: ss.won,
            drawn: ss.drawn,
            lost: ss.lost,
            gf: ss.gf,
            ga: ss.ga,
            gd: ss.gf - ss.ga,
            cleanSheets: ss.cleanSheets,
            title: ss.title,
          })),
      }
    })
    .sort((a, b) => b.titles - a.titles || b.won - a.won || b.gf - a.gf)
})
</script>

<template>
  <div class="page">
    <!-- Header -->
    <div class="t-header">
      <RouterLink to="/history" class="back-link">
        <ArrowLeft :size="13" />
        {{ t("history.title") }}
      </RouterLink>
      <div class="t-header-top">
        <h1>
          {{ name }}
          <span class="t-season">
            {{ allSeasons.length }}
            {{ allSeasons.length === 1 ? t("common.season", 1) : t("common.season", 2) }}
          </span>
        </h1>
      </div>
    </div>

    <p v-if="!completedSeasons.length" class="empty-text">{{ t("history.noCompletedSeasons") }}</p>

    <template v-else>
      <!-- Phase tabs -->
      <div class="phase-tabs">
        <button
          class="phase-tab"
          :class="{ active: tab === 'champions' }"
          @click="tab = 'champions'"
        >
          <Trophy :size="13" />
          {{ t("history.tabs.champions") }}
        </button>
        <button class="phase-tab" :class="{ active: tab === 'finals' }" @click="tab = 'finals'">
          <Medal :size="13" />
          {{ isLeagueSeries ? t("history.tabs.allSeasons") : t("history.tabs.allFinals") }}
        </button>
        <button
          v-if="isLeagueSeries"
          class="phase-tab"
          :class="{ active: tab === 'alltime' }"
          @click="tab = 'alltime'"
        >
          <Table2 :size="13" />
          {{ t("history.tabs.allTimeTable") }}
        </button>
        <button class="phase-tab" :class="{ active: tab === 'stats' }" @click="tab = 'stats'">
          <BarChart3 :size="13" />
          {{ t("history.tabs.statistics") }}
        </button>
        <button class="phase-tab" :class="{ active: tab === 'teams' }" @click="tab = 'teams'">
          <Users :size="13" />
          {{ t("history.tabs.teams") }}
        </button>
      </div>

      <Transition name="tab" mode="out-in">
        <ChampionsTab
          v-if="tab === 'champions'"
          key="champions"
          :champions="champions"
          :finals-label="isLeagueSeries ? 'Runner-up' : undefined"
        />
        <LeagueSeasonsTab
          v-else-if="tab === 'finals' && isLeagueSeries"
          key="league-seasons"
          :seasons="leagueSeasons"
        />
        <AllFinalsTab v-else-if="tab === 'finals'" key="finals" :finals="finals" />
        <LeagueAllTimeTab v-else-if="tab === 'alltime'" key="alltime" :rows="allTimeRows" />
        <StatisticsTab v-else-if="tab === 'stats'" key="stats" :stats="stats" />
        <TeamStatsTab v-else key="teams" :teams="teamStats" />
      </Transition>
    </template>
  </div>
</template>

<style scoped>
/* Vertical fade for tab content (overrides the global horizontal slide) */
.tab-enter-active,
.tab-leave-active {
  transition:
    opacity 0.15s,
    transform 0.15s;
}
.tab-enter-from,
.tab-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
</style>
