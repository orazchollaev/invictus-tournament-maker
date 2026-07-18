<script setup lang="ts">
import { computed } from "vue"
import { useRoute, useRouter } from "vue-router"
import { useI18n } from "vue-i18n"

import { ArrowLeft, Download, BarChart2, Trophy, Medal, Users } from "@lucide/vue"
import TeamBadge from "@/modules/teams/components/TeamBadge.vue"

import { useTournamentStore } from "@/modules/tournament/store"
import { useTeamsStore } from "@/modules/teams/store"
import { getCachedSimResult } from "@/modules/tournament/composables/simulationCache"

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const store = useTournamentStore()
const teamsStore = useTeamsStore()

const tournamentId = computed(() => route.params.id as string)
const tournament = computed(() => store.getById(tournamentId.value))
const result = computed(() => getCachedSimResult(tournamentId.value))

const teams = computed(() => teamsStore.teams)

function teamById(id: string) {
  return teams.value.find((t) => t.id === id)
}

const isBracket = computed(
  () => result.value?.format === "bracket" || result.value?.format === "group+bracket"
)
const isLeague = computed(() => result.value?.format === "league")
const hasGroups = computed(() => result.value?.hasGroups)
const showTop4 = computed(() => (result.value?.bracketRounds ?? 0) >= 3)

const runs = computed(() => result.value?.runs ?? 0)

function pct(val: number): string {
  if (!runs.value) return "0.0%"
  return ((val / runs.value) * 100).toFixed(1) + "%"
}

function avg(total: number): string {
  if (!runs.value) return "0.0"
  return (total / runs.value).toFixed(1)
}

function barWidth(val: number, max: number): string {
  if (!max) return "0%"
  return Math.round((val / max) * 100) + "%"
}

const sortedStats = computed(() => {
  if (!result.value) return []
  return [...result.value.teamStats].sort((a, b) => b.wins - a.wins)
})

const maxWins = computed(() => Math.max(...sortedStats.value.map((s) => s.wins), 1))

