<script setup lang="ts">
/**
 * The datasets bundled with the app: the market's offline half. They ship
 * inside the build, so this works with no network and on every platform,
 * including those where the online market is not available.
 */
import { computed, nextTick, ref } from "vue"
import { useI18n } from "vue-i18n"
import { ChevronRight, Download } from "@lucide/vue"
import { AppEmptyState, AppIcon, AppSearchInput } from "@/components/ui"
import {
  SAMPLE_DATASETS,
  useDataManagement,
} from "@/modules/settings/composables/useDataManagement"
import { FlagCircle } from "@/modules/teams/components"

const { t } = useI18n()
const { loadDataset } = useDataManagement()

type Dataset = (typeof SAMPLE_DATASETS)[number]

/** Crests on a row, so a set reads at a glance before its name does. */
const PREVIEW_CRESTS = 3

/** Rows a category shows on the "All" view before "See all" takes over. */
const PREVIEW_ROWS = 4

// Exact labels, not a substring match — a non-UEFA competition can still have
// "Champions League" in its name (e.g. the AFC one) without belonging here.
const UEFA_LABELS = new Set([
  "2026/27 Champions League",
  "2026/27 Europa League",
  "2026/27 Conference League",
])
const isUefaCompetition = (label: string) => UEFA_LABELS.has(label)

