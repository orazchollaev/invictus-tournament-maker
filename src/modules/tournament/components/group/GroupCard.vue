<script setup lang="ts">
import { computed } from "vue"
import type { Team } from "@/modules/teams/types"
import type { Group, GroupMatch } from "@/modules/tournament/types"
import { useTeamLookup } from "@/composables/useTeamLookup"
import TeamBadge from "@/modules/teams/components/TeamBadge.vue"
import { Shuffle } from "@lucide/vue"
import { useI18n } from "vue-i18n"

const props = defineProps<{
  group: Group
  teams: Team[]
  locked: boolean
  qualifiersPerGroup: number
  wildcardCount: number
}>()

const round = defineModel<number>("round", { default: 0 })

defineEmits<{
  simMatch: [matchIdx: number]
  simGroupWeek: []
  openEdit: [matchIdx: number, match: GroupMatch]
}>()

const { t } = useI18n()
const { teamById } = useTeamLookup(() => props.teams)

const rounds = computed((): { match: GroupMatch; mi: number }[][] => {
  const n = props.group.teamIds.length
  const matchesPerRound = Math.floor(n / 2)
  if (matchesPerRound < 1) return [props.group.matches.map((match, mi) => ({ match, mi }))]
  const out: { match: GroupMatch; mi: number }[][] = []
  for (let i = 0; i < props.group.matches.length; i += matchesPerRound) {
    out.push(
      props.group.matches.slice(i, i + matchesPerRound).map((match, j) => ({ match, mi: i + j }))
    )
  }
  return out
})

function matchResultStr(match: GroupMatch): string {
  if (!match.result) return "–"
  return `${match.result.home} – ${match.result.away}`
}

function scoreAccentColor(match: GroupMatch): string {
  if (!match.result) return ""
  if (match.result.home > match.result.away) return teamById(match.homeId)?.color ?? ""
  if (match.result.away > match.result.home) return teamById(match.awayId)?.color ?? ""
  return "var(--border)"
}
</script>

<template>
  <div class="gs-group">
    <div class="gs-group-header">{{ group.name }}</div>

    <!-- Standings -->
    <div class="gs-table-scroll">
      <table class="gs-table">
        <thead>
          <tr>
            <th class="col-rank">#</th>
            <th class="col-team">{{ t("common.team") }}</th>
            <th :title="t('history.table.played')">P</th>
            <th :title="t('history.table.won')">W</th>
            <th :title="t('history.table.drawn')">D</th>
            <th :title="t('history.table.lost')">L</th>
            <th :title="t('history.table.goalsFor')">GF</th>
            <th :title="t('history.table.goalsAgainst')">GA</th>
            <th :title="t('history.table.goalDiff')">GD</th>
            <th :title="t('history.table.points')">Pts</th>
          </tr>
        </thead>
        <TransitionGroup tag="tbody" name="standing-row">
          <tr
            v-for="(row, ri) in group.standings"
            :key="row.teamId"
            :class="{
              'row-qualify': ri < qualifiersPerGroup,
              'row-wildcard': ri === qualifiersPerGroup && wildcardCount > 0,
              'row-out': ri > qualifiersPerGroup || (ri === qualifiersPerGroup && !wildcardCount),
            }"
          >
            <td class="col-rank">{{ ri + 1 }}</td>
            <td class="col-team">
              <TeamBadge :team="teamById(row.teamId)" :fallback="row.teamId" class="flex team-cell" />
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
        </TransitionGroup>
      </table>
    </div>

    <!-- Matches -->
    <div class="gs-matches">
      <div class="gs-round-nav">
        <span class="gs-round-label">Round {{ round + 1 }} / {{ rounds.length }}</span>
        <div class="gs-round-btns">
          <button
            v-if="!locked"
            class="btn-xs"
            :disabled="group.matches.every((m) => !!m.result)"
            @click="$emit('simGroupWeek')"
          >
            <Shuffle :size="11" />
          </button>
          <button class="btn-xs" :disabled="round === 0" @click="round--">‹</button>
          <button class="btn-xs" :disabled="round >= rounds.length - 1" @click="round++">›</button>
        </div>
      </div>
      <div v-for="{ match, mi } in rounds[round] ?? []" :key="match.id" class="gs-match">
        <TeamBadge :team="teamById(match.homeId)" reverse class="gs-team gs-team--home" />

        <button
          class="gs-score-btn"
          :class="{ 'gs-score-btn--locked': locked }"
          :style="
            match.result ? { borderColor: scoreAccentColor(match), borderLeftWidth: '3px' } : {}
          "
          :disabled="locked"
          @click="$emit('openEdit', mi, match)"
        >
          {{ matchResultStr(match) }}
        </button>

        <TeamBadge :team="teamById(match.awayId)" class="gs-team gs-team--away" />

        <button v-if="!locked" class="btn-xs sim-btn" @click="$emit('simMatch', mi)">
          <Shuffle :size="13" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.gs-group {
  border: 1px solid var(--border-light);
  background: var(--surface);
  border-radius: var(--radius);
  overflow: hidden;
}
.gs-group-header {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  padding: 7px 10px;
  background: var(--bg);
  border-bottom: 1px solid var(--border-light);
  color: var(--text-muted);
  border-left: 3px solid var(--accent);
}

