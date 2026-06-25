<script setup lang="ts">
import { useI18n } from "vue-i18n"
import { FlaskConical } from "@lucide/vue"
import { SAMPLE_DATASETS, useDataManagement } from "../composables/useDataManagement"

const { t } = useI18n()
const { loadDataset } = useDataManagement()
</script>

<template>
  <div class="section-box">
    <h2>
      <FlaskConical :size="15" class="section-icon" />
      {{ t("settings.sampleData.title") }}
    </h2>
    <div class="section-body" style="padding: 10px 8px">
      <p class="section-intro">{{ t("settings.sampleData.intro") }}</p>
      <div class="dataset-grid">
        <button
          v-for="ds in SAMPLE_DATASETS"
          :key="ds.label"
          class="dataset-card"
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
.dataset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 8px;
}
.dataset-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--text);
  cursor: pointer;
  text-align: left;
  transition:
    border-color 0.15s,
    background 0.15s;
}
.dataset-card:hover {
  border-color: var(--accent);
  background: var(--border-light);
}
.dataset-name {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
}
.dataset-desc {
  font-size: 11px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
}
</style>