function handleSaveJSON() {
  if (!result.value || !tournament.value) return
  const payload = {
    tournament: tournament.value.name,
    season: tournament.value.season,
    format: result.value.format,
    runs: result.value.runs,
    generatedAt: new Date().toISOString(),
    teams: sortedStats.value.map((s) => {
      const team = teamById(s.teamId)
      const base = {
        name: team?.name ?? s.teamId,
        power: team?.power ?? 0,
        wins: s.wins,
        winPct: parseFloat(((s.wins / runs.value) * 100).toFixed(2)),
      }
      if (isBracket.value) {
        return {
          ...base,
          runnerUp: s.runnerUp,
          runnerUpPct: parseFloat(((s.runnerUp / runs.value) * 100).toFixed(2)),
          ...(showTop4.value
            ? {
                top4: s.top4,
                top4Pct: parseFloat(((s.top4 / runs.value) * 100).toFixed(2)),
              }
            : {}),
          ...(hasGroups.value
            ? {
                groupAdvanced: s.groupAdvanced,
                groupAdvancedPct: parseFloat(((s.groupAdvanced / runs.value) * 100).toFixed(2)),
              }
            : {}),
        }
      }
      return {
        ...base,
        avgPoints: parseFloat((s.totalPoints / runs.value).toFixed(2)),
        avgGoalsFor: parseFloat((s.totalGF / runs.value).toFixed(2)),
        avgGoalsAgainst: parseFloat((s.totalGA / runs.value).toFixed(2)),
        topThreePct: parseFloat(((s.topThree / runs.value) * 100).toFixed(2)),
      }
    }),
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${tournament.value.name}_sim_${runs.value}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function handleSaveCSV() {
  if (!result.value || !tournament.value) return
  const headers: string[] = ["Team", "Power", "Win%", "Wins"]
  if (isBracket.value) {
    headers.push("Runner-up%", "Runner-ups")
    if (showTop4.value) headers.push("Top 4%", "Top 4")
    if (hasGroups.value) headers.push("Group Adv.%", "Group Adv.")
  } else {
    headers.push("Title%", "Avg Pts", "Avg GF", "Avg GA", "Top 3%")
  }
  const rows = sortedStats.value.map((s) => {
    const team = teamById(s.teamId)
    const row: (string | number)[] = [
      team?.name ?? s.teamId,
      team?.power ?? 0,
      parseFloat(((s.wins / runs.value) * 100).toFixed(2)),
      s.wins,
    ]
    if (isBracket.value) {
      row.push(parseFloat(((s.runnerUp / runs.value) * 100).toFixed(2)), s.runnerUp)
      if (showTop4.value) {
        row.push(parseFloat(((s.top4 / runs.value) * 100).toFixed(2)), s.top4)
      }
      if (hasGroups.value) {
        row.push(parseFloat(((s.groupAdvanced / runs.value) * 100).toFixed(2)), s.groupAdvanced)
      }
    } else {
      row.push(
        parseFloat(((s.wins / runs.value) * 100).toFixed(2)),
        parseFloat((s.totalPoints / runs.value).toFixed(2)),
        parseFloat((s.totalGF / runs.value).toFixed(2)),
        parseFloat((s.totalGA / runs.value).toFixed(2)),
        parseFloat(((s.topThree / runs.value) * 100).toFixed(2))
      )
    }
    return row
  })
  const csv = [headers, ...rows].map((r) => r.join(",")).join("\n")
  const blob = new Blob([csv], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${tournament.value.name}_sim_${runs.value}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="page srp">
    <!-- Not found -->
    <template v-if="!result || !tournament">
      <div class="srp-empty">
        <BarChart2 :size="32" class="srp-empty-icon" />
        <p>{{ t("tournament.simulationResults.noResults") }}</p>
        <button @click="router.push(`/tournaments/${tournamentId}/settings`)">
          {{ t("tournament.simulationResults.runFirst") }}
        </button>
      </div>
    </template>

    <template v-else>
      <!-- Header -->
      <div class="srp-header">
        <RouterLink :to="`/tournaments/${tournamentId}/settings`" class="back-link">
          <ArrowLeft :size="14" />
          {{ t("tournament.settings") }}
        </RouterLink>
        <div class="srp-title-row">
          <h2 class="srp-title">
            <BarChart2 :size="18" class="srp-title-icon" />
            {{ t("tournament.simulationResults.title") }}
          </h2>
          <span class="srp-badge">
            {{ t("tournament.simulationResults.runs", { n: runs.toLocaleString() }) }}
          </span>
        </div>
        <div class="srp-subtitle">
          {{ tournament.name }} —
          {{ t("tournament.simulationResults.season", { n: tournament.season }) }}
        </div>
      </div>

      <!-- Format summary -->
      <div class="srp-summary-row">
        <div class="srp-stat-chip">
          <span class="srp-chip-label">{{ t("tournament.simulationResults.format") }}</span>
          <span class="srp-chip-val">{{ result.format }}</span>
        </div>
        <div class="srp-stat-chip">
          <span class="srp-chip-label">{{ t("tournament.simulationResults.teams") }}</span>
          <span class="srp-chip-val">{{ result.teamStats.length }}</span>
        </div>
        <div class="srp-stat-chip">
          <span class="srp-chip-label">{{ t("tournament.simulationResults.simulations") }}</span>
          <span class="srp-chip-val">{{ runs.toLocaleString() }}</span>
        </div>
      </div>

      <!-- Bracket stats table -->
      <template v-if="isBracket">
        <div class="srp-card">
          <div class="srp-card-title">
            <Trophy :size="14" />
            {{ t("tournament.simulationResults.championshipOdds") }}
          </div>
          <div class="srp-table-wrap">
            <table class="srp-table">
              <thead>
                <tr>
                  <th class="col-rank">#</th>
                  <th class="col-team">{{ t("common.team") }}</th>
                  <th class="col-pwr">PWR</th>
                  <th class="col-stat">
                    <Trophy :size="12" />
                    {{ t("tournament.simulationResults.win") }}
                  </th>
                  <th class="col-stat">
                    <Medal :size="12" />
                    {{ t("tournament.simulationResults.final") }}
                  </th>
                  <th v-if="showTop4" class="col-stat">
                    <Users :size="12" />
                    {{ t("tournament.simulationResults.top4") }}
                  </th>
                  <th v-if="hasGroups" class="col-stat">
                    <Users :size="12" />
                    {{ t("tournament.simulationResults.adv") }}
                  </th>
                  <th class="col-bar">{{ t("tournament.simulationResults.winProbability") }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(s, i) in sortedStats" :key="s.teamId">
                  <td class="col-rank">{{ i + 1 }}</td>
                  <td class="col-team">
                    <TeamBadge v-if="teamById(s.teamId)" :team="teamById(s.teamId)!" :size="14" />
                    <span v-else>{{ s.teamId }}</span>
                  </td>
                  <td class="col-pwr">{{ teamById(s.teamId)?.power ?? "—" }}</td>
                  <td class="col-stat stat-win">{{ pct(s.wins) }}</td>
                  <td class="col-stat">{{ pct(s.runnerUp) }}</td>
                  <td v-if="showTop4" class="col-stat">{{ pct(s.top4) }}</td>
                  <td v-if="hasGroups" class="col-stat">{{ pct(s.groupAdvanced) }}</td>
                  <td class="col-bar">
                    <div class="srp-bar-track">
                      <div
                        class="srp-bar-fill"
                        :style="{
                          width: barWidth(s.wins, maxWins),
                          background: teamById(s.teamId)?.color ?? 'var(--accent)',
                        }"
                      />
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>

      <!-- League stats table -->
      <template v-if="isLeague">
        <div class="srp-card">
          <div class="srp-card-title">
            <Trophy :size="14" />
            {{ t("tournament.simulationResults.leagueOdds") }}
          </div>
          <div class="srp-table-wrap">
            <table class="srp-table">
              <thead>
                <tr>
                  <th class="col-rank">#</th>
                  <th class="col-team">{{ t("common.team") }}</th>
                  <th class="col-pwr">PWR</th>
                  <th class="col-stat">
                    <Trophy :size="12" />
                    {{ t("tournament.simulationResults.titleCol") }}
                  </th>
                  <th class="col-stat">{{ t("tournament.simulationResults.top3") }}</th>
                  <th class="col-stat">{{ t("tournament.simulationResults.avgPts") }}</th>
                  <th class="col-stat">{{ t("tournament.simulationResults.avgGF") }}</th>
                  <th class="col-stat">{{ t("tournament.simulationResults.avgGA") }}</th>
                  <th class="col-bar">{{ t("tournament.simulationResults.titleProbability") }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(s, i) in sortedStats" :key="s.teamId">
                  <td class="col-rank">{{ i + 1 }}</td>
                  <td class="col-team">
                    <TeamBadge v-if="teamById(s.teamId)" :team="teamById(s.teamId)!" :size="14" />
                    <span v-else>{{ s.teamId }}</span>
                  </td>
                  <td class="col-pwr">{{ teamById(s.teamId)?.power ?? "—" }}</td>
                  <td class="col-stat stat-win">{{ pct(s.wins) }}</td>
                  <td class="col-stat">{{ pct(s.topThree) }}</td>
                  <td class="col-stat">{{ avg(s.totalPoints) }}</td>
                  <td class="col-stat">{{ avg(s.totalGF) }}</td>
                  <td class="col-stat">{{ avg(s.totalGA) }}</td>
                  <td class="col-bar">
                    <div class="srp-bar-track">
                      <div
                        class="srp-bar-fill"
                        :style="{
                          width: barWidth(s.wins, maxWins),
                          background: teamById(s.teamId)?.color ?? 'var(--accent)',
                        }"
                      />
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>

      <!-- Save actions -->
      <div class="srp-actions">
        <button class="primary srp-save-btn" @click="handleSaveJSON">
          <Download :size="14" />
          {{ t("tournament.simulationResults.saveJson") }}
        </button>
        <button class="srp-save-btn" @click="handleSaveCSV">
          <Download :size="14" />
          {{ t("tournament.simulationResults.saveCsv") }}
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.srp {
  padding-bottom: 40px;
}

.srp-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 60px 20px;
  color: var(--text-muted);
  text-align: center;
}
.srp-empty-icon {
  opacity: 0.3;
}

.srp-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 20px;
}
.srp-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 4px;
}
.srp-title {
  font-size: 22px;
  font-weight: 700;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}
.srp-title-icon {
  color: var(--text-muted);
}
.srp-badge {
  font-size: 12px;
  font-weight: 600;
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 12%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
  border-radius: var(--radius);
  padding: 2px 9px;
}
.srp-subtitle {
  font-size: 13px;
  color: var(--text-muted);
}

.srp-summary-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}
.srp-stat-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  font-size: 12px;
}
.srp-chip-label {
  color: var(--text-muted);
}
.srp-chip-val {
  font-weight: 600;
  color: var(--text);
}

