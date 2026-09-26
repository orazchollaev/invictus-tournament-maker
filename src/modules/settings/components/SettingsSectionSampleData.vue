<script setup lang="ts">
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import {
  FlaskConical,
  Trophy,
  Star,
  Shield,
  Globe,
  CirclePlay,
  ListOrdered,
  History,
  Medal,
} from "@lucide/vue"
import { AppCard, AppEmptyState, AppIcon, AppSearchInput } from "@/components/ui"
import { FlagCircle } from "@/modules/teams/components"
import { SAMPLE_DATASETS, useDataManagement } from "../composables/useDataManagement"
import { useRewardedAd } from "@/composables/useRewardedAd"

const { t } = useI18n()
const { loadDataset } = useDataManagement()
const { nextSelectionShowsAd } = useRewardedAd()

/** How many flags to preview on a card before collapsing the rest into "+N". */
const FLAG_PREVIEW_LIMIT = 5

// Exact labels, not a substring match — a non-UEFA competition can still have
// "Champions League" in its name (e.g. the AFC one) without belonging here.
const UEFA_LABELS = new Set([
  "2026/27 Champions League",
  "2026/27 Europa League",
  "2026/27 Conference League",
])
const isUefaCompetition = (label: string) => UEFA_LABELS.has(label)

function getUefaIcon(label: string) {
  if (label.includes("Champions League")) return Trophy
  if (label.includes("Europa League")) return Star
  return Shield
}

const groups = computed(() => {
  const current = SAMPLE_DATASETS.filter((ds) => !ds.category)
  const uefa = current.filter((ds) => isUefaCompetition(ds.label))
  const leagues = SAMPLE_DATASETS.filter((ds) => ds.category === "league")
  const clubs = current.filter((ds) => ds.type === "club" && !isUefaCompetition(ds.label))
  const countries = current.filter((ds) => ds.type === "country")
  const classics = SAMPLE_DATASETS.filter((ds) => ds.category === "classic")
  const rankings = SAMPLE_DATASETS.filter((ds) => ds.category === "ranking")
  return [
    { key: "uefa", title: t("settings.sampleData.uefa"), icon: Trophy, items: uefa },
    { key: "leagues", title: t("settings.sampleData.leagues"), icon: ListOrdered, items: leagues },
    { key: "clubs", title: t("settings.sampleData.clubs"), icon: null, items: clubs },
    { key: "rankings", title: t("settings.sampleData.topClubs"), icon: Medal, items: rankings },
    { key: "countries", title: t("settings.sampleData.countries"), icon: Globe, items: countries },
    { key: "classics", title: t("settings.sampleData.classics"), icon: History, items: classics },
  ].filter((g) => g.items.length)
})

// The full list runs very long on a phone — a category chip narrows it to one
// section, and the search matches a dataset's name, description or any team in it.
const activeGroup = ref("all")
const query = ref("")

const filters = computed(() => [
  { key: "all", title: t("settings.sampleData.all") },
  ...groups.value.map((g) => ({ key: g.key, title: g.title })),
])

const visibleGroups = computed(() => {
  const q = query.value.trim().toLocaleLowerCase()
  const matches = (ds: (typeof SAMPLE_DATASETS)[number]) =>
    !q ||
    ds.label.toLocaleLowerCase().includes(q) ||
    ds.description.toLocaleLowerCase().includes(q) ||
    ds.teams.some((team) => team.name.toLocaleLowerCase().includes(q))
  return groups.value
    .filter((g) => activeGroup.value === "all" || g.key === activeGroup.value)
    .map((g) => ({ ...g, items: g.items.filter(matches) }))
    .filter((g) => g.items.length)
})

function flagPreview(ds: (typeof SAMPLE_DATASETS)[number]) {
  const codes: string[] = []
  for (const team of ds.teams) {
    if (!team.flag || codes.includes(team.flag)) continue
    codes.push(team.flag)
    if (codes.length === FLAG_PREVIEW_LIMIT) break
  }
  return codes
}
</script>

<template>
  <AppCard padding="md">
    <template #title>
      <AppIcon :icon="FlaskConical" size="md" />
      {{ t("settings.sampleData.title") }}
    </template>

    <p class="section-intro">{{ t("settings.sampleData.intro") }}</p>
    <p v-if="nextSelectionShowsAd" class="ad-notice">
      <AppIcon :icon="CirclePlay" size="sm" />
      {{ t("settings.sampleData.adNotice") }}
    </p>

    <div class="dataset-toolbar">
      <AppSearchInput v-model="query" :placeholder="t('settings.sampleData.searchPlaceholder')" />
      <div class="dataset-filters" role="tablist">
        <button
          v-for="f in filters"
          :key="f.key"
          type="button"
          role="tab"
          class="dataset-filter"
          :class="{ active: activeGroup === f.key }"
          :aria-selected="activeGroup === f.key"
          @click="activeGroup = f.key"
        >
          {{ f.title }}
        </button>
      </div>
    </div>

    <AppEmptyState v-if="!visibleGroups.length" :description="t('common.noMatch', { query })" />

    <section v-for="group in visibleGroups" :key="group.key" class="dataset-section">
      <h3 class="dataset-group-title">
        <AppIcon v-if="group.icon" :icon="group.icon" size="sm" />
        {{ group.title }}
      </h3>

      <div class="dataset-grid">
        <button
          v-for="ds in group.items"
          :key="ds.label"
          type="button"
          class="dataset-card"
          @click="loadDataset(ds)"
        >
          <div class="dataset-card-top">
            <div class="flag-stack" aria-hidden="true">
              <FlagCircle
                v-for="code in flagPreview(ds)"
                :key="code"
                :code="code"
                :size="22"
                class="flag-chip"
              />
              <span v-if="ds.teams.length > FLAG_PREVIEW_LIMIT" class="flag-overflow">
                +{{ ds.teams.length - FLAG_PREVIEW_LIMIT }}
              </span>
            </div>
            <AppIcon
              v-if="isUefaCompetition(ds.label)"
              :icon="getUefaIcon(ds.label)"
              size="sm"
              class="dataset-comp-icon"
            />
          </div>

          <span class="dataset-name">{{ ds.label }}</span>
          <span class="dataset-desc">{{ ds.description }}</span>

          <div class="dataset-footer">
            <span class="dataset-count">{{ t("common.teams", { n: ds.teams.length }) }}</span>
            <span v-if="ds.players?.length" class="tag tag-squad">
              {{ t("settings.sampleData.withSquads") }}
            </span>
            <span v-if="nextSelectionShowsAd" class="tag tag-ad">
              <AppIcon :icon="CirclePlay" size="sm" />
              {{ t("settings.sampleData.adBadge") }}
            </span>
          </div>
        </button>
      </div>
    </section>
  </AppCard>
