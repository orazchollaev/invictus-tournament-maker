<script setup lang="ts">
import { computed } from "vue"
import { useRoute, useRouter } from "vue-router"
import { useTeamsStore } from "../../teams/store"
import { useTournamentStore } from "@/modules/tournament/store"
import { getWinnerId } from "@/engine/logic"
import type { Match } from "@/modules/tournament/types"

const route = useRoute()
const router = useRouter()
const teamsStore = useTeamsStore()
const tournamentStore = useTournamentStore()

const teamId = computed(() => route.params.id as string)

const team = computed(() => teamsStore.teams.find((t) => t.id === teamId.value))

const allMatches = computed(() => {
  const results: {
    tournamentName: string
    tournamentSeason: number
    round: string
    match: Match
    opponentId: string | null
    goalsFor: number
    goalsAgainst: number
    outcome: "W" | "L"
  }[] = []

  for (const t of tournamentStore.tournaments) {
    if (!t.teamIds.includes(teamId.value)) continue
    for (const round of t.rounds) {
      for (const match of round.matches) {
        const isHome = match.homeId === teamId.value
        const isAway = match.awayId === teamId.value
        if (!isHome && !isAway) continue
        if (!match.result) continue

        const winnerId = getWinnerId(match)
        const outcome = winnerId === teamId.value ? "W" : "L"
        const opponentId = isHome ? match.awayId : match.homeId
        const goalsFor = isHome ? match.result.home : match.result.away
        const goalsAgainst = isHome ? match.result.away : match.result.home

        results.push({
          tournamentName: t.name,
          tournamentSeason: t.season,
          round: round.name,
          match,
          opponentId,
          goalsFor,
          goalsAgainst,
          outcome,
        })
      }
    }
  }

  return results.reverse()
})

const stats = computed(() => {
  const played = allMatches.value.length
  const wins = allMatches.value.filter((m) => m.outcome === "W").length
  const losses = played - wins
  const gf = allMatches.value.reduce((s, m) => s + m.goalsFor, 0)
  const ga = allMatches.value.reduce((s, m) => s + m.goalsAgainst, 0)
  const winRate = played > 0 ? Math.round((wins / played) * 100) : 0
  return { played, wins, losses, gf, ga, winRate }
})

const tournamentWins = computed(() =>
  tournamentStore.tournaments.filter((t) => t.winnerId === teamId.value)
)

const recentForm = computed(() => allMatches.value.slice(0, 5).reverse())

function getTeamName(id: string | null) {
  if (!id) return "BYE"
  return teamsStore.teams.find((t) => t.id === id)?.name ?? "Unknown"
}

function getTeamColor(id: string | null) {
  if (!id) return "#999"
  return teamsStore.teams.find((t) => t.id === id)?.color ?? "#999"
}
</script>

<template>
  <div class="page">
    <div v-if="!team" class="section-box">
      <div class="section-body">
        <p class="empty-text">Team not found.</p>
        <button @click="router.back()">← Back</button>
      </div>
    </div>

    <template v-else>
      <div class="section-box">
        <div class="section-body">
          <div class="team-header">
            <button class="back-btn" @click="router.back()">← Back</button>
            <span class="team-badge" :style="{ background: team.color }" />
            <div>
              <h1 class="team-title">{{ team.name }}</h1>
              <span class="team-meta">
                Power rating:
                <strong>{{ team.power }}</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="section-box">
        <h2>All Statistics</h2>
        <div class="section-body">
          <div class="stats-grid">
            <div class="stat-cell">
              <span class="stat-value">{{ stats.played }}</span>
              <span class="stat-label">Played</span>
            </div>
            <div class="stat-cell">
              <span class="stat-value win">{{ stats.wins }}</span>
              <span class="stat-label">Wins</span>
            </div>
            <div class="stat-cell">
              <span class="stat-value loss">{{ stats.losses }}</span>
              <span class="stat-label">Losses</span>
            </div>
            <div class="stat-cell">
              <span class="stat-value">{{ stats.winRate }}%</span>
              <span class="stat-label">Win Rate</span>
            </div>
            <div class="stat-cell">
              <span class="stat-value">{{ stats.gf }}</span>
              <span class="stat-label">Goals For</span>
            </div>
            <div class="stat-cell">
              <span class="stat-value">{{ stats.ga }}</span>
              <span class="stat-label">Goals Against</span>
            </div>
            <div class="stat-cell">
              <span v-if="tournamentWins.length > 0" class="stat-value trophy">
                🏆 {{ tournamentWins.length }}
              </span>
              <span v-else class="stat-value">—</span>
              <span class="stat-label">Titles</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="allMatches.length" class="section-box">
        <h2>
          Recent Form
          <span class="count">(last 5)</span>
        </h2>
        <div class="section-body">
          <div class="form-row">
            <div
              v-for="(m, i) in recentForm"
              :key="i"
              class="form-bubble"
              :class="m.outcome === 'W' ? 'form-w' : 'form-l'"
              :title="`${m.outcome} vs ${getTeamName(m.opponentId)} ${m.goalsFor}–${m.goalsAgainst}`"
            >
              {{ m.outcome }}
            </div>
            <span v-if="recentForm.length === 0" class="empty-text">No matches yet.</span>
          </div>
          <div class="form-labels">
            <span v-for="(m, i) in recentForm" :key="i" class="form-label">
              {{ m.goalsFor }}–{{ m.goalsAgainst }}
            </span>
          </div>
        </div>
      </div>

      <div v-if="tournamentWins.length" class="section-box">
        <h2>Tournament Titles</h2>
        <div class="section-body flush">
          <div v-for="t in tournamentWins" :key="t.id" class="match-row">
            <span class="trophy-icon">🏆</span>
            <span class="match-tournament">{{ t.name }}</span>
            <span class="match-round">Season {{ t.season }}</span>
          </div>
        </div>
      </div>

      <div class="section-box">
        <h2>
          Match History
          <span class="count">{{ allMatches.length }} matches</span>
        </h2>
        <div class="section-body flush">
          <div v-if="allMatches.length" class="match-list">
            <div v-for="(m, i) in allMatches" :key="i" class="match-row">
              <span class="outcome-badge" :class="m.outcome === 'W' ? 'badge-w' : 'badge-l'">
                {{ m.outcome }}
              </span>
              <span class="match-score">{{ m.goalsFor }}–{{ m.goalsAgainst }}</span>
              <span class="vs-label">vs</span>
              <span class="opponent-dot" :style="{ background: getTeamColor(m.opponentId) }" />
              <span class="match-opponent">{{ getTeamName(m.opponentId) }}</span>
              <span class="match-round">{{ m.round }}</span>
              <span class="match-tournament">{{ m.tournamentName }} S{{ m.tournamentSeason }}</span>
            </div>
          </div>
          <p v-else class="empty-text" style="padding: 12px">No matches played yet.</p>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* Header */
