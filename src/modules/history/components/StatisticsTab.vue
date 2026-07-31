<script setup lang="ts">
import { Zap, Shield, Flame, Star, Trophy } from "@lucide/vue"
import { useI18n } from "vue-i18n"
import { AppCard, AppChip, AppIcon } from "@/components/ui"
import TeamBadge from "@/modules/teams/components/TeamBadge.vue"

export interface BiggestWin {
  score: string
  winnerName: string
  winnerColor: string
  winnerFlag?: string
  loserName: string
  loserColor: string
  loserFlag?: string
}

export interface RecordTeam {
  name: string
  color: string
  flag?: string
  count: number
}

export interface HistoryStats {
  totalSeasons: number
  totalMatches: number
  totalGoals: number
  avgGoals: string
  topScoringTeam: { name: string; color: string; flag?: string; goals: number } | null
  biggestWin: BiggestWin | null
  mostCleanSheets: RecordTeam | null
  firstChampion: { name: string; color: string; flag?: string; season: number } | null
  longestStreak: RecordTeam | null
  currentStreak: RecordTeam | null
}

defineProps<{ stats: HistoryStats }>()

const { t } = useI18n()
</script>

<template>
  <div class="stack">
    <AppCard padding="md">
      <div class="stats-grid">
        <AppCard variant="filled" padding="md" class="stat-card">
          <div class="stat-value">{{ stats.totalSeasons }}</div>
          <div class="stat-label">{{ t("history.stats.completedSeasons") }}</div>
        </AppCard>
        <AppCard variant="filled" padding="md" class="stat-card">
          <div class="stat-value">{{ stats.totalMatches }}</div>
          <div class="stat-label">{{ t("history.stats.totalMatches") }}</div>
        </AppCard>
        <AppCard variant="filled" padding="md" class="stat-card">
          <div class="stat-value">{{ stats.totalGoals }}</div>
          <div class="stat-label">{{ t("history.stats.totalGoals") }}</div>
        </AppCard>
        <AppCard variant="filled" padding="md" class="stat-card">
          <div class="stat-value">{{ stats.avgGoals }}</div>
          <div class="stat-label">{{ t("history.stats.goalsPerMatch") }}</div>
        </AppCard>
      </div>
    </AppCard>

    <AppCard
      v-if="stats.biggestWin || stats.topScoringTeam || stats.mostCleanSheets"
      padding="md"
      :title="t('history.stats.records')"
    >
      <div class="record-list">
        <div v-if="stats.biggestWin" class="record-row">
          <AppIcon :icon="Zap" size="xs" class="record-icon" />
          <div class="record-key">{{ t("history.stats.biggestWin") }}</div>
          <div class="record-val">
            <TeamBadge
              :team="{
                name: stats.biggestWin.winnerName,
                color: stats.biggestWin.winnerColor,
                flag: stats.biggestWin.winnerFlag,
              }"
            />
            <AppChip square class="score-chip">{{ stats.biggestWin.score }}</AppChip>
            <TeamBadge
              :team="{
                name: stats.biggestWin.loserName,
                color: stats.biggestWin.loserColor,
                flag: stats.biggestWin.loserFlag,
              }"
            />
          </div>
        </div>

        <div v-if="stats.topScoringTeam" class="record-row">
          <AppIcon :icon="Trophy" size="xs" class="record-icon" />
          <div class="record-key">{{ t("history.stats.topScorer") }}</div>
          <div class="record-val">
            <TeamBadge :team="stats.topScoringTeam" />
            <span class="record-num">
              {{ t("history.stats.goals", { n: stats.topScoringTeam.goals }) }}
            </span>
          </div>
        </div>

        <div v-if="stats.mostCleanSheets" class="record-row">
          <AppIcon :icon="Shield" size="xs" class="record-icon" />
          <div class="record-key">{{ t("history.stats.cleanSheets") }}</div>
          <div class="record-val">
            <TeamBadge :team="stats.mostCleanSheets" />
            <span class="record-num">{{ stats.mostCleanSheets.count }}</span>
          </div>
        </div>
      </div>
    </AppCard>

    <AppCard
      v-if="stats.firstChampion || stats.longestStreak || stats.currentStreak"
      padding="md"
      :title="t('history.stats.achievements')"
    >
      <div class="badge-grid">
        <AppCard v-if="stats.firstChampion" variant="filled" padding="sm" class="badge-card">
          <AppIcon :icon="Star" size="sm" class="badge-icon badge-star" />
          <div class="badge-title">{{ t("history.stats.firstChampion") }}</div>
          <div class="badge-team">
            <TeamBadge :team="stats.firstChampion" />
          </div>
          <div class="badge-meta">
            {{ t("history.stats.season", { n: stats.firstChampion.season }) }}
          </div>
        </AppCard>

        <AppCard v-if="stats.longestStreak" variant="filled" padding="sm" class="badge-card">
          <AppIcon :icon="Flame" size="sm" class="badge-icon badge-flame" />
          <div class="badge-title">{{ t("history.stats.longestStreak") }}</div>
          <div class="badge-team">
            <TeamBadge :team="stats.longestStreak" />
          </div>
          <div class="badge-meta">
            {{ t("history.stats.inARow", { n: stats.longestStreak.count }) }}
          </div>
        </AppCard>

        <AppCard
          v-if="stats.currentStreak"
          variant="filled"
          padding="sm"
          class="badge-card badge-card--current"
        >
          <AppIcon :icon="Trophy" size="sm" class="badge-icon badge-trophy" />
          <div class="badge-title">{{ t("history.stats.defending") }}</div>
          <div class="badge-team">
            <TeamBadge :team="stats.currentStreak" />
          </div>
          <div class="badge-meta">
            {{ t("history.stats.consecutive", { n: stats.currentStreak.count }) }}
          </div>
        </AppCard>
      </div>
    </AppCard>
  </div>
