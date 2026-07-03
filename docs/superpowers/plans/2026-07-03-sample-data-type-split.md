# Sample Data Type Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split sample datasets into country/club types and render them as two labeled sections in Settings.

**Architecture:** Add `type: "country" | "club"` to each `src/examples/*.json`, thread it through the `Dataset` interface in `useDataManagement.ts`, and split the single grid in `SettingsSectionSampleData.vue` into two grids filtered by type.

**Tech Stack:** Vue 3 `<script setup>`, TypeScript, vue-i18n. No test runner in repo — verification is manual (dev server + visual check).

## Global Constraints

- `order` field semantics unchanged — still sorts within its type group.
- No changes to `loadDataset`, `clearData`, `exportData`, `importData` behavior.
- No new consumers of `SAMPLE_DATASETS` beyond the existing one.

---

### Task 1: Tag example JSON files with `type`

**Files:**

- Modify: `src/examples/afc.json`, `src/examples/caf.json`, `src/examples/conmebol-concacaf.json`, `src/examples/uefa.json`, `src/examples/world-cup.json` → add `"type": "country"`
- Modify: `src/examples/best-clubs.json`, `src/examples/conmebol-teams.json`, `src/examples/european-clubs.json`, `src/examples/mls.json`, `src/examples/premier-league.json` → add `"type": "club"`

**Interfaces:**

- Produces: every file in `src/examples/*.json` has a top-level `"type": "country" | "club"` key, inserted after `"order"`.

- [ ] **Step 1: Add `"type"` key to each of the 10 files**

Insert `"type": "country",` (or `"club"`) right after the `"order"` line in each file. Example for `src/examples/afc.json`:

```json
{
  "label": "AFC Nations",
  "description": "...",
  "order": 3,
  "type": "country",
  "teams": [ ... ]
}
```

Apply the same pattern to all 10 files, using the type shown in Interfaces above.

- [ ] **Step 2: Verify all 10 files have valid JSON with the new key**

Run: `node -e "['afc','caf','conmebol-concacaf','uefa','world-cup','best-clubs','conmebol-teams','european-clubs','mls','premier-league'].forEach(f=>{const d=require('./src/examples/'+f+'.json'); if(!d.type) throw new Error(f+' missing type'); console.log(f, d.type)})"`

Expected: prints all 10 filenames with `country` or `club`, no throw.

- [ ] **Step 3: Commit**

```bash
git add src/examples/*.json
git commit -m "feat(examples): tag sample datasets with country/club type"
```

---

### Task 2: Extend `Dataset` interface in composable

**Files:**

- Modify: `src/modules/settings/composables/useDataManagement.ts:7-13`

**Interfaces:**

- Consumes: JSON files from Task 1, each now has `type: "country" | "club"`.
- Produces: `Dataset` interface with `type: "country" | "club"`; `SAMPLE_DATASETS: Dataset[]` unchanged in shape/sort order (still exported, still sorted by `order`).

- [ ] **Step 1: Add `type` to the `Dataset` interface**

In `src/modules/settings/composables/useDataManagement.ts`, change:

```typescript
interface Dataset {
  label: string
  description: string
  order?: number
  teams: { id: string; name: string; color: string; power: number }[]
  tournaments?: any[]
}
```

to:

```typescript
interface Dataset {
  label: string
  description: string
  order?: number
  type: "country" | "club"
  teams: { id: string; name: string; color: string; power: number }[]
  tournaments?: any[]
}
```

- [ ] **Step 2: Type-check**

Run: `rtk tsc`

Expected: no new errors referencing `useDataManagement.ts` or `SettingsSectionSampleData.vue`.

- [ ] **Step 3: Commit**

```bash
git add src/modules/settings/composables/useDataManagement.ts
git commit -m "feat(settings): add type field to Dataset interface"
```

---

### Task 3: Split sample data UI into Countries/Clubs sections

**Files:**

- Modify: `src/modules/settings/components/SettingsSectionSampleData.vue`
- Modify: locale files containing `settings.sampleData.*` keys (find via `rtk grep "sampleData.intro"` under `src/locales` or wherever i18n JSON lives)

**Interfaces:**

- Consumes: `SAMPLE_DATASETS: Dataset[]` from `useDataManagement.ts` (Task 2), each item has `.type`.
- Produces: two `computed` refs `countryDatasets` and `clubDatasets` (local to this component only, not exported).

- [ ] **Step 1: Find the i18n keys file(s) to add new labels**

Run: `rtk grep "sampleData.intro" src/locales`

Note the file(s) returned (e.g. `src/locales/en.json`, `src/locales/tr.json`, etc.) — you'll add two new keys next to `sampleData.title`/`sampleData.intro` in each: `sampleData.countries` and `sampleData.clubs`. Use `"Countries"` / `"Clubs"` for `en`, and the equivalent for any other locale file present (check existing translations for tone/casing).

- [ ] **Step 2: Add the two new i18n keys to every locale file found in Step 1**

For each locale file, add `"countries"` and `"clubs"` keys inside the existing `sampleData` object, alongside `title`/`intro`.

- [ ] **Step 3: Update the component template and script**

Replace the full contents of `src/modules/settings/components/SettingsSectionSampleData.vue` with:

```vue
<script setup lang="ts">
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { FlaskConical } from "@lucide/vue"
import { SAMPLE_DATASETS, useDataManagement } from "../composables/useDataManagement"

const { t } = useI18n()
const { loadDataset } = useDataManagement()

const countryDatasets = computed(() => SAMPLE_DATASETS.filter((ds) => ds.type === "country"))
const clubDatasets = computed(() => SAMPLE_DATASETS.filter((ds) => ds.type === "club"))
</script>

<template>
  <div class="section-box">
    <h2>
      <FlaskConical :size="15" class="section-icon" />
      {{ t("settings.sampleData.title") }}
    </h2>
    <div class="section-body" style="padding: 10px 8px">
      <p class="section-intro">{{ t("settings.sampleData.intro") }}</p>

      <h3 class="dataset-group-title">{{ t("settings.sampleData.countries") }}</h3>
      <div class="dataset-grid">
        <button
          v-for="ds in countryDatasets"
          :key="ds.label"
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
.dataset-group-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.02em;
  margin: 14px 0 6px;
}
.dataset-group-title:first-of-type {
  margin-top: 4px;
}
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
```

- [ ] **Step 4: Type-check**

Run: `rtk tsc`

Expected: no errors in `SettingsSectionSampleData.vue`.

- [ ] **Step 5: Manual verification**

Run: `rtk npm run dev`, open Settings page, confirm two headed sections ("Countries" / "Clubs") each show the correct 5 datasets, and clicking a card still triggers the existing load-confirm dialog.

- [ ] **Step 6: Commit**

```bash
git add src/modules/settings/components/SettingsSectionSampleData.vue src/locales
git commit -m "feat(settings): split sample data picker into countries/clubs sections"
```