.team-header {
  display: flex;
  align-items: center;
  gap: 12px;
}
.back-btn {
  font-size: 12px;
  padding: 2px 8px;
  flex-shrink: 0;
}
.team-badge {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1px solid var(--border-light);
  flex-shrink: 0;
}
.team-title {
  font-family: var(--font);
  font-size: 22px;
  font-weight: normal;
  line-height: 1.2;
}
.team-meta {
  font-size: 12px;
  color: var(--text-muted);
}

/* Stats */
.stats-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0;
  border: 1px solid var(--border-light);
}
.stat-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 20px;
  border-right: 1px solid var(--border-light);
  min-width: 80px;
}
.stat-cell:last-child {
  border-right: none;
}
.stat-value {
  font-size: 22px;
  font-family: var(--font);
  font-weight: normal;
  line-height: 1;
}
.stat-value.win {
  color: var(--success);
}
.stat-value.loss {
  color: var(--danger);
}
.stat-value.trophy {
  font-size: 18px;
}
.stat-label {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 4px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

/* Form */
.form-row {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-bottom: 4px;
}
.form-bubble {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  cursor: default;
}
.form-w {
  background: var(--success);
}
.form-l {
  background: var(--danger);
}
.form-labels {
  display: flex;
  gap: 6px;
}
.form-label {
  width: 32px;
  text-align: center;
  font-size: 11px;
  color: var(--text-muted);
}

/* Match list */
.match-list {
  max-height: 420px;
  overflow-y: auto;
}
.match-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-bottom: 1px solid var(--border-light);
  font-size: 13px;
  min-width: 0;
}
.match-row:last-child {
  border-bottom: none;
}

.outcome-badge {
  font-size: 11px;
  font-weight: 700;
  width: 20px;
  height: 20px;
  border-radius: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}
.badge-w {
  background: var(--success);
}
.badge-l {
  background: var(--danger);
}

.match-score {
  font-family: var(--font);
  font-size: 14px;
  width: 36px;
  text-align: center;
  flex-shrink: 0;
}
.vs-label {
  font-size: 11px;
  color: var(--text-muted);
  flex-shrink: 0;
}
.opponent-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: 1px solid var(--border-light);
  flex-shrink: 0;
}
.match-opponent {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}
.match-round {
  font-size: 11px;
  color: var(--text-muted);
  flex-shrink: 0;
}
.match-tournament {
  font-size: 11px;
  color: var(--text-muted);
  flex-shrink: 0;
}
.trophy-icon {
  font-size: 14px;
  flex-shrink: 0;
}

.count {
  font-family: var(--font-ui);
  font-size: 12px;
  font-weight: normal;
  color: var(--text-muted);
  margin-left: 6px;
}
.empty-text {
  color: var(--text-muted);
  font-size: 13px;
}
.flush {
  padding: 0;
}

@media (max-width: 600px) {
  .stats-grid {
    flex-wrap: wrap;
  }
  .stat-cell {
    flex: 1 1 33%;
    border-bottom: 1px solid var(--border-light);
  }
  .match-tournament {
    display: none;
  }
}
</style>
