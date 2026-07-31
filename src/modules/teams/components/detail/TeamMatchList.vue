<script setup lang="ts">
import { useI18n } from "vue-i18n"
import { AppCard } from "@/components/ui"
import TeamBadge from "../TeamBadge.vue"
import type { Team } from "../../types"
import type { MatchRow, RoundPhase } from "../../composables/useTeamMatchHistory"

defineProps<{
  matches: MatchRow[]
  teams: Team[]
  tournamentOptions: { key: string; label: string }[]
}>()

const selected = defineModel<string>("selected", { required: true })

const { t } = useI18n()

const PHASE_LABEL: Record<RoundPhase, string> = { group: "GS", league: "LG", knockout: "KO" }
</script>

<template>
  <AppCard>
    <template #title>
      {{ t("teams.detail.matchHistory") }}
      <span class="count">{{ t("teams.detail.matchCount", { n: matches.length }) }}</span>
    </template>

    <template v-if="tournamentOptions.length > 1" #actions>
      <select v-model="selected" class="tour-select">
        <option value="all">{{ t("teams.detail.allTournaments") }}</option>
        <option v-for="opt in tournamentOptions" :key="opt.key" :value="opt.key">
          {{ opt.label }}
        </option>
      </select>
    </template>

    <div v-if="matches.length" class="match-list">
      <div v-for="(m, i) in matches" :key="i" class="match-row">
        <span class="outcome-badge" :class="`outcome-badge--${m.outcome.toLowerCase()}`">
          {{ m.outcome }}
        </span>

        <span class="match-score">
          {{ m.goalsFor }}–{{ m.goalsAgainst }}
          <span v-if="m.penGoalsFor !== null" class="pen-suffix">
            (p. {{ m.penGoalsFor }}–{{ m.penGoalsAgainst }})
          </span>
        </span>

        <span class="vs-label">vs</span>

        <TeamBadge :team-id="m.opponentId" :teams="teams" class="match-opponent" />

        <span class="match-round">
          <span class="phase-chip" :class="`phase-chip--${m.roundPhase}`">
            {{ PHASE_LABEL[m.roundPhase] }}
          </span>
          {{ m.round }}
        </span>

        <span class="match-tournament">{{ m.tournamentName }} S{{ m.tournamentSeason }}</span>
      </div>
    </div>

    <p v-else class="empty-text match-empty">
      {{
        selected === "all"
          ? t("teams.detail.noMatchesPlayed")
          : t("teams.detail.noMatchesTournament")
      }}
    </p>
  </AppCard>
</template>

<style scoped>
.tour-select {
  font-size: var(--fs-sm);
  font-family: var(--font-ui);
  color: var(--text);
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 2px var(--sp-2);
  cursor: pointer;
}
.tour-select:focus {
  border-color: var(--accent);
}

.match-list {
  max-height: 420px;
  overflow-y: auto;
}

.match-empty {
  padding: var(--sp-3);
}

.match-row {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-3);
  border-bottom: 1px solid var(--border-light);
  font-size: var(--fs-base);
  min-width: 0;
}
.match-row:last-child {
  border-bottom: none;
}

.outcome-badge {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius);
  font-size: var(--fs-xs);
  font-weight: 700;
  color: var(--on-accent);
}
.outcome-badge--w {
  background: var(--success);
}
.outcome-badge--d {
  background: var(--draw);
}
.outcome-badge--l {
  background: var(--danger);
}

.match-score {
  font-family: var(--font);
  font-size: var(--fs-base);
  text-align: center;
  flex-shrink: 0;
}

.pen-suffix {
  font-family: var(--font-ui);
  font-size: var(--fs-xs);
  color: var(--text-muted);
}

.vs-label {
  font-size: var(--fs-xs);
  color: var(--text-muted);
  flex-shrink: 0;
}

.match-opponent {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.match-round {
  display: flex;
  align-items: center;
  gap: var(--sp-1);
  font-size: var(--fs-xs);
  color: var(--text-muted);
  flex-shrink: 0;
}

.match-tournament {
  font-size: var(--fs-xs);
  color: var(--text-muted);
  flex-shrink: 0;
}

/* ── Phase chip ──────────────────────────────────────────────── */
.phase-chip {
  display: inline-block;
  padding: 1px var(--sp-1);
  border-radius: var(--radius);
  border: 1px solid transparent;
  font-size: var(--fs-xs);
  font-weight: 700;
  letter-spacing: 0.03em;
}
.phase-chip--group {
  background: color-mix(in srgb, var(--accent) 15%, transparent);
  border-color: color-mix(in srgb, var(--accent) 30%, transparent);
  color: var(--accent);
}
.phase-chip--knockout {
  background: color-mix(in srgb, var(--danger) 12%, transparent);
  border-color: color-mix(in srgb, var(--danger) 25%, transparent);
  color: var(--danger);
}
.phase-chip--league {
  background: color-mix(in srgb, var(--success) 12%, transparent);
  border-color: color-mix(in srgb, var(--success) 25%, transparent);
  color: var(--success);
}

@media (max-width: 600px) {
  .match-tournament {
    display: none;
  }
  .match-row {
    flex-wrap: wrap;
    row-gap: 2px;
  }
  .match-round {
    order: 5;
    flex: 1 1 100%;
  }
}
</style>