</template>

<style scoped>
.section-intro {
  color: var(--text-muted);
  font-size: var(--fs-sm);
  margin: 0 0 var(--sp-3);
}

/* ── Rewarded-ad notice ── */
.ad-notice {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  margin: 0 0 var(--sp-4);
  padding: var(--sp-2) var(--sp-3);
  border-radius: var(--radius);
  background: var(--accent-subtle);
  color: var(--accent);
  font-size: var(--fs-sm);
  font-weight: 600;
}

/* ── Search + category filter ── */
.dataset-toolbar {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  margin-bottom: var(--sp-4);
}

.dataset-filters {
  display: flex;
  gap: var(--sp-2);
  overflow-x: auto;
  scrollbar-width: none;
}
.dataset-filters::-webkit-scrollbar {
  display: none;
}

.dataset-filter {
  flex-shrink: 0;
  padding: var(--sp-1) var(--sp-3);
  border: 1px solid var(--border);
  border-radius: var(--radius-pill);
  background: var(--surface);
  color: var(--text-muted);
  font-family: var(--font-ui);
  font-size: var(--fs-sm);
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background var(--dur-fast) var(--ease),
    border-color var(--dur-fast) var(--ease),
    color var(--dur-fast) var(--ease);
}
.dataset-filter.active {
  background: var(--accent-subtle);
  border-color: color-mix(in srgb, var(--accent) 45%, transparent);
  color: var(--accent);
}

/* ── Section / group titles ── */
.dataset-section + .dataset-section {
  margin-top: var(--sp-5);
}

.dataset-group-title {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  color: var(--text);
  font-size: var(--fs-sm);
  font-weight: 700;
  margin: 0 0 var(--sp-3);
}

.dataset-group-title :deep(svg) {
  color: var(--text-muted);
}

/* ── Dataset grid & cards ── */
.dataset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--sp-3);
}

.dataset-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--sp-1);
  padding: var(--sp-3);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--surface);
  color: var(--text);
  cursor: pointer;
  text-align: start;
  transition:
    border-color var(--dur-fast) var(--ease),
    box-shadow var(--dur-fast) var(--ease),
    transform var(--dur-fast) var(--ease);
}
.dataset-card:hover {
  border-color: color-mix(in srgb, var(--accent) 45%, var(--border));
  box-shadow: var(--elev-2);
  transform: translateY(-1px);
}
.dataset-card:active {
  transform: translateY(0);
  box-shadow: var(--elev-1);
}

.dataset-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.flag-stack {
  display: flex;
  align-items: center;
}

.flag-chip {
  border: 2px solid var(--surface);
  box-shadow: 0 0 0 1px var(--border);
  margin-inline-start: -8px;
}
.flag-chip:first-child {
  margin-inline-start: 0;
}

.flag-overflow {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  margin-inline-start: -8px;
  border: 2px solid var(--surface);
  box-shadow: 0 0 0 1px var(--border);
  border-radius: 50%;
  background: var(--border-light);
  color: var(--text-muted);
  font-size: 9px;
  font-weight: 700;
}

.dataset-comp-icon {
  color: var(--accent);
  opacity: 0.85;
}

.dataset-name {
  width: 100%;
  margin-top: var(--sp-1);
  font-size: var(--fs-base);
  font-weight: 700;
  line-height: 1.25;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dataset-desc {
  width: 100%;
  font-size: var(--fs-xs);
  color: var(--text-muted);
  line-height: 1.35;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
}

.dataset-footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--sp-2);
  margin-top: var(--sp-2);
}

.dataset-count {
  font-size: var(--fs-xs);
  color: var(--text-muted);
  font-weight: 600;
}

.tag {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 1px var(--sp-2);
  border-radius: var(--radius-pill);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.tag-squad {
  background: var(--accent-subtle);
  border: 1px solid color-mix(in srgb, var(--accent) 35%, transparent);
  color: var(--accent);
  text-transform: uppercase;
}

.tag-ad {
  background: var(--accent-subtle);
  border: 1px solid color-mix(in srgb, var(--accent) 35%, transparent);
  color: var(--accent);
}
</style>
