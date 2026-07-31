<script setup lang="ts">
import { Trophy } from "@lucide/vue"
import { useI18n } from "vue-i18n"
import { AppCard } from "@/components/ui"

defineProps<{
  stats: {
    played: number
    wins: number
    draws: number
    losses: number
    gf: number
    ga: number
    winRate: number
  }
  titles: number
}>()

const { t } = useI18n()
</script>

<template>
  <AppCard padding="md" :title="t('teams.detail.allStats')">
    <div class="stats-grid">
      <div class="stat-cell">
        <span class="stat-value">{{ stats.played }}</span>
        <span class="stat-label">{{ t("teams.detail.played") }}</span>
      </div>
      <div class="stat-cell">
        <span class="stat-value stat-value--win">{{ stats.wins }}</span>
        <span class="stat-label">{{ t("teams.detail.wins") }}</span>
      </div>
      <div class="stat-cell">
        <span class="stat-value stat-value--draw">{{ stats.draws }}</span>
        <span class="stat-label">{{ t("teams.detail.draws") }}</span>
      </div>
      <div class="stat-cell">
        <span class="stat-value stat-value--loss">{{ stats.losses }}</span>
        <span class="stat-label">{{ t("teams.detail.losses") }}</span>
      </div>
      <div class="stat-cell">
        <span class="stat-value">{{ stats.winRate }}%</span>
        <span class="stat-label">{{ t("teams.detail.winRate") }}</span>
      </div>
      <div class="stat-cell">
        <span class="stat-value">{{ stats.gf }}</span>
        <span class="stat-label">{{ t("teams.detail.goalsFor") }}</span>
      </div>
      <div class="stat-cell">
        <span class="stat-value">{{ stats.ga }}</span>
        <span class="stat-label">{{ t("teams.detail.goalsAgainst") }}</span>
      </div>
      <div class="stat-cell">
        <span v-if="titles > 0" class="stat-value stat-value--trophy">
          <Trophy :size="16" />
          {{ titles }}
        </span>
        <span v-else class="stat-value">—</span>
        <span class="stat-label">{{ t("teams.detail.titles") }}</span>
      </div>
    </div>
  </AppCard>
</template>

<style scoped>
.stats-grid {
  display: flex;
  flex-wrap: wrap;
  border: 1px solid var(--border-light);
}

.stat-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--sp-3) var(--sp-5);
  border-right: 1px solid var(--border-light);
  min-width: 80px;
}
.stat-cell:last-child {
  border-right: none;
}

.stat-value {
  font-family: var(--font);
  font-size: var(--fs-xl);
  font-weight: 400;
  line-height: 1;
}
.stat-value--win {
  color: var(--success);
}
.stat-value--draw {
  color: var(--draw);
}
.stat-value--loss {
  color: var(--danger);
}
.stat-value--trophy {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-1);
  font-size: var(--fs-lg);
}

.stat-label {
  margin-top: var(--sp-1);
  font-size: var(--fs-xs);
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

@media (max-width: 600px) {
  .stat-cell {
    flex: 1 1 33%;
    border-bottom: 1px solid var(--border-light);
  }
}
</style>
