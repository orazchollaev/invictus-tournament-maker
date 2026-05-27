<script setup lang="ts">
import { computed, ref } from "vue"
import { useRoute, RouterLink } from "vue-router"
import { useTournamentStore } from "@/modules/tournament/store"
import { useTeamsStore } from "@/modules/teams/store"
import type { Match, GroupMatch } from "@/modules/tournament/types"
import { ArrowLeft, Trophy, Medal, BarChart3 } from "lucide-vue-next"
import ChampionsTab, { type ChampEntry } from "../components/ChampionsTab.vue"
import AllFinalsTab, { type FinalEntry } from "../components/AllFinalsTab.vue"
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

type TabId = "champions" | "finals" | "stats"
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
      <RouterLink to="/history" class="back">
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
          All Finals
        </button>
        <button class="phase-tab" :class="{ active: tab === 'stats' }" @click="tab = 'stats'">
          <BarChart3 :size="13" />
          Statistics
        </button>
      </div>

      <Transition name="tab" mode="out-in">
        <ChampionsTab v-if="tab === 'champions'" key="champions" :champions="champions" />
        <AllFinalsTab v-else-if="tab === 'finals'" key="finals" :finals="finals" />
        <StatisticsTab v-else key="stats" :stats="stats" />
      </Transition>
    </template>
  </div>
</template>

<style scoped>
.t-header {
  margin-bottom: 16px;
}
.back {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  color: var(--accent);
  text-decoration: none;
}
.t-header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 2px;
}
.t-header h1 {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.02em;
  margin: 6px 0 4px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.t-season {
  font-size: 13px;
  color: var(--text-muted);
  background: var(--bg);
  border: 1px solid var(--border-light);
  border-radius: 2px;
  padding: 1px 6px;
  font-family: var(--font-ui);
}

.phase-tabs {
  display: flex;
  gap: 0;
  margin-bottom: 12px;
  border-bottom: 1px solid var(--border-light);
}
.phase-tab {
  padding: 7px 18px;
  font-size: 13px;
  font-family: var(--font-ui);
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  border-radius: 0;
  margin-bottom: -1px;
  cursor: pointer;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 6px;
  transition:
    color 0.15s,
    border-color 0.15s;
}
.phase-tab:hover {
  color: var(--text);
}
.phase-tab.active {
  color: var(--accent);
  border-bottom-color: var(--accent);
}

.empty-text {
  color: var(--text-muted);
  font-size: 13px;
}

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

@media (max-width: 600px) {
  .t-header h1 {
    font-size: 18px;
  }
  .phase-tabs {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  .phase-tab {
    padding: 7px 12px;
    font-size: 12px;
    white-space: nowrap;
  }
}
</style>
