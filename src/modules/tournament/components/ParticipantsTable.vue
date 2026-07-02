<script setup lang="ts">
import { ref, computed } from "vue"
import type { Team } from "@/modules/teams/types"
import type { Tournament } from "@/modules/tournament/types"
import TeamBadge from "@/modules/teams/components/TeamBadge.vue"
import { getWinnerId, getLoserId } from "@/engine"

const props = defineProps<{ teams: Team[]; tournament: Tournament }>()

type SortKey =
  "result" | "name" | "group" | "power" | "wins" | "draws" | "losses" | "gf" | "ga" | "gd"
const sortKey = ref<SortKey>("result")
const sortAsc = ref(true)

function toggleSort(key: SortKey) {
  if (sortKey.value === key) sortAsc.value = !sortAsc.value
  else {
    sortKey.value = key
    sortAsc.value = key === "name" || key === "group"
  }
}

interface TeamStats {
  played: number
  wins: number
  draws: number
  losses: number
  gf: number
  ga: number
}

const teamStatsMap = computed(() => {
  const map = new Map<string, TeamStats>()

  function get(id: string): TeamStats {
    if (!map.has(id)) map.set(id, { played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0 })
    return map.get(id)!
  }

  function addResult(homeId: string, awayId: string, hg: number, ag: number) {
    const h = get(homeId)
    const a = get(awayId)
    h.played++
    a.played++
    h.gf += hg
    h.ga += ag
    a.gf += ag
    a.ga += hg
    if (hg > ag) {
      h.wins++
      a.losses++
    } else if (ag > hg) {
      a.wins++
      h.losses++
    } else {
      h.draws++
      a.draws++
    }
  }

  for (const matchday of props.tournament.league?.matchdays ?? []) {
    for (const match of matchday.matches) {
      if (!match.result) continue
      addResult(match.homeId, match.awayId, match.result.home, match.result.away)
    }
  }

  for (const tier of props.tournament.tiers ?? []) {
    for (const matchday of tier.league.matchdays) {
      for (const match of matchday.matches) {
        if (!match.result) continue
        addResult(match.homeId, match.awayId, match.result.home, match.result.away)
      }
    }
  }

  for (const group of props.tournament.groups ?? []) {
    for (const match of group.matches) {
      if (!match.result) continue
      addResult(match.homeId, match.awayId, match.result.home, match.result.away)
    }
  }

  for (const round of props.tournament.rounds) {
    for (const match of round.matches) {
      if (!match.result || !match.homeId || !match.awayId) continue
      addResult(match.homeId, match.awayId, match.result.home, match.result.away)
      if (match.leg2Result) {
        addResult(match.awayId, match.homeId, match.leg2Result.home, match.leg2Result.away)
      }
    }
  }

  return map
})

interface Row {
  team: Team
  isWinner: boolean
  isSecondPlace: boolean
  isThirdPlace: boolean
  isFourthPlace: boolean
  eliminatedRound: string | null
  eliminatedRoundIdx: number
  groupName: string | null
  stats: TeamStats
  leaguePosition: number | null
  tierLabel: string | null
  posInTier: number | null
}

const isGroupFormat = computed(() => props.tournament.format === "group+bracket")
// const isLeagueFormat = computed(() => props.tournament.format === "league")

