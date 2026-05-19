<script setup lang="ts">
import { ref, computed } from "vue"
import type { Team } from "@/modules/teams/types"
import type { Tournament } from "@/modules/tournament/types"
import { getWinnerId } from "@/engine/logic"

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

interface Row {
  team: Team
  isWinner: boolean
  eliminatedRound: string | null
  eliminatedRoundIdx: number
}

const rows = computed<Row[]>(() => {
  return props.teams
    .filter((t) => props.tournament.teamIds.includes(t.id))
    .map((team): Row => {
      // Tournament winner
      if (props.tournament.winnerId === team.id) {
        return { team, isWinner: true, eliminatedRound: null, eliminatedRoundIdx: -1 }
      }

      // ── Group + Bracket format ──────────────────────────────
      if (props.tournament.format === "group+bracket") {
        // 1) Check knockout rounds first (if bracket has been seeded)
        if (props.tournament.groupsDone) {
          for (let ri = 0; ri < props.tournament.rounds.length; ri++) {
            const round = props.tournament.rounds[ri]
            for (const match of round.matches) {
              if ((match.homeId === team.id || match.awayId === team.id) && match.result) {
                const winnerId = getWinnerId(match)
                if (winnerId && winnerId !== team.id) {
                  return {
                    team,
                    isWinner: false,
                    eliminatedRound: round.name,
                    // offset by 1000 so knockout always sorts after group eliminations
                    eliminatedRoundIdx: 1000 + ri,
                  }
                }
              }
            }
          }
        }

        // 2) Check if team qualified from groups
        const qualified = props.tournament.groupsDone
          ? props.tournament.rounds[0]?.matches.some(
              (m) => m.homeId === team.id || m.awayId === team.id
            )
          : false

        // 3) Find the group this team belongs to
        const groupIdx =
          props.tournament.groups?.findIndex((g) => g.teamIds.includes(team.id)) ?? -1
        const group = groupIdx >= 0 ? props.tournament.groups![groupIdx] : null

        if (group) {
          const allGroupMatchesDone = group.matches.every((m) => m.result !== null)

          if (allGroupMatchesDone && !qualified && props.tournament.groupsDone) {
            // Eliminated in group stage — find their group name
            return {
              team,
              isWinner: false,
              eliminatedRound: `${group.name}`,
              eliminatedRoundIdx: -1,
            }
          }

          if (allGroupMatchesDone && !qualified && !props.tournament.groupsDone) {
            // Groups done but bracket not seeded yet
            return {
              team,
              isWinner: false,
              eliminatedRound: `${group.name}`,
              eliminatedRoundIdx: -1,
            }
          }
        }

        // Still in tournament (group not finished or qualified and in bracket)
        return { team, isWinner: false, eliminatedRound: null, eliminatedRoundIdx: -1 }
      }

      // ── Pure bracket format ──────────────────────────────────
      for (let ri = 0; ri < props.tournament.rounds.length; ri++) {
        const round = props.tournament.rounds[ri]
        for (const match of round.matches) {
          if ((match.homeId === team.id || match.awayId === team.id) && match.result) {
            const winnerId = getWinnerId(match)
            if (winnerId && winnerId !== team.id) {
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

    const score = (r: Row) => {
      if (r.isWinner) return sortAsc.value ? -1000 : 10000
      if (r.eliminatedRoundIdx === -1) return sortAsc.value ? 999 : -1
      return sortAsc.value ? 100 - r.eliminatedRoundIdx : r.eliminatedRoundIdx
    }
    return score(a) - score(b)
  })
})

function eliminationLabel(row: Row): string {
  if (!row.eliminatedRound) return ""
  // Group elimination
  if (props.tournament.format === "group+bracket" && row.eliminatedRoundIdx === -1) {
    return `Eliminated · ${row.eliminatedRound}`
  }
  return `Eliminated · ${row.eliminatedRound}`
}
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
          <span class="flex team-cell">
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
            {{ eliminationLabel(row) }}
          </span>
          <span v-else class="pending">—</span>
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
.team-cell {
  gap: 6px;
}
.pending {
  color: var(--text-muted);
  font-size: 12px;
}
.tag {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 2px;
  font-size: 12px;
  color: #fff;
}
</style>
