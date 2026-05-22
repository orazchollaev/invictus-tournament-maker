<script setup lang="ts">
import { computed } from "vue"
import { useRoute, useRouter } from "vue-router"
import { useTeamsStore } from "../../teams/store"
import { useTournamentStore } from "@/modules/tournament/store"
import { getWinnerId } from "@/engine"
import { useTeamLookup } from "@/composables/useTeamLookup"
import type { Match } from "@/modules/tournament/types"
import { Trophy } from "lucide-vue-next"

const route = useRoute()
const router = useRouter()
const teamsStore = useTeamsStore()
const tournamentStore = useTournamentStore()
const { getTeamName, getTeamColor } = useTeamLookup(() => teamsStore.teams)

const teamId = computed(() => route.params.id as string)
const team = computed(() => teamsStore.teams.find((t) => t.id === teamId.value))

// ─── Bracket match history ────────────────────────────────────
interface MatchRow {
  tournamentName: string
  tournamentSeason: number
  round: string
  roundPhase: "group" | "knockout"
  match:
    | Match
    | { id: string; homeId: string; awayId: string; result: { home: number; away: number } }
  opponentId: string | null
  goalsFor: number
  goalsAgainst: number
  penGoalsFor: number | null
  penGoalsAgainst: number | null
  outcome: "W" | "D" | "L"
}

const isByeMatch = (match: Match) => !match.homeId || !match.awayId