const rows = computed<Row[]>(() => {
  const tpMatch = props.tournament.thirdPlaceMatch
  const tpWinnerId = tpMatch ? getWinnerId(tpMatch) : null
  const tpLoserId = tpMatch ? getLoserId(tpMatch) : null

  const finalRound = props.tournament.rounds[props.tournament.rounds.length - 1]
  const finalMatch = finalRound?.matches[0]
  const secondPlaceId = finalMatch ? getLoserId(finalMatch) : null

  const emptyStats: TeamStats = { played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0 }
  const nil: Pick<
    Row,
    | "isWinner"
    | "isSecondPlace"
    | "isThirdPlace"
    | "isFourthPlace"
    | "eliminatedRound"
    | "eliminatedRoundIdx"
    | "leaguePosition"
    | "tierLabel"
    | "posInTier"
  > = {
    isWinner: false,
    isSecondPlace: false,
    isThirdPlace: false,
    isFourthPlace: false,
    eliminatedRound: null,
    eliminatedRoundIdx: -1,
    leaguePosition: null,
    tierLabel: null,
    posInTier: null,
  }

  return props.teams
    .filter((t) => props.tournament.teamIds.includes(t.id))
    .map((team): Row => {
      const stats = teamStatsMap.value.get(team.id) ?? { ...emptyStats }
      const groupName =
        props.tournament.groups?.find((g) => g.teamIds.includes(team.id))?.name ?? null

      const base = { team, groupName, stats }

      // ── Multi-tier league format ─────────────────────────────────
      if (props.tournament.format === "league" && props.tournament.tiers?.length) {
        const tiers = props.tournament.tiers
        let leaguePosition: number | null = null
        let posInTier: number | null = null
        let tierLabel: string | null = null
        let globalOffset = 0
        for (let ti = 0; ti < tiers.length; ti++) {
          const tier = tiers[ti]
          const posIdx = tier.league.standings.findIndex((s) => s.teamId === team.id)
          if (posIdx !== -1) {
            leaguePosition = globalOffset + posIdx + 1
            posInTier = posIdx + 1
            tierLabel = tier.name
            break
          }
          globalOffset += tier.teamIds.length
        }
        return {
          ...base,
          ...nil,
          isWinner: props.tournament.winnerId === team.id,
          leaguePosition,
          tierLabel,
          posInTier,
          eliminatedRoundIdx: leaguePosition ?? 9999,
        }
      }

      // ── Single-tier league format ─────────────────────────────────
      if (props.tournament.format === "league" && props.tournament.league) {
        const posIdx = props.tournament.league.standings.findIndex((s) => s.teamId === team.id)
        const leaguePosition = posIdx !== -1 ? posIdx + 1 : null
        return {
          ...base,
          ...nil,
          isWinner: props.tournament.winnerId === team.id,
          leaguePosition,
          eliminatedRoundIdx: leaguePosition ?? 9999,
        }
      }

      if (props.tournament.winnerId === team.id) return { ...base, ...nil, isWinner: true }

      if (secondPlaceId === team.id) return { ...base, ...nil, isSecondPlace: true }

      if (tpWinnerId === team.id)
        return { ...base, ...nil, isThirdPlace: true, eliminatedRoundIdx: -2 }

      if (tpLoserId === team.id)
        return { ...base, ...nil, isFourthPlace: true, eliminatedRoundIdx: -2 }

      if (props.tournament.format === "group+bracket") {
        if (props.tournament.groupsDone) {
          for (let ri = 0; ri < props.tournament.rounds.length; ri++) {
            const round = props.tournament.rounds[ri]
            for (const match of round.matches) {
              if ((match.homeId === team.id || match.awayId === team.id) && match.result) {
                const winnerId = getWinnerId(match)
                if (winnerId && winnerId !== team.id)
                  return {
                    ...base,
                    ...nil,
                    eliminatedRound: round.name,
                    eliminatedRoundIdx: 1000 + ri,
                  }
              }
            }
          }
        }

        const qualified = props.tournament.groupsDone
          ? props.tournament.rounds[0]?.matches.some(
              (m) => m.homeId === team.id || m.awayId === team.id
            )
          : false

        const group = props.tournament.groups?.find((g) => g.teamIds.includes(team.id))
        if (group) {
          const allDone = group.matches.every((m) => m.result !== null)
          if (allDone && !qualified) return { ...base, ...nil, eliminatedRound: group.name }
        }

        return { ...base, ...nil }
      }

      for (let ri = 0; ri < props.tournament.rounds.length; ri++) {
        const round = props.tournament.rounds[ri]
        for (const match of round.matches) {
          if ((match.homeId === team.id || match.awayId === team.id) && match.result) {
            const winnerId = getWinnerId(match)
            if (winnerId && winnerId !== team.id)
              return { ...base, ...nil, eliminatedRound: round.name, eliminatedRoundIdx: ri }
          }
        }
      }

      return { ...base, ...nil }
    })
})

function resultScore(r: Row): number {
  if (r.isWinner) return 0
  if (r.leaguePosition !== null) return r.leaguePosition
  if (r.isSecondPlace) return 1
  if (r.isThirdPlace) return 2
  if (r.isFourthPlace) return 3
  if (r.eliminatedRoundIdx >= 1000) return 1000 + (9999 - r.eliminatedRoundIdx)
  if (r.eliminatedRoundIdx === -1) return 9999
  return 5000 - r.eliminatedRoundIdx
}

const sorted = computed(() => {
  const dir = sortAsc.value ? 1 : -1
  return [...rows.value].sort((a, b) => {
    switch (sortKey.value) {
      case "name":
        return dir * a.team.name.localeCompare(b.team.name)
      case "group":
        return dir * (a.groupName ?? "").localeCompare(b.groupName ?? "")
      case "power":
        return dir * (b.team.power - a.team.power)
      case "wins":
        return dir * (b.stats.wins - a.stats.wins)
      case "draws":
        return dir * (b.stats.draws - a.stats.draws)
      case "losses":
        return dir * (b.stats.losses - a.stats.losses)
      case "gf":
        return dir * (b.stats.gf - a.stats.gf)
      case "ga":
        return dir * (a.stats.ga - b.stats.ga)
      case "gd":
        return dir * (b.stats.gf - b.stats.ga - (a.stats.gf - a.stats.ga))
      default:
        return dir * (resultScore(a) - resultScore(b))
    }
  })
})

