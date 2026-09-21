<script setup lang="ts">
import { ref, computed, watch } from "vue"
import { useRouter } from "vue-router"
import { useTeamsStore } from "../store"
import { useSettingsStore } from "@/modules/settings/store"
import {
  GenerateCoachesModal,
  TeamFormModal,
  TeamBadge,
  TeamsFilterMenu,
} from "@/modules/teams/components"
import type { Team } from "../types"
import {
  AppButton,
  AppCard,
  AppChip,
  AppEmptyState,
  AppIcon,
  AppPagination,
  AppSearchInput,
  AppButtonGroup,
} from "@/components/ui"
import { X, Pencil, Plus, Users, List, Grid3x3, ClipboardList, Database } from "@lucide/vue"
import { useI18n } from "vue-i18n"

const { t } = useI18n()
const store = useTeamsStore()
const settings = useSettingsStore()
const router = useRouter()

const showAddModal = ref(false)
const showCoachesModal = ref(false)
const editingTeam = ref<Team | null>(null)
const query = ref("")

const isGrid = computed(() => settings.teamsListView === "grid")

const viewOptions = computed(() => [
  { value: "list", label: t("tournaments.viewList"), icon: List },
  { value: "grid", label: t("tournaments.viewGrid"), icon: Grid3x3 },
])

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

// Mounting every card at once is what makes a long roster feel laggy — only
// one page's worth is ever rendered.
const PAGE_SIZE = 24
const page = ref(1)

watch(filtered, () => {
  page.value = 1
})

const pagedTeams = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE
  return filtered.value.slice(start, start + PAGE_SIZE)
})
</script>

<template>
  <div class="page">
    <div class="page-top">
      <h2 class="page-title">
        {{ t("teams.title") }}
        <span class="count">{{ store.teams.length }}</span>
      </h2>
      <div class="page-top-actions">
        <AppButton
          v-if="store.teams.length"
          icon-only
          :title="t('coach.generate.buttonLabel')"
          @click="showCoachesModal = true"
        >
          <AppIcon :icon="ClipboardList" size="xs" />
        </AppButton>
        <AppButton variant="filled" @click="showAddModal = true">
          <AppIcon :icon="Plus" size="xs" />
          {{ t("teams.addBtn") }}
        </AppButton>
      </div>
    </div>

    <div v-if="store.teams.length" class="search-row">
      <AppSearchInput v-model="query" :placeholder="t('teams.searchPlaceholder')" />
      <AppButtonGroup v-model="settings.teamsListView" :options="viewOptions" size="md" />

      <TeamsFilterMenu
        v-model:sort-key="settings.teamsSortKey"
        v-model:sort-asc="settings.teamsSortAsc"
      />
    </div>

    <div v-if="store.teams.length" class="t-list">
      <p v-if="!filtered.length" class="empty-text">{{ t("teams.noMatch", { query }) }}</p>
      <TransitionGroup name="list" tag="div" :class="isGrid ? 'team-grid' : 't-list-inner'">
        <AppCard
          v-for="(team, i) in pagedTeams"
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
      <AppPagination v-model="page" :total-items="filtered.length" :page-size="PAGE_SIZE" />
    </div>

    <AppEmptyState
      v-else
      :icon="Users"
      :description="t('teams.empty', { action: t('teams.addBtn') })"
    >
      <template #action>
        <div class="empty-actions">
          <AppButton variant="filled" @click="showAddModal = true">
            {{ t("teams.addBtn") }}
          </AppButton>
          <AppButton variant="outlined" @click="router.push('/settings?category=sampleData')">
            <AppIcon :icon="Database" size="xs" />
            {{ t("tournaments.selectDatasetBtn") }}
          </AppButton>
        </div>
      </template>
    </AppEmptyState>

    <TeamFormModal v-if="showAddModal" @close="showAddModal = false" />
    <TeamFormModal v-if="editingTeam" :team="editingTeam" @close="editingTeam = null" />
    <GenerateCoachesModal v-if="showCoachesModal" @close="showCoachesModal = false" />

    <button
      v-if="store.teams.length"
      type="button"
      class="load-dataset-fab"
      :title="t('teams.loadDatasetTitle')"
      :aria-label="t('teams.loadDatasetTitle')"
      @click="router.push('/settings?category=sampleData')"
    >
      <AppIcon :icon="Database" size="lg" />
    </button>
  </div>
</template>

<style scoped>
.page-top-actions {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}

.search-row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}

.search-row :deep(.search-field) {
  flex: 1 1 160px;
  min-width: 0;
}

.search-row :deep(.btn-group) {
  flex-shrink: 0;
}

@media (max-width: 480px) {
  .search-row :deep(.search-field) {
    flex-basis: 100%;
  }
}

.count {
  font-size: var(--fs-base);
  font-weight: 400;
  color: var(--text-muted);
  margin-inline-start: var(--sp-2);
}

.empty-actions {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  flex-wrap: wrap;
  justify-content: center;
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

.team-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--sp-1);
}

@media (min-width: 641px) {
  .team-grid {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  }
}

.team-card--grid {
  position: relative;
}

.team-card--grid :deep(.card-body) {
  flex-direction: column;
  align-items: flex-start;
  padding-inline-end: 68px;
}

.team-card--grid .team-actions {
  position: absolute;
  top: var(--sp-2);
  inset-inline-end: var(--sp-2);
}

.load-dataset-fab {
  position: fixed;
  right: calc(var(--safe-right) + var(--sp-4));
  bottom: calc(var(--safe-bottom) + var(--sp-4));
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  box-shadow: var(--shadow-md);
  cursor: pointer;
  z-index: var(--z-bottom-bar);
  transition:
    transform var(--dur-1) var(--ease),
    box-shadow var(--dur-1) var(--ease);
}

.load-dataset-fab:hover {
  transform: scale(1.05);
  box-shadow: var(--elev-3);
}

@media (max-width: 600px) {
  .load-dataset-fab {
    bottom: calc(var(--safe-bottom) + var(--mobile-nav-height) + var(--sp-5));
  }
}
</style>