</template>

<style scoped>
/* ── Summary tiles ───────────────────────────────────────────── */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: var(--sp-3);
}

.stat-card :deep(.card-body) {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
}

.stat-value {
  font-size: var(--fs-2xl);
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1;
}

.stat-label {
  font-size: var(--fs-xs);
  color: var(--text-muted);
  font-weight: 500;
  font-family: var(--font-ui);
}

/* ── Records ─────────────────────────────────────────────────── */
.record-list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

.record-row {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  font-size: var(--fs-sm);
}

.record-icon {
  color: var(--text-muted);
}

.record-key {
  min-width: 88px;
  flex-shrink: 0;
  color: var(--text-muted);
  font-weight: 600;
  font-family: var(--font-ui);
  font-size: var(--fs-xs);
}

.record-val {
  display: flex;
  align-items: center;
  gap: var(--sp-1);
  flex-wrap: wrap;
  font-weight: 500;
}

.score-chip {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.record-num {
  color: var(--text-muted);
  font-size: var(--fs-xs);
}

/* ── Achievements ────────────────────────────────────────────── */
.badge-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: var(--sp-2);
}

.badge-card :deep(.card-body) {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
}

.badge-card--current {
  border-color: var(--accent);
}

.badge-icon {
  margin-bottom: 2px;
}
.badge-star {
  color: var(--medal-gold);
}
.badge-flame {
  color: var(--danger);
}
.badge-trophy {
  color: var(--accent);
}

.badge-title {
  font-size: var(--fs-xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  font-family: var(--font-ui);
}

.badge-team {
  display: flex;
  align-items: center;
  gap: var(--sp-1);
  font-size: var(--fs-base);
  font-weight: 600;
}

.badge-meta {
  font-size: var(--fs-xs);
  color: var(--text-muted);
}

@media (max-width: 600px) {
  .stats-grid,
  .badge-grid {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