.srp-card {
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  margin-bottom: 14px;
  overflow: hidden;
}
.srp-card-title {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--text-muted);
  padding: 12px 16px 0;
  margin-bottom: 10px;
}

.srp-table-wrap {
  overflow-x: auto;
}

.srp-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.srp-table th {
  text-align: left;
  padding: 7px 10px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  border-bottom: 1px solid var(--border-light);
  background: var(--bg);
  white-space: nowrap;
}
.srp-table th svg {
  vertical-align: middle;
  margin-right: 3px;
}
.srp-table td {
  padding: 9px 10px;
  border-bottom: 1px solid var(--border-light);
  color: var(--text);
  vertical-align: middle;
}
.srp-table tbody tr:last-child td {
  border-bottom: none;
}
.srp-table tbody tr:hover td {
  background: color-mix(in srgb, var(--accent) 4%, var(--surface));
}

.col-rank {
  width: 32px;
  text-align: center;
  color: var(--text-muted);
  font-size: 12px;
}
.col-team {
  min-width: 130px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.col-pwr {
  width: 44px;
  text-align: center;
  font-weight: 600;
  color: var(--text-muted);
  font-size: 12px;
}
.col-stat {
  width: 72px;
  text-align: right;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.col-stat svg {
  vertical-align: middle;
  margin-right: 2px;
}
.stat-win {
  font-weight: 700;
  color: var(--accent);
}
.col-bar {
  min-width: 100px;
  padding-right: 16px !important;
}

.team-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  flex-shrink: 0;
  display: inline-block;
}

.srp-bar-track {
  width: 100%;
  height: 7px;
  background: var(--bg);
  border-radius: var(--radius);
  overflow: hidden;
}
.srp-bar-fill {
  height: 100%;
  border-radius: var(--radius);
  transition: width 0.3s ease;
  opacity: 0.85;
}

.srp-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  padding-top: 4px;
}
.srp-save-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 13px;
  padding: 8px 16px;
}

@media (max-width: 600px) {
  .col-bar {
    display: none;
  }
}
</style>
