<script setup lang="ts">
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { FlaskConical } from "@lucide/vue"
import { AppCard, AppIcon } from "@/components/ui"
import { SAMPLE_DATASETS, useDataManagement } from "../composables/useDataManagement"

const { t } = useI18n()
const { loadDataset } = useDataManagement()

const countryDatasets = computed(() => SAMPLE_DATASETS.filter((ds) => ds.type === "country"))
const clubDatasets = computed(() => SAMPLE_DATASETS.filter((ds) => ds.type === "club"))
</script>

<template>
  <AppCard padding="md">
    <template #title>
      <AppIcon :icon="FlaskConical" size="md" />
      {{ t("settings.sampleData.title") }}
    </template>

    <p class="section-intro">{{ t("settings.sampleData.intro") }}</p>

    <h3 class="dataset-group-title">{{ t("settings.sampleData.countries") }}</h3>
    <div class="dataset-grid">
      <button
        v-for="ds in countryDatasets"
        :key="ds.label"
        type="button"
        class="dataset-card"
        @click="loadDataset(ds)"
      >
        <span class="dataset-name">{{ ds.label }}</span>
        <span class="dataset-desc">{{ ds.description }}</span>
      </button>
    </div>

    <h3 class="dataset-group-title">{{ t("settings.sampleData.clubs") }}</h3>
    <div class="dataset-grid">
      <button
        v-for="ds in clubDatasets"
        :key="ds.label"
        type="button"
        class="dataset-card"
        @click="loadDataset(ds)"
      >
        <span class="dataset-name">{{ ds.label }}</span>
        <span class="dataset-desc">{{ ds.description }}</span>
      </button>
    </div>
  </AppCard>
</template>

<style scoped>
.dataset-group-title {
  font-size: var(--fs-sm);
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.02em;
  margin: var(--sp-4) 0 var(--sp-2);
}
.dataset-group-title:first-of-type {
  margin-top: var(--sp-1);
}

.dataset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: var(--sp-2);
}

/* Not AppButton: this is a two-line content card that happens to be
   clickable, not a label-and-icon action. */
.dataset-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
  padding: var(--sp-3) var(--sp-4);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--text);
  cursor: pointer;
  text-align: left;
  transition:
    border-color var(--dur-fast) var(--ease),
    background var(--dur-fast) var(--ease);
}
.dataset-card:hover {
  border-color: var(--accent);
  background: var(--border-light);
}

.dataset-name,
.dataset-desc {
  width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dataset-name {
  font-size: var(--fs-base);
  font-weight: 600;
}

.dataset-desc {
  font-size: var(--fs-xs);
  color: var(--text-muted);
}
</style>
