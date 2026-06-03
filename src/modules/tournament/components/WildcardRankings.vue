<script setup lang="ts">
import { computed } from "vue"
import type { Team } from "@/modules/teams/types"
import type { Tournament } from "@/modules/tournament/types"
import TeamNameAuto from "@/modules/teams/components/TeamNameAuto.vue"
import { useTeamLookup } from "@/composables/useTeamLookup"

const props = defineProps<{
  tournament: Tournament
  teams: Team[]
}>()

const { teamById } = useTeamLookup(() => props.teams)

const rankIdx = computed(() => props.tournament.qualifiersPerGroup ?? 2)
const wildcardCount = computed(() => props.tournament.wildcardCount ?? 0)

const candidates = computed(() => {
  const groups = props.tournament.groups ?? []
  const rows: {
    teamId: string
    groupName: string
    played: number
    won: number
    drawn: number
    lost: number
    gf: number
    ga: number
    gd: number
    pts: number
  }[] = []

  for (const group of groups) {
    const s = group.standings[rankIdx.value]
    if (!s) continue
    rows.push({
      teamId: s.teamId,
      groupName: group.name,
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

  rows.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)
  return rows
})
</script>

<template>
  <div class="wc-wrap">
    <div class="wc-header">
      <span class="wc-title">Wildcard Race</span>
      <span class="wc-sub">
        Best {{ wildcardCount }} of {{ candidates.length }} runners-up advance
      </span>
    </div>

    <div class="wc-table-scroll">
      <table class="wc-table">
        <thead>
          <tr>
            <th class="col-rank">#</th>
            <th class="col-group">Group</th>
            <th class="col-team">Team</th>
            <th title="Played">P</th>
            <th title="Won">W</th>
            <th title="Drawn">D</th>
            <th title="Lost">L</th>
            <th title="Goals For">GF</th>
            <th title="Goals Against">GA</th>
            <th title="Goal Difference">GD</th>
            <th title="Points">Pts</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, ri) in candidates"
            :key="row.teamId"
            :class="ri < wildcardCount ? 'row-advance' : 'row-out'"
          >
            <td class="col-rank">{{ ri + 1 }}</td>
            <td class="col-group">{{ row.groupName }}</td>
            <td class="col-team">
              <span class="team-cell">
                <span class="dot" :style="{ background: teamById(row.teamId)?.color ?? '#888' }" />
                <TeamNameAuto :team="teamById(row.teamId)" :fallback="row.teamId" />
              </span>
            </td>
            <td>{{ row.played }}</td>
            <td>{{ row.won }}</td>
            <td>{{ row.drawn }}</td>
            <td>{{ row.lost }}</td>
            <td>{{ row.gf }}</td>
            <td>{{ row.ga }}</td>
            <td>{{ row.gd >= 0 ? "+" + row.gd : row.gd }}</td>
            <td class="col-pts">{{ row.pts }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="candidates.length === 0" class="wc-empty">Group stage not started yet.</div>
  </div>
</template>

<style scoped>
.wc-wrap {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.wc-header {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
  padding: 0 8px;
}

.wc-title {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.03em;
}

.wc-sub {
  font-size: 11px;
  color: var(--text-muted);
}

.wc-table-scroll {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  padding: 0 8px;
}

.wc-table {
  border-collapse: collapse;
  width: 100%;
  font-size: 12px;
}

.wc-table th,
.wc-table td {
  border: none;
  border-bottom: 1px solid var(--border-light);
  padding: 5px 7px;
  text-align: center;
}

.wc-table tbody tr:last-child td {
  border-bottom: none;
}

.wc-table th {
  background: var(--bg);
  font-weight: 600;
  font-size: 11px;
  color: var(--text-muted);
}

.col-rank {
  width: 20px;
  color: var(--text-muted);
  font-size: 11px;
}

.col-group {
  font-size: 11px;
  color: var(--text-muted);
  white-space: nowrap;
}

.col-team {
  text-align: left;
  min-width: 110px;
}

.col-pts {
  font-weight: 700;
}

.row-advance {
  background: color-mix(in srgb, var(--accent) 6%, transparent);
}

.row-advance td:first-child {
  border-left: 3px solid var(--accent);
}

.row-out {
  opacity: 0.6;
}

.team-cell {
  display: flex;
  align-items: center;
  gap: 6px;
}

.dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.wc-empty {
  font-size: 12px;
  color: var(--text-muted);
  padding: 12px 8px;
  text-align: center;
}
</style>