function finishRank(row: Row): number | null {
  if (row.isWinner) return 1
  if (row.leaguePosition !== null) return row.leaguePosition
  if (row.isSecondPlace) return 2
  if (row.isThirdPlace) return 3
  if (row.isFourthPlace) return 4
  return null
}

function ordinalSuffix(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`
  if (mod10 === 1) return `${n}st`
  if (mod10 === 2) return `${n}nd`
  if (mod10 === 3) return `${n}rd`
  return `${n}th`
}

function leaguePlaceTag(pos: number): { label: string; color: string } {
  const colors: Record<number, string> = { 1: "#f59e0b", 2: "#3b82f6", 3: "#8b5cf6", 4: "#22c55e" }
  return { label: `${ordinalSuffix(pos)} Place`, color: colors[pos] ?? "var(--text-muted)" }
}

function eliminationLabel(row: Row): string {
  if (!row.eliminatedRound) return ""
  return `Eliminated · ${row.eliminatedRound}`
}

function gd(s: TeamStats): string {
  const d = s.gf - s.ga
  return d > 0 ? `+${d}` : `${d}`
}

function sortIcon(key: SortKey): string {
  if (sortKey.value !== key) return "↕"
  return sortAsc.value ? "↑" : "↓"
}
</script>

<template>
  <div class="pt-wrap">
    <table class="pt">
      <thead>
        <tr>
          <th class="col-rank sortable" @click="toggleSort('result')">
            #
            <span class="sort-icon">{{ sortIcon("result") }}</span>
          </th>
          <th class="col-team sortable" @click="toggleSort('name')">
            Team
            <span class="sort-icon">{{ sortIcon("name") }}</span>
          </th>
          <th v-if="isGroupFormat" class="col-group sortable" @click="toggleSort('group')">
            Group
            <span class="sort-icon">{{ sortIcon("group") }}</span>
          </th>
          <th class="col-stat sortable" @click="toggleSort('wins')">
            W
            <span class="sort-icon">{{ sortIcon("wins") }}</span>
          </th>
          <th class="col-stat sortable" @click="toggleSort('draws')">
            D
            <span class="sort-icon">{{ sortIcon("draws") }}</span>
          </th>
          <th class="col-stat sortable" @click="toggleSort('losses')">
            L
            <span class="sort-icon">{{ sortIcon("losses") }}</span>
          </th>
          <th class="col-stat sortable" @click="toggleSort('gf')">
            GF
            <span class="sort-icon">{{ sortIcon("gf") }}</span>
          </th>
          <th class="col-stat sortable" @click="toggleSort('ga')">
            GA
            <span class="sort-icon">{{ sortIcon("ga") }}</span>
          </th>
          <th class="col-gd sortable" @click="toggleSort('gd')">
            GD
            <span class="sort-icon">{{ sortIcon("gd") }}</span>
          </th>
          <th class="col-power sortable" @click="toggleSort('power')">
            PWR
            <span class="sort-icon">{{ sortIcon("power") }}</span>
          </th>
          <th class="col-result sortable" @click="toggleSort('result')">
            Result
            <span class="sort-icon">{{ sortIcon("result") }}</span>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(row, i) in sorted"
          :key="row.team.id"
          :class="{
            'row--winner': row.isWinner,
            'row--top4': row.isSecondPlace || row.isThirdPlace || row.isFourthPlace,
          }"
        >
          <td class="col-rank">
            <span class="rank-badge" :class="`rank-badge--${finishRank(row) ?? 'none'}`">
              {{ finishRank(row) ?? i + 1 }}
            </span>
          </td>
          <td class="col-team">
            <TeamBadge :team="row.team" class="team-cell" />
          </td>
          <td v-if="isGroupFormat" class="col-group">
            <span class="group-badge">{{ row.groupName ?? "—" }}</span>
          </td>
          <td class="col-stat stat-wins">{{ row.stats.wins }}</td>
          <td class="col-stat stat-draws">{{ row.stats.draws }}</td>
          <td class="col-stat stat-losses">{{ row.stats.losses }}</td>
          <td class="col-stat">{{ row.stats.gf }}</td>
          <td class="col-stat">{{ row.stats.ga }}</td>
          <td
            class="col-gd"
            :class="{
              'gd--pos': row.stats.gf > row.stats.ga,
              'gd--neg': row.stats.gf < row.stats.ga,
            }"
          >
            {{ row.stats.played > 0 ? gd(row.stats) : "—" }}
          </td>
          <td class="col-power">{{ row.team.power }}</td>
          <td class="col-result">
            <span v-if="row.isWinner" class="tag" :style="{ background: row.team.color }">
              1st Place
            </span>
            <template v-else-if="row.leaguePosition !== null && row.leaguePosition > 1">
              <template v-if="row.tierLabel && row.posInTier !== null">
                <span class="tier-pos">
                  <span class="tier-name-tag">{{ row.tierLabel }}</span>
                  {{ ordinalSuffix(row.posInTier) }} Place
                </span>
              </template>
              <template v-else>
                <span
                  v-if="row.leaguePosition <= 4"
                  class="tag tag--place"
                  :style="{
                    borderColor: leaguePlaceTag(row.leaguePosition).color,
                    color: leaguePlaceTag(row.leaguePosition).color,
                  }"
                >
                  {{ leaguePlaceTag(row.leaguePosition).label }}
                </span>
                <span v-else class="pending">{{ ordinalSuffix(row.leaguePosition) }} Place</span>
              </template>
            </template>
            <span
              v-else-if="row.isSecondPlace"
              class="tag tag--place"
              :style="{ borderColor: row.team.color, color: row.team.color }"
            >
              2nd Place
            </span>
            <span
              v-else-if="row.isThirdPlace"
              class="tag tag--place"
              :style="{ borderColor: row.team.color, color: row.team.color }"
            >
              3rd Place
            </span>
            <span
              v-else-if="row.isFourthPlace"
              class="tag tag--place"
              :style="{ borderColor: row.team.color, color: row.team.color }"
            >
              4th Place
            </span>
            <span v-else-if="row.eliminatedRound !== null" class="elim">
              {{ eliminationLabel(row) }}
            </span>
            <span v-else class="pending">—</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.pt-wrap {
  overflow-x: auto;
}

.pt {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.pt thead tr {
  border-bottom: 1px solid var(--border-light);
}

.pt th {
  padding: 7px 10px;
  text-align: left;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  white-space: nowrap;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.pt td {
  padding: 7px 10px;
  border-bottom: 1px solid color-mix(in srgb, var(--border-light) 60%, transparent);
  white-space: nowrap;
}

.pt tbody tr:last-child td {
  border-bottom: none;
}

.pt tbody tr:hover {
  background: color-mix(in srgb, var(--border-light) 40%, transparent);
}

.row--winner td {
  background: color-mix(in srgb, var(--accent-2) 6%, transparent);
}

.sortable {
  cursor: pointer;
  user-select: none;
}

.sortable:hover {
  color: var(--text);
}

.sort-icon {
  font-size: 10px;
  opacity: 0.6;
}

.col-rank {
  width: 36px;
  text-align: center;
}

.col-stat {
  width: 36px;
  text-align: center;
}

.col-gd {
  width: 40px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.col-power {
  width: 48px;
  text-align: center;
}

.col-group {
  width: 64px;
}

.col-result {
  text-align: left;
}

.rank-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
  background: transparent;
}

.rank-badge--1 {
  background: var(--accent-2);
  color: #fff;
}

.rank-badge--2 {
  background: color-mix(in srgb, #94a3b8 70%, transparent);
  color: #fff;
}

.rank-badge--3 {
  background: color-mix(in srgb, #b45309 70%, transparent);
  color: #fff;
}

.rank-badge--4 {
  color: var(--text-muted);
  background: var(--border-light);
}

.dot {
  display: inline-block;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  flex-shrink: 0;
}

.team-cell {
  display: flex;
  align-items: center;
  gap: 7px;
}

.group-badge {
  font-size: 11px;
  color: var(--text-muted);
  background: var(--bg);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  padding: 1px 5px;
}

.stat-wins {
  color: color-mix(in srgb, var(--success) 80%, var(--text));
  font-weight: 600;
}

.stat-draws {
  color: var(--text-muted);
}

.stat-losses {
  color: color-mix(in srgb, var(--danger) 80%, var(--text));
}

.gd--pos {
  color: color-mix(in srgb, var(--success) 80%, var(--text));
  font-weight: 600;
}

.gd--neg {
  color: color-mix(in srgb, var(--danger) 80%, var(--text));
}

.elim {
  font-size: 12px;
  color: var(--text-muted);
}

.pending {
  color: var(--text-muted);
  font-size: 12px;
}

.tag {
  display: inline-block;
  padding: 1px 8px;
  border-radius: var(--radius);
  font-size: 12px;
  color: #fff;
}

.tag--place {
  background: transparent;
  border: 1px solid;
  font-weight: 600;
}

.tier-pos {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: var(--text-muted);
}

.tier-name-tag {
  font-size: 10px;
  font-weight: 600;
  padding: 1px 5px;
  border-radius: var(--radius);
  background: color-mix(in srgb, var(--border-light) 80%, transparent);
  color: var(--text-muted);
  border: 1px solid var(--border-light);
}
</style>
