<script setup lang="ts">
import { Zap, Shield, Flame, Star, Trophy } from "@lucide/vue"
import { useI18n } from "vue-i18n"

export interface BiggestWin {
  score: string
  winnerName: string
  winnerColor: string
  loserName: string
  loserColor: string
}

export interface RecordTeam {
  name: string
  color: string
  count: number
}

export interface HistoryStats {
  totalSeasons: number
  totalMatches: number
  totalGoals: number
  avgGoals: string
  topScoringTeam: { name: string; color: string; goals: number } | null
  biggestWin: BiggestWin | null
  mostCleanSheets: RecordTeam | null
  firstChampion: { name: string; color: string; season: number } | null
  longestStreak: RecordTeam | null
  currentStreak: RecordTeam | null
}

defineProps<{ stats: HistoryStats }>()

const { t } = useI18n()
</script>

<template>
  <div class="stats-wrap">
    <!-- Summary cards -->
    <div class="section-box stats-section">
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">{{ stats.totalSeasons }}</div>
          <div class="stat-label">{{ t("history.stats.completedSeasons") }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.totalMatches }}</div>
          <div class="stat-label">{{ t("history.stats.totalMatches") }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.totalGoals }}</div>
          <div class="stat-label">{{ t("history.stats.totalGoals") }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.avgGoals }}</div>
          <div class="stat-label">{{ t("history.stats.goalsPerMatch") }}</div>
        </div>
      </div>
    </div>

    <!-- Records -->
    <div
      v-if="stats.biggestWin || stats.topScoringTeam || stats.mostCleanSheets"
      class="section-box records-section"
    >
      <div class="section-label">{{ t("history.stats.records") }}</div>
      <div class="record-list">
        <div v-if="stats.biggestWin" class="record-row">
          <Zap :size="12" class="record-icon" />
          <div class="record-key">{{ t("history.stats.biggestWin") }}</div>
          <div class="record-val">
            <span class="color-dot" :style="{ background: stats.biggestWin.winnerColor }" />
            {{ stats.biggestWin.winnerName }}
            <span class="score-chip">{{ stats.biggestWin.score }}</span>
            <span class="color-dot" :style="{ background: stats.biggestWin.loserColor }" />
            {{ stats.biggestWin.loserName }}
          </div>
        </div>
        <div v-if="stats.topScoringTeam" class="record-row">
          <Trophy :size="12" class="record-icon" />
          <div class="record-key">{{ t("history.stats.topScorer") }}</div>
          <div class="record-val">
            <span class="color-dot" :style="{ background: stats.topScoringTeam.color }" />
            {{ stats.topScoringTeam.name }}
            <span class="record-num">
              {{ t("history.stats.goals", { n: stats.topScoringTeam.goals }) }}
            </span>
          </div>
        </div>
        <div v-if="stats.mostCleanSheets" class="record-row">
          <Shield :size="12" class="record-icon" />
          <div class="record-key">{{ t("history.stats.cleanSheets") }}</div>
          <div class="record-val">
            <span class="color-dot" :style="{ background: stats.mostCleanSheets.color }" />
            {{ stats.mostCleanSheets.name }}
            <span class="record-num">{{ stats.mostCleanSheets.count }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Achievements -->
    <div
      v-if="stats.firstChampion || stats.longestStreak || stats.currentStreak"
      class="section-box badges-section"
    >
      <div class="section-label">{{ t("history.stats.achievements") }}</div>
      <div class="badge-grid">
        <div v-if="stats.firstChampion" class="badge-card">
          <Star :size="14" class="badge-icon badge-star" />
          <div class="badge-title">{{ t("history.stats.firstChampion") }}</div>
          <div class="badge-team">
            <span class="color-dot" :style="{ background: stats.firstChampion.color }" />
            {{ stats.firstChampion.name }}
          </div>
          <div class="badge-meta">
            {{ t("history.stats.season", { n: stats.firstChampion.season }) }}
          </div>
        </div>
        <div v-if="stats.longestStreak" class="badge-card">
          <Flame :size="14" class="badge-icon badge-flame" />
          <div class="badge-title">{{ t("history.stats.longestStreak") }}</div>
          <div class="badge-team">
            <span class="color-dot" :style="{ background: stats.longestStreak.color }" />
            {{ stats.longestStreak.name }}
          </div>
          <div class="badge-meta">
            {{ t("history.stats.inARow", { n: stats.longestStreak.count }) }}
          </div>
        </div>
        <div v-if="stats.currentStreak" class="badge-card badge-card--current">
          <Trophy :size="14" class="badge-icon badge-trophy" />
          <div class="badge-title">{{ t("history.stats.defending") }}</div>
          <div class="badge-team">
            <span class="color-dot" :style="{ background: stats.currentStreak.color }" />
            {{ stats.currentStreak.name }}
          </div>
          <div class="badge-meta">
            {{ t("history.stats.consecutive", { n: stats.currentStreak.count }) }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stats-wrap {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.section-box {
  overflow: hidden;
}
.stats-section {
  padding: 16px;
}
.records-section,
.badges-section {
  padding: 14px 16px;
}
.section-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  margin-bottom: 10px;
  font-family: var(--font-ui);
}

/* Stats grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px;
}
.stat-card {
  background: var(--bg);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  padding: 18px 16px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.stat-value {
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1;
}
.stat-label {
  font-size: 11px;
  color: var(--text-muted);
  font-weight: 500;
  font-family: var(--font-ui);
}

/* Records */
.record-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.record-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}
.record-icon {
  color: var(--text-muted);
  flex-shrink: 0;
}
.record-key {
  min-width: 88px;
  color: var(--text-muted);
  font-weight: 600;
  font-family: var(--font-ui);
  font-size: 11px;
  flex-shrink: 0;
}
.record-val {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
  font-weight: 500;
}
.score-chip {
  background: var(--bg);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  padding: 1px 6px;
  font-weight: 700;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}
.record-num {
  color: var(--text-muted);
  font-size: 11px;
}

/* Badges */
.badge-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 8px;
}
.badge-card {
  background: var(--bg);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.badge-card--current {
  border-color: var(--accent);
}
.badge-icon {
  margin-bottom: 2px;
}
.badge-star {
  color: var(--accent-2);
}
.badge-flame {
  color: var(--danger);
}
.badge-trophy {
  color: var(--accent);
}
.badge-title {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  font-family: var(--font-ui);
}
.badge-team {
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 5px;
}
.badge-meta {
  font-size: 11px;
  color: var(--text-muted);
}

@media (max-width: 600px) {
  .stats-grid {
    grid-template-columns: 1fr 1fr;
  }
  .badge-grid {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
