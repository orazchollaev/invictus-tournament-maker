<script setup lang="ts">
import { useI18n } from "vue-i18n"
import { SAMPLE_DATASETS, useDataManagement } from "../composables/useDataManagement"

const { t } = useI18n()
const { loadDataset } = useDataManagement()
</script>

<template>
  <div class="section-box">
    <h2>{{ t("settings.sampleData.title") }}</h2>
    <div class="section-body">
      <p class="section-intro">{{ t("settings.sampleData.intro") }}</p>
      <div class="dataset-list">
        <button
          v-for="ds in SAMPLE_DATASETS"
          :key="ds.label"
          class="dataset-btn"
          @click="loadDataset(ds)"
        >
          <span class="dataset-name">{{ ds.label }}</span>
          <span class="dataset-desc">{{ ds.description }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dataset-list {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.dataset-btn {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 8px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--text);
  cursor: pointer;
  transition:
    border-color 0.15s,
    background 0.15s;
}
.dataset-btn:hover {
  border-color: var(--accent);
  background: var(--border-light);
}
.dataset-name {
  font-size: 13px;
  font-weight: 600;
}
.dataset-desc {
  font-size: 11px;
  color: var(--text-muted);
}
</style>
