<script setup lang="ts">
export interface HistoryStats {
  totalSeasons: number
  totalMatches: number
  totalGoals: number
  avgGoals: string
}

defineProps<{ stats: HistoryStats }>()
</script>

<template>
  <div class="section-box stats-section">
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">{{ stats.totalSeasons }}</div>
        <div class="stat-label">Completed Seasons</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ stats.totalMatches }}</div>
        <div class="stat-label">Total Matches</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ stats.totalGoals }}</div>
        <div class="stat-label">Total Goals</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ stats.avgGoals }}</div>
        <div class="stat-label">Goals per Match</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.section-box {
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-radius: 8px;
  overflow: hidden;
}
.stats-section {
  padding: 16px;
}
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px;
}
.stat-card {
  background: var(--bg);
  border: 1px solid var(--border-light);
  border-radius: 8px;
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

@media (max-width: 600px) {
  .stats-grid {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
