<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { Check } from "@lucide/vue"
import type { Team } from "@/modules/teams/types"
import { TeamBadge } from "@/modules/teams/components"
import { AppButton, AppButtonGroup, AppChip, AppSearchInput } from "@/components/ui"

const props = withDefaults(
  defineProps<{
    teams: Team[]
    selected: string[]
    showPower?: boolean
    disabled?: boolean
    /** Let the list grow to fill its container instead of a fixed height — used in the fullscreen modal. */
    fullscreen?: boolean
  }>(),
  { showPower: true, disabled: false, fullscreen: false }
)

const emit = defineEmits<{ "update:selected": [ids: string[]] }>()

/** A tournament needs at least this many teams to be drawable. */
const MIN_TEAMS = 2

const { t } = useI18n()

const searchQuery = ref("")
// The list can hold hundreds of rows, so filtering waits for a typing pause
// instead of re-rendering on every keystroke.
const appliedQuery = ref("")
let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(searchQuery, (value) => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => (appliedQuery.value = value), 150)
})
onBeforeUnmount(() => clearTimeout(searchTimer))

type SortKey = "name" | "power"
const sortKey = ref<SortKey>("name")
const sortAsc = ref(true)

const sortedFilteredTeams = computed(() => {
  const q = appliedQuery.value.trim().toLowerCase()
  const list = q ? props.teams.filter((tm) => tm.name.toLowerCase().includes(q)) : [...props.teams]

  return list.sort((a, b) => {
    if (sortKey.value === "power") return sortAsc.value ? a.power - b.power : b.power - a.power
    return sortAsc.value ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
  })
})

/** Letter sections while sorted by name; one flat run while sorted by power. */
const sections = computed(() => {
  if (sortKey.value !== "name") return [{ key: "", teams: sortedFilteredTeams.value }]
  const out: { key: string; teams: Team[] }[] = []
  for (const tm of sortedFilteredTeams.value) {
    const letter = tm.name.charAt(0).toLocaleUpperCase()
    const last = out[out.length - 1]
    if (last?.key === letter) last.teams.push(tm)
    else out.push({ key: letter, teams: [tm] })
  }
  return out
})

function powerTier(power: number) {
  if (power >= 85) return "elite"
  if (power >= 75) return "strong"
  if (power >= 65) return "mid"
  return "low"
}

const selectedSet = computed(() => new Set(props.selected))
const allSelected = computed(
  () => props.teams.length > 0 && props.teams.every((tm) => selectedSet.value.has(tm.id))
)

/** Warn while a selection exists but is too small to draw. */
const belowMinimum = computed(() => props.selected.length > 0 && props.selected.length < MIN_TEAMS)

const countVariant = computed(() => {
  if (belowMinimum.value) return "danger"
  return props.selected.length >= MIN_TEAMS ? "accent" : "neutral"
})

const sortOptions = computed(() =>
  (["name", "power"] as const).map((key) => {
    const label = key === "name" ? t("teamSelector.sortName") : t("teamSelector.sortPower")
    const arrow = sortKey.value === key ? (sortAsc.value ? " ↑" : " ↓") : ""
    return { value: key, label: label + arrow, disabled: props.disabled }
  })
)

function setSort(key: string) {
  if (sortKey.value === key) sortAsc.value = !sortAsc.value
  else {
    sortKey.value = key as SortKey
    sortAsc.value = key === "name"
  }
}

function toggleTeam(teamId: string) {
  if (props.disabled) return
  if (selectedSet.value.has(teamId)) {
    emit(
      "update:selected",
      props.selected.filter((id) => id !== teamId)
    )
  } else {
    emit("update:selected", [...props.selected, teamId])
  }
}

function toggleAll() {
  if (props.disabled) return
  emit("update:selected", allSelected.value ? [] : props.teams.map((tm) => tm.id))
}
</script>

