<script setup lang="ts">
import { ref, computed } from "vue"
import type { Team } from "@/modules/teams/types"
import type { Tournament } from "@/modules/tournament/types"

const props = defineProps<{ teams: Team[]; tournament: Tournament }>()

type SortKey = "power" | "result"
const sortKey = ref<SortKey>("result")
const sortAsc = ref(true)

function toggleSort(key: SortKey) {
  if (sortKey.value === key) sortAsc.value = !sortAsc.value
  else {
    sortKey.value = key
    sortAsc.value = false
  }
}

// Result order: winner first, then eliminated by round (latest first), then TBD
// const RESULT_ORDER = { winner: 0, tbd: 99 }

interface Row {
  team: Team
  isWinner: boolean
  eliminatedRound: string | null
  eliminatedRoundIdx: number // for sorting
}

const rows = computed<Row[]>(() => {
  return props.teams
    .filter((t) => props.tournament.teamIds.includes(t.id))
    .map((team) => {
      if (props.tournament.winnerId === team.id) {
        return { team, isWinner: true, eliminatedRound: null, eliminatedRoundIdx: -1 }
      }
      // Find elimination round
      for (let ri = 0; ri < props.tournament.rounds.length; ri++) {
        const round = props.tournament.rounds[ri]
        for (const match of round.matches) {
          if ((match.homeId === team.id || match.awayId === team.id) && match.result) {
            const loser = match.result.home > match.result.away ? match.awayId : match.homeId
            if (loser === team.id) {
              return { team, isWinner: false, eliminatedRound: round.name, eliminatedRoundIdx: ri }
            }
          }
        }
      }
      return { team, isWinner: false, eliminatedRound: null, eliminatedRoundIdx: -1 }
    })
})

const sorted = computed(() => {
  return [...rows.value].sort((a, b) => {
    if (sortKey.value === "power") {
      const diff = b.team.power - a.team.power
      return sortAsc.value ? -diff : diff
    }
    // result sort:
    // asc  → winner first, latest eliminated → earliest, TBD last
    // desc → TBD first, earliest eliminated, winner last
    const score = (r: Row) => {
      if (r.isWinner) return sortAsc.value ? -1 : 999
      if (r.eliminatedRoundIdx === -1) return sortAsc.value ? 999 : -1
      // later round = better finish → lower score when asc
      return sortAsc.value ? 100 - r.eliminatedRoundIdx : r.eliminatedRoundIdx
    }
    return score(a) - score(b)
  })
})
</script>

<template>
  <table>
    <thead>
      <tr>
        <th>Team</th>
        <th class="sortable" @click="toggleSort('power')">
          Power
          <span class="sort-icon">{{ sortKey === "power" ? (sortAsc ? "↑" : "↓") : "↕" }}</span>
        </th>
        <th class="sortable" @click="toggleSort('result')">
          Result
          <span class="sort-icon">{{ sortKey === "result" ? (sortAsc ? "↑" : "↓") : "↕" }}</span>
        </th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="row in sorted" :key="row.team.id">
        <td>
          <span class="flex" style="gap: 6px">
            <span class="dot" :style="{ background: row.team.color }" />
            {{ row.team.name }}
          </span>
        </td>
        <td>{{ row.team.power }}</td>
        <td>
          <span v-if="row.isWinner" class="tag" :style="{ background: row.team.color }">
            Winner
          </span>
          <span v-else-if="row.eliminatedRound !== null" class="elim">
            Eliminated ·
            <span class="round-name">{{ row.eliminatedRound }}</span>
          </span>
          <span v-else style="color: var(--text-muted); font-size: 12px">—</span>
        </td>
      </tr>
    </tbody>
  </table>
</template>

<style scoped>
table {
  border-collapse: collapse;
  width: 100%;
}
th,
td {
  border: 1px solid var(--border-light);
  padding: 6px 10px;
  text-align: left;
}
th {
  background: var(--bg);
  font-weight: 600;
  font-size: 13px;
}
th.sortable {
  cursor: pointer;
  user-select: none;
}
th.sortable:hover {
  background: var(--border-light);
}
.sort-icon {
  color: var(--text-muted);
  font-size: 11px;
  margin-left: 2px;
}
.dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
.elim {
  font-size: 12px;
  color: var(--text-muted);
}
.round-name {
  color: var(--text);
  font-style: italic;
}
</style>
