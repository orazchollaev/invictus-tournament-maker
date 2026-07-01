<script setup lang="ts">
import { ref, computed } from "vue"
import { useI18n } from "vue-i18n"
import { Search, Check, ArrowUp, ArrowDown } from "@lucide/vue"
import type { Team } from "@/modules/teams/types"
import TeamBadge from "@/modules/teams/components/TeamBadge.vue"

interface Props {
  teams: Team[]
  selected: string[]
  showPower?: boolean
  disabled?: boolean
}

interface Emits {
  (e: "update:selected", ids: string[]): void
}

const props = withDefaults(defineProps<Props>(), {
  showPower: true,
  disabled: false,
})

const emit = defineEmits<Emits>()
const { t } = useI18n()

const searchQuery = ref("")
type SortKey = "name" | "power"
const sortKey = ref<SortKey>("name")
const sortAsc = ref(true)

const sortedFilteredTeams = computed(() => {
  let list = [...props.teams]
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter((t) => t.name.toLowerCase().includes(q))
  }
  list.sort((a, b) => {
    if (sortKey.value === "power") {
      return sortAsc.value ? a.power - b.power : b.power - a.power
    }
    return sortAsc.value ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
  })
  return list
})

function toggleSort(key: SortKey) {
  if (sortKey.value === key) {
    sortAsc.value = !sortAsc.value
  } else {
    sortKey.value = key
    sortAsc.value = key === "name"
  }
}

function toggleTeam(teamId: string) {
  if (props.disabled) return
  if (props.selected.includes(teamId)) {
    emit(
      "update:selected",
      props.selected.filter((id) => id !== teamId)
    )
  } else {
    emit("update:selected", [...props.selected, teamId])
  }
}

function selectAll() {
  if (props.disabled) return
  emit(
    "update:selected",
    props.teams.map((t) => t.id)
  )
}

function deselectAll() {
  if (props.disabled) return
  emit("update:selected", [])
}
</script>

<template>
  <div class="ts">
    <!-- Header: search + sort + count -->
    <div class="ts-header">
      <div class="ts-search-wrap">
        <Search :size="14" class="ts-search-icon" />
        <input
          v-model="searchQuery"
          type="text"
          class="ts-search"
          :disabled="disabled"
          :placeholder="t('teamSelector.searchPlaceholder')"
        />
      </div>
      <div class="ts-header-right">
        <div v-if="showPower" class="ts-sort-group">
          <button
            class="ts-sort-btn"
            :class="{ 'ts-sort-btn--active': sortKey === 'name' }"
            :disabled="disabled"
            @click="toggleSort('name')"
          >
            {{ t("teamSelector.sortName") }}
            <ArrowUp v-if="sortKey === 'name' && sortAsc" :size="11" />
            <ArrowDown v-else-if="sortKey === 'name' && !sortAsc" :size="11" />
          </button>
          <button
            class="ts-sort-btn"
            :class="{ 'ts-sort-btn--active': sortKey === 'power' }"
            :disabled="disabled"
            @click="toggleSort('power')"
          >
            {{ t("teamSelector.sortPower") }}
            <ArrowUp v-if="sortKey === 'power' && sortAsc" :size="11" />
            <ArrowDown v-else-if="sortKey === 'power' && !sortAsc" :size="11" />
          </button>
        </div>
        <span
          class="ts-count"
          :class="{
            'ts-count--warn': selected.length > 0 && selected.length < 2,
            'ts-count--ok': selected.length >= 2,
          }"
        >
          {{ selected.length }}&thinsp;/&thinsp;{{ teams.length }}
        </span>
      </div>
    </div>

    <!-- Action row -->
    <div class="ts-actions">
      <button class="ts-action" :disabled="disabled" @click="selectAll">
        {{ t("teamSelector.selectAll") }}
      </button>
      <button class="ts-action ts-action--danger" :disabled="disabled" @click="deselectAll">
        {{ t("teamSelector.deselectAll") }}
      </button>
    </div>

    <!-- Team list -->
    <div class="ts-list">
      <div
        v-for="team in sortedFilteredTeams"
        :key="team.id"
        class="ts-row"
        :class="{
          'ts-row--on': selected.includes(team.id),
          'ts-row--disabled': disabled,
        }"
        @click="toggleTeam(team.id)"
      >
        <span class="ts-check">
          <Check v-if="selected.includes(team.id)" :size="11" />
        </span>
        <TeamBadge :team-id="team.id" :teams="teams" />
        <span v-if="showPower" class="ts-power">{{ team.power }}</span>
      </div>
      <div v-if="!sortedFilteredTeams.length" class="ts-empty">
        {{ t("teamSelector.emptyAvailable") }}
      </div>
    </div>

    <!-- Always reserve space to prevent bottom shift -->
    <p
      class="ts-warn"
      :class="{ 'ts-warn--hidden': !(selected.length > 0 && selected.length < 2) }"
    >
      {{ t("teamSelector.minTeams") }}
    </p>
  </div>
