<script setup lang="ts">
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import { ArrowDown, ArrowUp, Check } from "@lucide/vue"
import type { Team } from "@/modules/teams/types"
import TeamBadge from "@/modules/teams/components/TeamBadge.vue"
import { AppButton, AppChip, AppIcon, AppSearchInput } from "@/components/ui"

/** A tournament needs at least this many teams to be drawable. */
const MIN_TEAMS = 2

const props = withDefaults(
  defineProps<{
    teams: Team[]
    selected: string[]
    showPower?: boolean
    disabled?: boolean
  }>(),
  { showPower: true, disabled: false }
)

const emit = defineEmits<{ "update:selected": [ids: string[]] }>()
const { t } = useI18n()

const searchQuery = ref("")
type SortKey = "name" | "power"
const sortKey = ref<SortKey>("name")
const sortAsc = ref(true)

const sortedFilteredTeams = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  const list = q ? props.teams.filter((tm) => tm.name.toLowerCase().includes(q)) : [...props.teams]

  return list.sort((a, b) => {
    if (sortKey.value === "power") return sortAsc.value ? a.power - b.power : b.power - a.power
    return sortAsc.value ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
  })
})

/** Warn while a selection exists but is too small to draw. */
const belowMinimum = computed(() => props.selected.length > 0 && props.selected.length < MIN_TEAMS)

const countVariant = computed(() => {
  if (belowMinimum.value) return "danger"
  return props.selected.length >= MIN_TEAMS ? "accent" : "neutral"
})

function toggleSort(key: SortKey) {
  if (sortKey.value === key) sortAsc.value = !sortAsc.value
  else {
    sortKey.value = key
    sortAsc.value = key === "name"
  }
}

function sortArrow(key: SortKey) {
  if (sortKey.value !== key) return null
  return sortAsc.value ? ArrowUp : ArrowDown
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
    props.teams.map((tm) => tm.id)
  )
}

function deselectAll() {
  if (props.disabled) return
  emit("update:selected", [])
}
</script>

<template>
  <div class="ts">
    <div class="ts-header">
      <AppSearchInput
        v-model="searchQuery"
        size="sm"
        :disabled="disabled"
        :placeholder="t('teamSelector.searchPlaceholder')"
      />
      <div class="ts-header-right">
        <div v-if="showPower" class="ts-sort-group">
          <AppButton
            v-for="key in ['name', 'power'] as const"
            :key="key"
            variant="outlined"
            size="xs"
            :class="{ 'ts-sort--active': sortKey === key }"
            :disabled="disabled"
            @click="toggleSort(key)"
          >
            {{ key === "name" ? t("teamSelector.sortName") : t("teamSelector.sortPower") }}
            <AppIcon v-if="sortArrow(key)" :icon="sortArrow(key)!" size="xs" />
          </AppButton>
        </div>
        <AppChip :variant="countVariant">
          {{ selected.length }}&thinsp;/&thinsp;{{ teams.length }}
        </AppChip>
      </div>
    </div>

    <div class="ts-actions">
      <AppButton variant="outlined" size="xs" :disabled="disabled" @click="selectAll">
        {{ t("teamSelector.selectAll") }}
      </AppButton>
      <AppButton variant="danger" size="xs" :disabled="disabled" @click="deselectAll">
        {{ t("teamSelector.deselectAll") }}
      </AppButton>
    </div>

    <!-- Fixed height so filtering does not shift the surrounding form. -->
    <div class="ts-list">
      <div
        v-for="team in sortedFilteredTeams"
        :key="team.id"
        class="ts-row"
        :class="{ 'ts-row--on': selected.includes(team.id), 'ts-row--disabled': disabled }"
        @click="toggleTeam(team.id)"
      >
        <span class="ts-check">
          <AppIcon v-if="selected.includes(team.id)" :icon="Check" size="xs" />
        </span>
        <TeamBadge :team-id="team.id" :teams="teams" />
        <span v-if="showPower" class="ts-power">{{ team.power }}</span>
      </div>
      <p v-if="!sortedFilteredTeams.length" class="ts-empty">
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

.ts-header {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}

.ts-header-right {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  flex-shrink: 0;
}

.ts-sort-group {
  display: flex;
  gap: 3px;
}

.ts-sort--active {
  border-color: color-mix(in srgb, var(--accent) 40%, transparent);
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 8%, var(--surface));
}

.ts-actions {
  display: flex;
  gap: var(--sp-1);
}

.ts-list {
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  background: var(--surface);
  overflow-y: auto;
  height: 240px;
  display: flex;
  flex-direction: column;
}

.ts-row {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-3);
  cursor: pointer;
  user-select: none;
  border-bottom: 1px solid var(--border-light);
  transition: background var(--dur-fast) var(--ease);
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
  font-size: var(--fs-xs);
  color: var(--text-muted);
  font-weight: 600;
  flex-shrink: 0;
}

.ts-empty {
  padding: var(--sp-5) var(--sp-3);
  margin: 0;
  text-align: center;
  font-size: var(--fs-sm);
  color: var(--text-muted);
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
    height: 200px;
  }
}
</style>
