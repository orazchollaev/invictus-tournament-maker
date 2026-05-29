<script setup lang="ts">
import { computed, ref } from "vue"
import { useRoute, RouterLink } from "vue-router"
import { useTournamentStore } from "@/modules/tournament/store"
import { useTeamsStore } from "@/modules/teams/store"
import type { Match, GroupMatch } from "@/modules/tournament/types"
import { ArrowLeft, Trophy, Medal, BarChart3, Table2 } from "lucide-vue-next"
import ChampionsTab, { type ChampEntry } from "../components/ChampionsTab.vue"
import AllFinalsTab, { type FinalEntry } from "../components/AllFinalsTab.vue"
import LeagueSeasonsTab, { type LeagueSeasonEntry } from "../components/LeagueSeasonsTab.vue"
import LeagueAllTimeTab, { type AllTimeRow } from "../components/LeagueAllTimeTab.vue"
import StatisticsTab, { type HistoryStats } from "../components/StatisticsTab.vue"

const route = useRoute()
const store = useTournamentStore()
const teamsStore = useTeamsStore()

const name = computed(() => decodeURIComponent(route.params.name as string))

const allSeasons = computed(() =>
  store.tournaments.filter((t) => t.name === name.value).sort((a, b) => a.season - b.season)
)

const completedSeasons = computed(() =>
  allSeasons.value.filter((t) => store.isTournamentFinished(t.id))
)

const isLeagueSeries = computed(() => allSeasons.value[0]?.format === "league")

type TabId = "champions" | "finals" | "alltime" | "stats"
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

    const w = map.get(wId)
    if (w) {
      w.wins++
      w.finals++
    } else map.set(wId, { wins: 1, finals: 1 })

    if (t.format === "league" && t.league) {
      const rId = t.league.standings[1]?.teamId
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
      if (!t.league) return null
      const s = t.league.standings[pos]
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
    if (!t.league) continue
    for (const s of t.league.standings) {
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

function groupGoals(m: GroupMatch): number {
  return m.result ? m.result.home + m.result.away : 0
}

const stats = computed<HistoryStats>(() => {
  let totalMatches = 0
  let totalGoals = 0

  for (const t of completedSeasons.value) {
    if (t.groups) {
      for (const group of t.groups) {
        for (const m of group.matches) {
          if (m.result) {
            totalMatches++
            totalGoals += groupGoals(m)
          }
        }
      }
    }
    for (const round of t.rounds) {
      for (const m of round.matches) {
        if (m.result) {
          totalMatches++
          totalGoals += knockoutGoals(m)
        }
      }
    }
    if (t.thirdPlaceMatch?.result) {
      totalMatches++
      totalGoals += knockoutGoals(t.thirdPlaceMatch)
    }
    if (t.league) {
      for (const matchday of t.league.matchdays) {
        for (const m of matchday.matches) {
          if (m.result) {
            totalMatches++
            totalGoals += groupGoals(m)
          }
        }
      }
    }
  }

  return {
    totalSeasons: completedSeasons.value.length,
    totalMatches,
    totalGoals,
    avgGoals: totalMatches > 0 ? (totalGoals / totalMatches).toFixed(2) : "—",
  }
})
</script>

<template>
  <div class="page">
    <!-- Header -->
    <div class="t-header">
      <RouterLink to="/history" class="back-link">
        <ArrowLeft :size="13" />
        History
      </RouterLink>
      <div class="t-header-top">
        <h1>
          {{ name }}
          <span class="t-season">
            {{ allSeasons.length }} {{ allSeasons.length === 1 ? "season" : "seasons" }}
          </span>
        </h1>
      </div>
    </div>

    <p v-if="!completedSeasons.length" class="empty-text">No completed seasons yet.</p>

    <template v-else>
      <!-- Phase tabs -->
      <div class="phase-tabs">
        <button
          class="phase-tab"
          :class="{ active: tab === 'champions' }"
          @click="tab = 'champions'"
        >
          <Trophy :size="13" />
          Champions
        </button>
        <button class="phase-tab" :class="{ active: tab === 'finals' }" @click="tab = 'finals'">
          <Medal :size="13" />
          {{ isLeagueSeries ? "All Seasons" : "All Finals" }}
        </button>
        <button
          v-if="isLeagueSeries"
          class="phase-tab"
          :class="{ active: tab === 'alltime' }"
          @click="tab = 'alltime'"
        >
          <Table2 :size="13" />
          All-Time Table
        </button>
        <button class="phase-tab" :class="{ active: tab === 'stats' }" @click="tab = 'stats'">
          <BarChart3 :size="13" />
          Statistics
        </button>
      </div>

      <Transition name="tab" mode="out-in">
        <ChampionsTab v-if="tab === 'champions'" key="champions" :champions="champions" />
        <LeagueSeasonsTab
          v-else-if="tab === 'finals' && isLeagueSeries"
          key="league-seasons"
          :seasons="leagueSeasons"
        />
        <AllFinalsTab v-else-if="tab === 'finals'" key="finals" :finals="finals" />
        <LeagueAllTimeTab v-else-if="tab === 'alltime'" key="alltime" :rows="allTimeRows" />
        <StatisticsTab v-else key="stats" :stats="stats" />
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