</template>

<style scoped>
.ts {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Header */
.ts-header {
  display: flex;
  align-items: center;
  gap: 6px;
}

.ts-search-wrap {
  position: relative;
  display: flex;
  align-items: center;
  flex: 1;
}

.ts-search-icon {
  position: absolute;
  left: 9px;
  color: var(--text-muted);
  pointer-events: none;
}

.ts-search {
  width: 100%;
  padding: 7px 10px 7px 28px;
  font-size: 13px;
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--text);
  font-family: var(--font-ui);
  transition: border-color 0.15s;
}

.ts-search:focus {
  outline: none;
  border-color: var(--accent);
}

.ts-search:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ts-search::placeholder {
  color: var(--text-muted);
}

.ts-header-right {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

/* Sort */
.ts-sort-group {
  display: flex;
  gap: 3px;
}

.ts-sort-btn {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 600;
  font-family: var(--font-ui);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--text-muted);
  cursor: pointer;
  transition:
    border-color 0.12s,
    color 0.12s,
    background 0.12s;
  white-space: nowrap;
}

.ts-sort-btn:hover {
  border-color: var(--border);
  color: var(--text);
}

.ts-sort-btn--active {
  border-color: color-mix(in srgb, var(--accent) 40%, transparent);
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 8%, var(--surface));
}

.ts-sort-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Count badge */
.ts-count {
  font-size: 11px;
  font-weight: 700;
  font-family: var(--font-ui);
  padding: 2px 7px;
  border-radius: var(--radius);
  background: color-mix(in srgb, var(--border) 40%, transparent);
  color: var(--text-muted);
  border: 1px solid var(--border-light);
  transition:
    color 0.15s,
    background 0.15s,
    border-color 0.15s;
}

.ts-count--warn {
  color: var(--danger);
  background: color-mix(in srgb, var(--danger) 10%, transparent);
  border-color: color-mix(in srgb, var(--danger) 30%, transparent);
}

.ts-count--ok {
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 10%, transparent);
  border-color: color-mix(in srgb, var(--accent) 30%, transparent);
}

/* Action row */
.ts-actions {
  display: flex;
  gap: 4px;
}

.ts-action {
  padding: 5px 10px;
  font-size: 11px;
  font-weight: 600;
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--text-muted);
  cursor: pointer;
  font-family: var(--font-ui);
  white-space: nowrap;
  transition:
    border-color 0.12s,
    color 0.12s;
}

.ts-action:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.ts-action--danger:hover {
  border-color: var(--danger);
  color: var(--danger);
}

.ts-action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Team list — fixed height prevents shift when filter reduces results */
.ts-list {
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  background: var(--surface);
  overflow-y: auto;
  height: 240px;
  display: flex;
  flex-direction: column;
}

@media (max-width: 480px) {
  .ts-chips {
    height: 70px;
  }
  .ts-list {
    height: 200px;
  }
}

.ts-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  cursor: pointer;
  user-select: none;
  border-bottom: 1px solid var(--border-light);
  transition: background 0.1s;
}

.ts-row:last-child {
  border-bottom: none;
}

.ts-row:hover:not(.ts-row--disabled) {
  background: color-mix(in srgb, var(--accent) 5%, var(--surface));
}

.ts-row--on {
  background: color-mix(in srgb, var(--accent) 8%, var(--surface));
}

.ts-row--on:hover {
  background: color-mix(in srgb, var(--accent) 12%, var(--surface));
}

.ts-row--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ts-check {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent);
  flex-shrink: 0;
}

.ts-power {
  font-size: 11px;
  color: var(--text-muted);
  font-weight: 600;
  flex-shrink: 0;
}

.ts-empty {
  padding: 20px 10px;
  text-align: center;
  font-size: 12px;
  color: var(--text-muted);
}

.ts-warn {
  font-size: 11px;
  font-weight: 500;
  color: var(--danger);
  margin: 0;
  min-height: 16px;
  visibility: visible;
}

.ts-warn--hidden {
  visibility: hidden;
}
</style>
