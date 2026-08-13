<script setup lang="ts">
import { ref, computed } from "vue"
import { useRouter } from "vue-router"
import { useTeamsStore } from "../store"
import { useSettingsStore, type TeamsSortKey } from "@/modules/settings/store"
import TeamFormModal from "../components/TeamFormModal.vue"
import TeamBadge from "../components/TeamBadge.vue"
import type { Team } from "../types"
import {
  AppButton,
  AppCard,
  AppChip,
  AppEmptyState,
  AppIcon,
  AppSearchInput,
  BtnGroup,
} from "@/components/ui"
import { X, Pencil, Plus, Users, List, Grid3x3, ArrowDown, ArrowUp } from "@lucide/vue"
import { MAX_TEAMS } from "@/constants"
import { useI18n } from "vue-i18n"

const { t } = useI18n()
const store = useTeamsStore()
const settings = useSettingsStore()
const router = useRouter()

const showAddModal = ref(false)
const editingTeam = ref<Team | null>(null)
const query = ref("")

const isGrid = computed(() => settings.teamsListView === "grid")

const viewOptions = computed(() => [
  { value: "list", label: t("tournaments.viewList"), icon: List },
  { value: "grid", label: t("tournaments.viewGrid"), icon: Grid3x3 },
])

const sortOptions = computed(() => [
  { value: "default", label: t("teams.sortDefault") },
  { value: "name", label: t("teamSelector.sortName") },
  { value: "power", label: t("teamSelector.sortPower") },
])

function onSortSelect(key: string) {
  if (settings.teamsSortKey === key) {
    settings.teamsSortAsc = !settings.teamsSortAsc
    return
  }
  settings.teamsSortKey = key as TeamsSortKey
  settings.teamsSortAsc = key === "name"
}

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  const list = q ? store.teams.filter((t) => t.name.toLowerCase().includes(q)) : [...store.teams]

  if (settings.teamsSortKey === "name") {
    list.sort((a, b) =>
      settings.teamsSortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
    )
  } else if (settings.teamsSortKey === "power") {
    list.sort((a, b) => (settings.teamsSortAsc ? a.power - b.power : b.power - a.power))
  }

  return list
})
</script>

<template>
  <div class="page">
    <div class="page-top">
      <h2 class="page-title">
        {{ t("teams.title") }}
        <span class="count">{{ store.teams.length }}/{{ MAX_TEAMS }}</span>
      </h2>
      <AppButton
        variant="filled"
        :disabled="store.teams.length >= MAX_TEAMS"
        :title="store.teams.length >= MAX_TEAMS ? t('teams.limitReached', { max: MAX_TEAMS }) : ''"
        @click="showAddModal = true"
      >
        <AppIcon :icon="Plus" size="xs" />
        {{ t("teams.addBtn") }}
      </AppButton>
    </div>

    <div v-if="store.teams.length" class="search-row">
      <AppSearchInput v-model="query" :placeholder="t('teams.searchPlaceholder')" />
      <div class="sort-row">
        <AppButton
          v-if="settings.teamsSortKey !== 'default'"
          type="button"
          icon-only
          size="md"
          :title="settings.teamsSortAsc ? t('teams.sortAsc') : t('teams.sortDesc')"
          @click="settings.teamsSortAsc = !settings.teamsSortAsc"
        >
          <AppIcon :icon="settings.teamsSortAsc ? ArrowUp : ArrowDown" size="xs" />
        </AppButton>
        <BtnGroup
          :model-value="settings.teamsSortKey"
          :options="sortOptions"
          size="md"
          @update:model-value="onSortSelect"
        />
      </div>
      <BtnGroup v-model="settings.teamsListView" :options="viewOptions" />
    </div>

    <div v-if="store.teams.length" class="t-list">
      <p v-if="!filtered.length" class="empty-text">{{ t("teams.noMatch", { query }) }}</p>
      <TransitionGroup name="list" tag="div" :class="isGrid ? 'team-grid' : 't-list-inner'">
        <AppCard
          v-for="(team, i) in filtered"
          :key="team.id"
          rail
          interactive
          padding="sm"
          class="team-card"
          :class="{ 'team-card--grid': isGrid }"
          :style="{ '--rail-color': team.color, '--i': i }"
          @click="router.push(`/teams/${team.id}`)"
        >
          <TeamBadge :team="team" :size="18" class="team-card-badge" />
          <AppChip square class="team-power">{{ team.power }}</AppChip>
          <div class="team-actions">
            <AppButton
              variant="text"
              icon-only
              :title="t('common.edit')"
              @click.stop="editingTeam = team"
            >
              <AppIcon :icon="Pencil" />
            </AppButton>
            <AppButton variant="danger" icon-only @click.stop="store.remove(team.id)">
              <AppIcon :icon="X" />
            </AppButton>
          </div>
        </AppCard>
      </TransitionGroup>
    </div>

    <AppEmptyState
      v-else
      :icon="Users"
      :description="t('teams.empty', { action: t('teams.addBtn') })"
    >
      <template #action>
        <AppButton variant="filled" @click="showAddModal = true">
          {{ t("teams.addBtn") }}
        </AppButton>
      </template>
    </AppEmptyState>

    <TeamFormModal v-if="showAddModal" @close="showAddModal = false" />
    <TeamFormModal v-if="editingTeam" :team="editingTeam" @close="editingTeam = null" />
  </div>
</template>

<style scoped>
.search-row {
  flex-wrap: wrap;
}

.search-row :deep(.search-field) {
  flex: 1 1 160px;
  min-width: 0;
}

.sort-row {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  flex-shrink: 0;
}

.sort-dir-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--border-light);
  color: var(--text-muted);
  cursor: pointer;
  transition:
    color var(--dur-fast) var(--ease),
    background var(--dur-fast) var(--ease);
}

.sort-dir-btn:hover {
  color: var(--text);
  background: var(--bg-hover);
}

.sort-dir-btn:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

@media (max-width: 480px) {
  .search-row {
    justify-content: flex-end;
  }

  .search-row :deep(.search-field) {
    flex-basis: 100%;
  }
}

.count {
  font-size: var(--fs-base);
  font-weight: 400;
  color: var(--text-muted);
  margin-left: var(--sp-2);
}

.team-card {
  cursor: pointer;
}

/* List: badge, power and actions sit on one line. */
.team-card :deep(.card-body) {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  min-width: 0;
}

.team-card-badge {
  flex: 1;
  min-width: 0;
}

.team-power {
  min-width: 34px;
  justify-content: center;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.team-actions {
  display: flex;
  align-items: center;
  gap: var(--sp-1);
  flex-shrink: 0;
}

/* ── Grid ────────────────────────────────────────────────────── */
.team-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--sp-3);
}

@media (min-width: 641px) {
  .team-grid {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  }
}

/* Grid: stack, with the actions pinned to the card's top-right. */
.team-card--grid {
  position: relative;
}

.team-card--grid :deep(.card-body) {
  flex-direction: column;
  align-items: flex-start;
  padding-right: 68px;
}

.team-card--grid .team-actions {
  position: absolute;
  top: var(--sp-2);
  right: var(--sp-2);
}
</style>
