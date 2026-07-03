# Sample Data: Country/Club Type Split

## Problem

`src/examples/*.json` mixes national-team datasets (AFC, CAF, UEFA Nations,
World Cup, Americas Nations) and club datasets (Best Clubs, MLS, Premier
League, european-clubs "UEFA", conmebol-teams "Conmebol") in one flat list.
`SettingsSectionSampleData.vue` renders them as a single undifferentiated
grid, making it hard to scan for the type of dataset wanted.

## Data model change

Add an explicit `"type": "country" | "club"` field to every file in
`src/examples/*.json`:

- country: `afc.json`, `caf.json`, `conmebol-concacaf.json`, `uefa.json`, `world-cup.json`
- club: `best-clubs.json`, `conmebol-teams.json`, `european-clubs.json`, `mls.json`, `premier-league.json`

`order` stays as-is and continues to sort within a type group.

## Composable change

`src/modules/settings/composables/useDataManagement.ts`:

- Extend the `Dataset` interface with `type: "country" | "club"`.
- Keep `SAMPLE_DATASETS` as the flat sorted array (existing consumers/behavior
  unchanged).
- No new exports needed — the component filters `SAMPLE_DATASETS` by `type`
  directly since it's the only consumer.

## UI change

`src/modules/settings/components/SettingsSectionSampleData.vue`:

- Replace the single `dataset-grid` with two labeled subsections, in fixed
  order: Countries, then Clubs.
- Each subsection has its own small heading (new i18n keys, e.g.
  `settings.sampleData.countries` / `settings.sampleData.clubs`) and reuses
  the existing `dataset-card` grid markup/styles.
- No search/filter, no tabs — plain stacked sections, per user decision.

## Out of scope

- No changes to `loadDataset`, `clearData`, `exportData`, `importData`.
- No changes to `SettingsSectionDataManagement.vue` beyond what naturally
  falls out of the sample-data component split (it only imports
  `useDataManagement`, doesn't render the dataset list itself).