const groups = computed(() => {
  const current = SAMPLE_DATASETS.filter((ds) => !ds.category)
  const uefa = current.filter((ds) => isUefaCompetition(ds.label))
  const leagues = SAMPLE_DATASETS.filter((ds) => ds.category === "league")
  const clubs = current.filter((ds) => ds.type === "club" && !isUefaCompetition(ds.label))
  const countries = current.filter((ds) => ds.type === "country")
  const classics = SAMPLE_DATASETS.filter((ds) => ds.category === "classic")
  const rankings = SAMPLE_DATASETS.filter((ds) => ds.category === "ranking")
  return [
    { key: "uefa", title: t("settings.sampleData.uefa"), items: uefa },
    { key: "leagues", title: t("settings.sampleData.leagues"), items: leagues },
    { key: "clubs", title: t("settings.sampleData.clubs"), items: clubs },
    { key: "rankings", title: t("settings.sampleData.topClubs"), items: rankings },
    { key: "countries", title: t("settings.sampleData.countries"), items: countries },
    { key: "classics", title: t("settings.sampleData.classics"), items: classics },
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

// On the unfiltered "All" view each category shows only a few rows, so the page
// is a short overview instead of 60+ rows. Picking a chip, tapping "See all" or
// typing a search switches to the full list.
const browsing = computed(() => activeGroup.value === "all" && !query.value.trim())

const toolbar = ref<HTMLElement>()

// "See all" sits halfway down the page; jump back to the toolbar so the list
// starts on screen and the now-active chip is visible.
async function showGroup(key: string) {
  activeGroup.value = key
  await nextTick()
  // Centre the chip first: a second scrollIntoView would cancel a smooth one.
  toolbar.value?.querySelector(".dataset-filter.active")?.scrollIntoView({
    block: "nearest",
    inline: "center",
  })
  toolbar.value?.scrollIntoView({ block: "start", behavior: "smooth" })
}

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

function rowsOf(group: { items: Dataset[] }) {
  return browsing.value ? group.items.slice(0, PREVIEW_ROWS) : group.items
}

function metaOf(ds: Dataset) {
  const teams = t("common.teams", { n: ds.teams.length })
  return ds.players?.length ? `${teams} · ${t("settings.sampleData.withSquads")}` : teams
}
</script>

<template>
  <div class="builtin">
    <div ref="toolbar" class="dataset-toolbar">
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
        {{ group.title }}
        <span class="dataset-group-count">{{ group.items.length }}</span>
      </h3>

      <ul class="dataset-list">
        <li v-for="ds in rowsOf(group)" :key="ds.label">
          <button type="button" class="dataset-row" @click="loadDataset(ds)">
            <span class="dataset-crests" aria-hidden="true">
              <span
                v-for="team in ds.teams.slice(0, PREVIEW_CRESTS)"
                :key="team.id"
                class="dataset-crest"
              >
                <FlagCircle v-if="team.flag" :code="team.flag" :size="24" />
                <span v-else class="dataset-crest-dot" :style="{ background: team.color }" />
              </span>
            </span>
            <span class="dataset-main">
              <span class="dataset-name">{{ ds.label }}</span>
              <span class="dataset-meta">{{ metaOf(ds) }}</span>
            </span>
            <AppIcon :icon="Download" size="sm" class="dataset-action" />
          </button>
        </li>
        <li v-if="browsing && group.items.length > PREVIEW_ROWS">
          <button type="button" class="dataset-more" @click="showGroup(group.key)">
            {{ t("settings.sampleData.seeAll") }}
            <AppIcon :icon="ChevronRight" size="sm" />
          </button>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
/* ── Search + category filter ── */
.dataset-toolbar {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  margin-bottom: var(--sp-4);
  /* Clears the sticky header when scrolled into view. */
  scroll-margin-top: calc(var(--sticky-top) + var(--sp-4));
}

.dataset-filters {
  display: flex;
  gap: var(--sp-1);
  overflow-x: auto;
  scrollbar-width: none;
}
.dataset-filters::-webkit-scrollbar {
  display: none;
}

/* Filled chips, like every other control: grey until picked, accent once picked. */
.dataset-filter {
  flex-shrink: 0;
  padding: 6px var(--sp-3);
  border: none;
  border-radius: var(--radius-pill);
  background: var(--fill-1);
  color: var(--text);
  font-family: var(--font-ui);
  font-size: var(--fs-sm);
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background var(--dur-fast) var(--ease),
    color var(--dur-fast) var(--ease);
}
.dataset-filter:hover {
  background: var(--fill-2);
  border-color: transparent;
  color: var(--text);
  box-shadow: none;
}
.dataset-filter.active,
.dataset-filter.active:hover {
  background: var(--accent);
  color: var(--on-accent);
  font-weight: 600;
}

/* ── Category title ── */
.dataset-section + .dataset-section {
  margin-top: var(--sp-5);
}

.dataset-group-title {
  display: flex;
  align-items: baseline;
  gap: var(--sp-2);
  margin: 0 0 var(--sp-2) var(--sp-1);
  color: var(--text-muted);
  font-size: var(--fs-xs);
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.dataset-group-count {
  opacity: 0.7;
}

/* ── One grouped list per category, like a card ── */
.dataset-list {
  margin: 0;
  padding: 0;
  list-style: none;
  border-radius: var(--radius-lg);
  background: var(--surface);
  overflow: hidden;
}

/* Hairlines start at the text, not the edge, as a grouped list does. */
.dataset-list > li + li {
  position: relative;
}
.dataset-list > li + li::before {
  content: "";
  position: absolute;
  top: 0;
  inset-inline-start: calc(var(--sp-3) + 64px);
  inset-inline-end: 0;
  border-top: 0.5px solid var(--border);
}

.dataset-row,
.dataset-more {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  width: 100%;
  min-height: 60px;
  padding: var(--sp-2) var(--sp-3);
  border: none;
  border-radius: 0;
  background: none;
  color: var(--text);
  font-family: var(--font-ui);
  text-align: start;
  cursor: pointer;
}

.dataset-row:hover,
.dataset-more:hover {
  background: none;
  border-color: transparent;
  color: var(--text);
  box-shadow: none;
}

.dataset-row:active,
.dataset-more:active {
  background: var(--bg-hover);
  transform: none;
}

/* ── Crest preview ── */
.dataset-crests {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  width: 64px;
}
.dataset-crest {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-pill);
  background: var(--surface);
  box-shadow: 0 0 0 2px var(--surface);
  overflow: hidden;
}
.dataset-crest + .dataset-crest {
  margin-inline-start: -10px;
}
.dataset-crest-dot {
  width: 22px;
  height: 22px;
  border-radius: var(--radius-pill);
}

.dataset-main {
  display: flex;
  flex-direction: column;
  gap: 1px;
  flex: 1;
  min-width: 0;
}

.dataset-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--fs-base);
  font-weight: 600;
}

.dataset-meta {
  font-size: var(--fs-xs);
  color: var(--text-muted);
}

.dataset-action {
  flex-shrink: 0;
  color: var(--accent);
}

.dataset-more {
  justify-content: center;
  min-height: 44px;
  gap: 2px;
  color: var(--accent);
  font-size: var(--fs-sm);
  font-weight: 600;
}
.dataset-more:hover {
  color: var(--accent);
}

[dir="rtl"] .dataset-more :deep(svg) {
  transform: scaleX(-1);
}
</style>
