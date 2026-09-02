<script setup lang="ts">
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { FlaskConical, Trophy, Star, Shield } from "@lucide/vue"
import { AppCard, AppIcon } from "@/components/ui"
import { SAMPLE_DATASETS, useDataManagement } from "../composables/useDataManagement"

const { t } = useI18n()
const { loadDataset } = useDataManagement()

const isUefaCompetition = (label: string) =>
  label.includes("Champions League") ||
  label.includes("Europa League") ||
  label.includes("Conference League")

const uefaDatasets = computed(() => SAMPLE_DATASETS.filter((ds) => isUefaCompetition(ds.label)))
const otherClubDatasets = computed(() =>
  SAMPLE_DATASETS.filter((ds) => ds.type === "club" && !isUefaCompetition(ds.label))
)
const countryDatasets = computed(() => SAMPLE_DATASETS.filter((ds) => ds.type === "country"))

function getUefaIcon(label: string) {
  if (label.includes("Champions League")) return Trophy
  if (label.includes("Europa League")) return Star
  return Shield
}
</script>

<template>
  <AppCard padding="md">
    <template #title>
      <AppIcon :icon="FlaskConical" size="md" />
      {{ t("settings.sampleData.title") }}
    </template>

    <p class="section-intro">{{ t("settings.sampleData.intro") }}</p>

    <!-- UEFA Competitions – Featured -->
    <h3 class="dataset-group-title uefa-title">
      <span class="uefa-badge">UEFA</span>
      European Competitions
    </h3>
    <div class="uefa-grid">
      <button
        v-for="ds in uefaDatasets"
        :key="ds.label"
        type="button"
        class="uefa-card"
        @click="loadDataset(ds)"
      >
        <AppIcon :icon="getUefaIcon(ds.label)" size="lg" class="uefa-icon" />
        <span class="uefa-name">{{ ds.label }}</span>
        <span class="uefa-desc">{{ ds.description }}</span>
      </button>
    </div>

    <!-- Other Club Datasets -->
    <template v-if="otherClubDatasets.length">
      <h3 class="dataset-group-title">{{ t("settings.sampleData.clubs") }}</h3>
      <div class="dataset-grid">
        <button
          v-for="ds in otherClubDatasets"
          :key="ds.label"
          type="button"
          class="dataset-card"
          @click="loadDataset(ds)"
        >
          <span class="dataset-name">
            {{ ds.label }}
            <span v-if="ds.players?.length" class="dataset-squads">
              {{ t("settings.sampleData.withSquads") }}
            </span>
          </span>
          <span class="dataset-desc">{{ ds.description }}</span>
        </button>
      </div>
    </template>

    <!-- Country Datasets -->
    <template v-if="countryDatasets.length">
      <h3 class="dataset-group-title">{{ t("settings.sampleData.countries") }}</h3>
      <div class="dataset-grid">
        <button
          v-for="ds in countryDatasets"
          :key="ds.label"
          type="button"
          class="dataset-card"
          @click="loadDataset(ds)"
        >
          <span class="dataset-name">
            {{ ds.label }}
            <span v-if="ds.players?.length" class="dataset-squads">
              {{ t("settings.sampleData.withSquads") }}
            </span>
          </span>
          <span class="dataset-desc">{{ ds.description }}</span>
        </button>
      </div>
    </template>
  </AppCard>
</template>

<style scoped>
/* ── Group Titles ── */
.dataset-group-title {
  font-size: var(--fs-sm);
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.02em;
  margin: var(--sp-5) 0 var(--sp-2);
}
.dataset-group-title:first-of-type {
  margin-top: var(--sp-1);
}

.uefa-title {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  color: var(--text);
  font-weight: 700;
}

.uefa-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: var(--radius-pill);
  background: linear-gradient(135deg, #003399, #0055a4);
  color: #fff;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
}

/* ── UEFA Featured Cards ── */
.uefa-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--sp-3);
}

.uefa-card {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-3) var(--sp-4);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--surface);
  color: var(--text);
  cursor: pointer;
  text-align: start;
  transition:
    border-color var(--dur-fast) var(--ease),
    background var(--dur-fast) var(--ease),
    box-shadow var(--dur-fast) var(--ease);
}
.uefa-card:hover {
  border-color: var(--accent);
  background: var(--border-light);
  box-shadow: 0 2px 12px color-mix(in srgb, var(--accent) 12%, transparent);
}

.uefa-icon {
  flex-shrink: 0;
  color: var(--accent);
  opacity: 0.8;
}

.uefa-name {
  font-size: var(--fs-sm);
  font-weight: 700;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.uefa-desc {
  display: none;
}

@media (max-width: 600px) {
  .uefa-grid {
    grid-template-columns: 1fr;
    gap: var(--sp-2);
  }

  .uefa-card {
    padding: var(--sp-3);
  }
}

/* ── Standard Dataset Grid ── */
.dataset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: var(--sp-2);
}

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
  text-align: start;
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
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  font-size: var(--fs-base);
  font-weight: 600;
}

.dataset-squads {
  flex-shrink: 0;
  padding: 1px var(--sp-2);
  border-radius: var(--radius-pill);
  background: var(--accent-subtle);
  border: 1px solid color-mix(in srgb, var(--accent) 35%, transparent);
  color: var(--accent);
  font-family: var(--font-ui);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.dataset-desc {
  font-size: var(--fs-xs);
  color: var(--text-muted);
}
</style>