<template>
  <div class="ts" :class="{ 'ts--full': fullscreen }">
    <div class="ts-header">
      <AppSearchInput
        v-model="searchQuery"
        size="sm"
        :disabled="disabled"
        :placeholder="t('teamSelector.searchPlaceholder')"
      />
      <AppChip :variant="countVariant">
        {{ selected.length }}&thinsp;/&thinsp;{{ teams.length }}
      </AppChip>
    </div>

    <div class="ts-toolbar">
      <AppButtonGroup
        v-if="showPower"
        :model-value="sortKey"
        :options="sortOptions"
        size="md"
        @update:model-value="setSort"
      />
      <AppButton
        class="ts-toggle-all"
        variant="text"
        size="xs"
        :disabled="disabled"
        @click="toggleAll"
      >
        {{ allSelected ? t("teamSelector.deselectAll") : t("teamSelector.selectAll") }}
      </AppButton>
    </div>

    <!-- Fixed height so filtering does not shift the surrounding form; grows in fullscreen. -->
    <div class="ts-list" :class="{ 'ts-list--full': fullscreen }">
      <template v-for="section in sections" :key="section.key">
        <div v-if="section.key" class="ts-section">{{ section.key }}</div>
        <button
          v-for="team in section.teams"
          :key="team.id"
          type="button"
          class="ts-row"
          :class="{ 'ts-row--on': selectedSet.has(team.id) }"
          :aria-pressed="selectedSet.has(team.id)"
          :disabled="disabled"
          @click="toggleTeam(team.id)"
        >
          <span class="ts-check">
            <Check v-if="selectedSet.has(team.id)" :size="11" :stroke-width="3.5" />
          </span>
          <TeamBadge class="ts-team" :team="team" />
          <span v-if="showPower" class="ts-power" :class="`ts-power--${powerTier(team.power)}`">
            {{ team.power }}
          </span>
        </button>
      </template>
      <p v-if="!sortedFilteredTeams.length" class="empty-inline">
        {{ t("teamSelector.emptyAvailable") }}
      </p>
    </div>

    <!-- Kept in the layout even when hidden, so the panel height is stable. -->
    <p class="ts-warn" :class="{ 'ts-warn--hidden': !belowMinimum }">
      {{ t("teamSelector.minTeams") }}
    </p>
  </div>
</template>

<style scoped>
.ts {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}

.ts--full {
  height: 100%;
}

.ts-header {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}

.ts-toolbar {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}

.ts-toggle-all {
  margin-inline-start: auto;
  color: var(--accent);
}

.ts-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  height: 240px;
  overflow-y: auto;
}

.ts-list--full {
  flex: 1;
  height: auto;
}

.ts-row {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  flex-shrink: 0;
  min-height: 34px;
  /* Off-screen rows skip layout and paint, which keeps 700+ teams scrollable. */
  content-visibility: auto;
  contain-intrinsic-size: auto 34px;
  padding: 0 var(--sp-2);
  border: none;
  border-radius: var(--radius);
  background: transparent;
  color: var(--text);
  font: inherit;
  font-size: var(--fs-sm);
  text-align: start;
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}
.ts-row--on {
  background: color-mix(in srgb, var(--accent) 10%, transparent);
}
.ts-row:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.ts-row:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

.ts-team {
  flex: 1;
  min-width: 0;
}

.ts-section {
  position: sticky;
  top: 0;
  z-index: 1;
  flex-shrink: 0;
  padding: var(--sp-2) var(--sp-2) 2px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  color: var(--accent);
  background: var(--surface);
}

.ts-power {
  --tier: var(--text-muted);
  flex-shrink: 0;
  min-width: 30px;
  padding: 2px 6px;
  border-radius: var(--radius-pill);
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  text-align: center;
  color: var(--tier);
  background: color-mix(in srgb, var(--tier) 14%, transparent);
}
.ts-power--elite {
  --tier: var(--gold);
}
.ts-power--strong {
  --tier: var(--success);
}
.ts-power--mid {
  --tier: var(--warning);
}

.ts-check {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  border: 1.5px solid var(--border);
  border-radius: var(--radius-pill);
  color: var(--on-accent);
}
.ts-row--on .ts-check {
  border-color: var(--accent);
  background: var(--accent);
}

.ts-warn {
  font-size: var(--fs-xs);
  font-weight: 500;
  color: var(--danger);
  margin: 0;
  min-height: 16px;
}
.ts-warn--hidden {
  visibility: hidden;
}

@media (max-width: 480px) {
  .ts-list {
    height: 320px;
  }
}
</style>