.gs-table-scroll {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
.gs-table {
  border-collapse: collapse;
  width: 100%;
  font-size: 12px;
}
.gs-table th,
.gs-table td {
  border: none;
  border-bottom: 1px solid var(--border-light);
  padding: 4px 6px;
  text-align: center;
}
.gs-table tbody tr:last-child td {
  border-bottom: none;
}
.gs-table th {
  background: var(--bg);
  font-weight: 600;
  font-size: 11px;
  color: var(--text-muted);
}
.gs-table .col-rank {
  width: 18px;
  color: var(--text-muted);
  font-size: 11px;
}
.gs-table .col-team {
  text-align: left;
  min-width: 0;
  max-width: 120px;
}
.col-pts {
  font-weight: 700;
}
.row-qualify {
  background: color-mix(in srgb, var(--accent) 6%, transparent);
}
.row-qualify td:first-child {
  border-left: 3px solid var(--accent);
}
.row-wildcard {
  background: color-mix(in srgb, var(--accent) 3%, transparent);
}
.row-wildcard td:first-child {
  border-left: 3px dashed var(--accent);
}
.row-out {
  opacity: 0.65;
}

.gs-matches {
  padding: 4px 8px 6px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  border-top: 1px solid var(--border-light);
}
.gs-round-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 0 4px;
  border-bottom: 1px solid var(--border-light);
  margin-bottom: 4px;
}
.gs-round-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.gs-round-btns {
  display: flex;
  gap: 3px;
}
.gs-match {
  display: grid;
  grid-template-columns: 1fr auto 1fr auto;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  padding: 2px 0;
}
.gs-team {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
}
.gs-team--home {
  justify-content: flex-end;
  text-align: right;
}
.gs-team--away {
  justify-content: flex-start;
}

.gs-score-btn {
  font-family: var(--font);
  font-size: 12px;
  font-weight: 600;
  min-width: 48px;
  justify-content: center;
  padding: 2px 6px;
  background: var(--bg);
  border: 1px solid var(--border-light);
  cursor: pointer;
  flex-shrink: 0;
}
.gs-score-btn:hover:not(:disabled) {
  background: var(--border-light);
}
.gs-score-btn--locked {
  cursor: default;
  pointer-events: none;
}

.sim-btn {
  flex-shrink: 0;
  opacity: 0.55;
  font-size: 11px;
}
.sim-btn:hover {
  opacity: 1;
}

.team-cell {
  gap: 6px;
}
.flex {
  display: flex;
  align-items: center;
}

@media (max-width: 600px) {
  .gs-matches {
    max-height: none;
  }
  .gs-table .col-team {
    min-width: 90px;
  }

  /* Hide D, L, GF, GA — keep #, Team, P, W, GD, Pts */
  .gs-table th:nth-child(5),
  .gs-table td:nth-child(5),
  .gs-table th:nth-child(6),
  .gs-table td:nth-child(6),
  .gs-table th:nth-child(7),
  .gs-table td:nth-child(7),
  .gs-table th:nth-child(8),
  .gs-table td:nth-child(8) {
    display: none;
  }

  /* Bigger touch target for score and sim buttons */
  .gs-match {
    padding: 5px 0;
  }
  .gs-score-btn {
    min-width: 56px;
    padding: 5px 8px;
  }
}
</style>