const allMatches = computed((): MatchRow[] => {
  const results: MatchRow[] = []

  for (const t of tournamentStore.tournaments) {
    if (!t.teamIds.includes(teamId.value)) continue

    // ── Group stage matches ──────────────────────────────────
    if (t.format === "group+bracket" && t.groups) {
      for (const group of t.groups) {
        if (!group.teamIds.includes(teamId.value)) continue
        for (const match of group.matches) {
          if (isByeMatch(match)) continue

          const isHome = match.homeId === teamId.value
          const isAway = match.awayId === teamId.value
          if (!isHome && !isAway) continue
          if (!match.result) continue

          const { home, away } = match.result
          const goalsFor = isHome ? home : away
          const goalsAgainst = isHome ? away : home
          const opponentId = isHome ? match.awayId : match.homeId

          let outcome: "W" | "D" | "L"
          if (goalsFor > goalsAgainst) outcome = "W"
          else if (goalsFor < goalsAgainst) outcome = "L"
          else outcome = "D"

          // Cast group match to compatible shape for display
          results.push({
            tournamentName: t.name,
            tournamentSeason: t.season,
            round: group.name,
            roundPhase: "group",
            match: match as any,
            opponentId,
            goalsFor,
            goalsAgainst,
            penGoalsFor: null,
            penGoalsAgainst: null,
            outcome,
          })
        }
      }
    }

    // ── Knockout / bracket matches ───────────────────────────
    for (const round of t.rounds) {
      for (const match of round.matches) {
        if (isByeMatch(match)) continue

        const isHome = match.homeId === teamId.value
        const isAway = match.awayId === teamId.value
        if (!isHome && !isAway) continue
        if (!match.result) continue

        const winnerId = getWinnerId(match)
        const outcome = winnerId === teamId.value ? "W" : "L"
        const opponentId = isHome ? match.awayId : match.homeId
        const goalsFor = isHome ? match.result.home : match.result.away
        const goalsAgainst = isHome ? match.result.away : match.result.home
        const hasPen = match.result.penHome !== undefined
        const penGoalsFor = hasPen ? (isHome ? match.result.penHome! : match.result.penAway!) : null
        const penGoalsAgainst = hasPen
          ? isHome
            ? match.result.penAway!
            : match.result.penHome!
          : null

        results.push({
          tournamentName: t.name,
          tournamentSeason: t.season,
          round: round.name,
          roundPhase: "knockout",
          match,
          opponentId,
          goalsFor,
          goalsAgainst,
          penGoalsFor,
          penGoalsAgainst,
          outcome,
        })
      }
    }

    if (t.thirdPlaceMatch) {
      const match = t.thirdPlaceMatch

      const isHome = match.homeId === teamId.value
      const isAway = match.awayId === teamId.value

      if ((isHome || isAway) && match.result) {
        const winnerId = getWinnerId(match)
        const outcome = winnerId === teamId.value ? "W" : "L"

        const opponentId = isHome ? match.awayId : match.homeId

        const goalsFor = isHome ? match.result.home : match.result.away

        const goalsAgainst = isHome ? match.result.away : match.result.home

        const hasPen = match.result.penHome !== undefined

        const penGoalsFor = hasPen ? (isHome ? match.result.penHome! : match.result.penAway!) : null

        const penGoalsAgainst = hasPen
          ? isHome
            ? match.result.penAway!
            : match.result.penHome!
          : null

        results.push({
          tournamentName: t.name,
          tournamentSeason: t.season,
          round: "3rd Place",
          roundPhase: "knockout",
          match,
          opponentId,
          goalsFor,
          goalsAgainst,
          penGoalsFor,
          penGoalsAgainst,
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
  const draws = allMatches.value.filter((m) => m.outcome === "D").length
  const losses = allMatches.value.filter((m) => m.outcome === "L").length
  const gf = allMatches.value.reduce((s, m) => s + m.goalsFor, 0)
  const ga = allMatches.value.reduce((s, m) => s + m.goalsAgainst, 0)
  const winRate = played > 0 ? Math.round((wins / played) * 100) : 0
  return { played, wins, draws, losses, gf, ga, winRate }
})

const tournamentWins = computed(() =>
  tournamentStore.tournaments.filter((t) => t.winnerId === teamId.value)
)

// Recent form: last 5 matches (most recent first → reverse for display left-to-right)
const recentForm = computed(() => allMatches.value.slice(0, 5).reverse())
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
      <!-- Header -->
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

      <!-- Stats -->
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
              <span class="stat-value draw">{{ stats.draws }}</span>
              <span class="stat-label">Draws</span>
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
                <Trophy :size="15" />
                {{ tournamentWins.length }}
              </span>
              <span v-else class="stat-value">—</span>
              <span class="stat-label">Titles</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Form -->
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
              :class="m.outcome === 'W' ? 'form-w' : m.outcome === 'D' ? 'form-d' : 'form-l'"
              :title="`${m.outcome} vs ${getTeamName(m.opponentId)} ${m.goalsFor}–${m.goalsAgainst}${m.penGoalsFor !== null ? ` (pen. ${m.penGoalsFor}–${m.penGoalsAgainst})` : ''}`"
            >
              {{ m.outcome }}
            </div>
          </div>
          <div class="form-labels">
            <span v-for="(m, i) in recentForm" :key="i" class="form-label">
              {{ m.goalsFor }}–{{ m.goalsAgainst }}
              <template v-if="m.penGoalsFor !== null">
                <br />
                <span class="pen-tag">p.</span>
              </template>
            </span>
          </div>
        </div>
      </div>

      <!-- Titles -->
      <div v-if="tournamentWins.length" class="section-box">
        <h2>Tournament Titles</h2>
        <div class="section-body flush">
          <div v-for="t in tournamentWins" :key="t.id" class="match-row">
            <Trophy :size="16" class="trophy-icon" />
            <span class="match-tournament">{{ t.name }}</span>
            <span class="match-round">Season {{ t.season }}</span>
          </div>
        </div>
      </div>

      <!-- Match History -->
      <div class="section-box">
        <h2>
          Match History
          <span class="count">{{ allMatches.length }} matches</span>
        </h2>
        <div class="section-body flush">
          <div v-if="allMatches.length" class="match-list">
            <div v-for="(m, i) in allMatches" :key="i" class="match-row">
              <!-- Outcome badge -->
              <span
                class="outcome-badge"
                :class="m.outcome === 'W' ? 'badge-w' : m.outcome === 'D' ? 'badge-d' : 'badge-l'"
              >
                {{ m.outcome }}
              </span>

              <!-- Score -->
              <span class="match-score">
                {{ m.goalsFor }}–{{ m.goalsAgainst }}
                <span v-if="m.penGoalsFor !== null" class="pen-suffix">
                  (p. {{ m.penGoalsFor }}–{{ m.penGoalsAgainst }})
                </span>
              </span>

              <span class="vs-label">vs</span>

              <span class="opponent-dot" :style="{ background: getTeamColor(m.opponentId) }" />
              <span class="match-opponent">{{ getTeamName(m.opponentId) }}</span>

              <!-- Round + phase chip -->
              <span class="match-round">
                <span
                  class="phase-chip"
                  :class="m.roundPhase === 'group' ? 'chip-group' : 'chip-ko'"
                >
                  {{ m.roundPhase === "group" ? "GS" : "KO" }}
                </span>
                {{ m.round }}
              </span>

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
.stat-value.draw {
  color: var(--text-muted);
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
.form-d {
  background: var(--text-muted);
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
.badge-d {
  background: var(--text-muted);
}
.badge-l {
  background: var(--danger);
}

.match-score {
  font-family: var(--font);
  font-size: 14px;
  text-align: center;
  flex-shrink: 0;
}
.pen-suffix {
  font-family: var(--font-ui);
  font-size: 11px;
  color: var(--text-muted);
}
.pen-tag {
  font-size: 9px;
  color: var(--text-muted);
  line-height: 1;
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
  display: flex;
  align-items: center;
  gap: 4px;
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

/* Phase chip */
.phase-chip {
  display: inline-block;
  font-size: 9px;
  font-weight: 700;
  padding: 1px 4px;
  border-radius: 2px;
  letter-spacing: 0.03em;
}
.chip-group {
  background: color-mix(in srgb, var(--accent) 15%, transparent);
  color: var(--accent);
  border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
}
.chip-ko {
  background: color-mix(in srgb, var(--danger) 12%, transparent);
  color: var(--danger);
  border: 1px solid color-mix(in srgb, var(--danger) 25%, transparent);
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
