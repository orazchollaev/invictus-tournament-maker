<script setup lang="ts">
import { computed, ref } from "vue"
import type { Team } from "@/modules/teams/types"
import type { Group, GroupMatch } from "@/modules/tournament/types"
import { useTeamLookup } from "@/composables/useTeamLookup"
import TeamBadge from "@/modules/teams/components/TeamBadge.vue"
import { AppCard, AppTable } from "@/components/ui"
import { Shuffle } from "@lucide/vue"
import { useI18n } from "vue-i18n"
import MatchScoreModal from "../MatchScoreModal.vue"
import MatchStatsButton from "../match-stats/MatchStatsButton.vue"

const props = defineProps<{
  group: Group
  teams: Team[]
  locked: boolean
  qualifiersPerGroup: number
  wildcardCount: number
}>()

const round = defineModel<number>("round", { default: 0 })

const emit = defineEmits<{
  simMatch: [matchIdx: number]
  simGroupWeek: []
  setResult: [matchIdx: number, home: number, away: number]
  clearResult: [matchIdx: number]
}>()

const { t } = useI18n()
const { teamById } = useTeamLookup(() => props.teams)

/* Scores are entered in the modal: a group row is one line tall and cannot
   hold a stepper, an input and a simulate button without crushing the names. */
const editingIdx = ref<number | null>(null)
const editingMatch = computed(() =>
  editingIdx.value === null ? null : (props.group.matches[editingIdx.value] ?? null)
)

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
  <AppCard variant="outlined" :title="group.name">
    <!-- Standings -->
    <AppTable dense class="gs-table">
      <thead>
        <tr>
          <th class="col-rank">#</th>
          <th class="col-team">{{ t("common.team") }}</th>
          <th :title="t('history.table.played')">P</th>
          <th :title="t('history.table.won')">W</th>
          <th :title="t('history.table.drawn')">D</th>
          <th :title="t('history.table.lost')">L</th>
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
          <td class="col-team" :style="{ '--tc': teamById(row.teamId)?.color ?? 'transparent' }">
            <TeamBadge
              :team="teamById(row.teamId)"
              :fallback="row.teamId"
              class="flex team-cell"
              :size="14"
            />
          </td>
          <td>{{ row.played }}</td>
          <td>{{ row.won }}</td>
          <td>{{ row.drawn }}</td>
          <td>{{ row.lost }}</td>
          <td>{{ row.gd >= 0 ? "+" + row.gd : row.gd }}</td>
          <td class="col-pts">{{ row.pts }}</td>
        </tr>
      </TransitionGroup>
    </AppTable>

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
        <TeamBadge
          :team="teamById(match.homeId)"
          :size="16"
          reverse
          class="gs-team gs-team--home"
        />

        <button
          class="gs-score-btn"
          :class="{ 'gs-score-btn--locked': locked }"
          :style="
            match.result ? { borderColor: scoreAccentColor(match), borderLeftWidth: '3px' } : {}
          "
          :disabled="locked"
          @click="editingIdx = mi"
        >
          {{ matchResultStr(match) }}
        </button>

        <TeamBadge :team="teamById(match.awayId)" :size="16" class="gs-team gs-team--away" />

        <span class="gs-report">
          <MatchStatsButton
            :home-team="teamById(match.homeId)"
            :away-team="teamById(match.awayId)"
            :result="match.result"
            :subtitle="group.name"
            size="xs"
          />
        </span>
      </div>
    </div>

    <!-- Inside the card, so the component keeps a single root element. -->
    <MatchScoreModal
      v-if="editingMatch && editingIdx !== null && !locked"
      :home-team="teamById(editingMatch.homeId)"
      :away-team="teamById(editingMatch.awayId)"
      :result="editingMatch.result"
      :subtitle="group.name"
      @save="(h, a) => emit('setResult', editingIdx!, h, a)"
      @simulate="emit('simMatch', editingIdx!)"
      @clear="emit('clearResult', editingIdx!)"
      @close="editingIdx = null"
    />
  </AppCard>
</template>

<style scoped>
.gs-table :deep(thead th),
.gs-table :deep(tbody td) {
  text-align: center;
}
.gs-table .col-rank {
  width: 18px;
  color: var(--text-muted);
}

.gs-table .col-team {
  position: relative;
  text-align: start;
  min-width: 0;
  max-width: 120px;
  padding-inline-start: 11px;
}
.gs-table .col-team::before {
  content: "";
  position: absolute;
  left: 2px;
  top: 3px;
  bottom: 3px;
  width: 3px;
  border-radius: 1px;
  background: var(--tc, transparent);
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.18);
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
  padding: var(--sp-1) var(--sp-2) var(--sp-2);
  display: flex;
  flex-direction: column;
  gap: 2px;
  border-top: 1px solid var(--border-light);
}
.gs-round-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sp-1) 0;
  border-bottom: 1px solid var(--border-light);
  margin-bottom: var(--sp-1);
}
.gs-round-label {
  font-size: var(--fs-xs);
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.gs-round-btns {
  display: flex;
  gap: 3px;
}

.gs-report {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.gs-match {
  display: grid;
  grid-template-columns: 1fr auto 1fr 18px;
  align-items: center;
  gap: var(--sp-2);
  font-size: var(--fs-base);
  padding: var(--sp-1) 0;
}
.gs-team {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  min-width: 0;
}

.gs-team :deep(.name) {
  font-size: var(--fs-base);
}
.gs-team--home {
  justify-content: flex-end;
  text-align: end;
}
.gs-team--away {
  justify-content: flex-start;
}

.gs-score-btn {
  font-family: var(--font);
  font-size: var(--fs-md);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  justify-content: center;
  background: var(--bg);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  cursor: pointer;
  flex-shrink: 0;
  display: flex;
  color: var(--text-muted);
  padding: var(--sp-1) var(--sp-2);
  min-width: 60px;
}
.gs-score-btn:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent);
}
.gs-score-btn--locked {
  cursor: default;
  pointer-events: none;
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

  .gs-table th:nth-child(5),
  .gs-table td:nth-child(5) {
    display: none;
  }
}
</style>
