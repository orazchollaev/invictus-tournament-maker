<script setup lang="ts">
import { ref, computed, watch } from "vue"
import { useRouter } from "vue-router"
import { useTeamsStore } from "../store"
import { useSettingsStore } from "@/modules/settings/store"
import {
  GenerateCoachesModal,
  TeamCrest,
  TeamFormModal,
  TeamsFilterMenu,
} from "@/modules/teams/components"
import type { Team } from "../types"
import {
  AppButton,
  AppButtonGroup,
  AppEmptyState,
  AppIcon,
  AppListItem,
  AppPagination,
  AppSearchInput,
  AppStarRating,
  type AppMenuItem,
} from "@/components/ui"
import {
  ClipboardList,
  Grid3x3,
  List,
  Pencil,
  Plus,
  Store,
  Swords,
  Trash2,
  Users,
} from "@lucide/vue"
import { useI18n } from "vue-i18n"

const { t } = useI18n()
const store = useTeamsStore()
const settings = useSettingsStore()
const router = useRouter()

const showAddModal = ref(false)
const showCoachesModal = ref(false)
const editingTeam = ref<Team | null>(null)
const query = ref("")

type MenuKey = "edit" | "compare" | "delete"

const menuItems = computed<AppMenuItem<MenuKey>[]>(() => [
  { key: "edit", label: t("common.edit"), icon: Pencil },
  { key: "compare", label: t("teams.compare.button"), icon: Swords },
  { key: "delete", label: t("common.delete"), icon: Trash2, danger: true },
])

function onMenu(team: Team, key: MenuKey) {
  if (key === "edit") editingTeam.value = team
  else if (key === "compare") router.push({ path: "/teams/compare", query: { a: team.id } })
  else store.remove(team.id)
}

/** Power (1-99) as a five-star rating, in half stars. Cosmetic only. */
const stars = (team: Team) => Math.round((team.power / 99) * 10) / 2

const isGrid = computed(() => settings.teamsListView === "grid")

const viewOptions = computed(() => [
  { value: "list", label: t("tournaments.viewList"), icon: List },
  { value: "grid", label: t("tournaments.viewGrid"), icon: Grid3x3 },
])

const categoryKey = ref("all")
const categoryValue = ref("all")

// Editing the last team of a category can retire its key from under the filter.
watch(
  () => [store.categoryKeys, store.categoryValues(categoryKey.value)] as const,
  ([keys, values]) => {
    if (categoryKey.value !== "all" && !keys.includes(categoryKey.value)) {
      categoryKey.value = "all"
      categoryValue.value = "all"
    } else if (categoryValue.value !== "all" && !values.includes(categoryValue.value)) {
      categoryValue.value = "all"
    }
  }
)

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  let list = q ? store.teams.filter((t) => t.name.toLowerCase().includes(q)) : [...store.teams]

  if (categoryKey.value !== "all") {
    const key = categoryKey.value
    list = list.filter((t) => {
      const v = t.categories?.[key]
      return categoryValue.value === "all" ? v !== undefined : v === categoryValue.value
    })
  }

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
          v-if="store.teams.length > 1"
          icon-only
          :title="t('teams.compare.title')"
          @click="router.push('/teams/compare')"
        >
          <AppIcon :icon="Swords" size="xs" />
        </AppButton>
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
        v-model:category-key="categoryKey"
        v-model:category-value="categoryValue"
      />
    </div>

    <div v-if="store.teams.length" class="t-list">
      <p v-if="!filtered.length" class="empty-text">{{ t("teams.noMatch", { query }) }}</p>
      <TransitionGroup name="list" tag="div" :class="isGrid ? 't-grid' : 't-list-inner'">
        <AppListItem
          v-for="(team, i) in pagedTeams"
          :key="team.id"
          :layout="isGrid ? 'grid' : 'list'"
          :title="team.name"
          :menu="menuItems"
          :menu-label="t('tournament.header.more')"
          :style="{ '--i': i }"
          @open="router.push(`/teams/${team.id}`)"
          @select="onMenu(team, $event)"
        >
          <template #lead>
            <TeamCrest :team="team" :size="28" />
          </template>
          <template #subtitle>
            <AppStarRating :value="stars(team)" :size="11" />
            <span v-if="team.abbr" class="team-abbr">{{ team.abbr }}</span>
          </template>
          <template #trail>
            <span class="team-power">{{ team.power }}</span>
          </template>
        </AppListItem>
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
          <AppButton variant="outlined" @click="router.push('/market?tab=offline')">
            <AppIcon :icon="Store" size="xs" />
            {{ t("tournaments.selectDatasetBtn") }}
          </AppButton>
        </div>
      </template>
    </AppEmptyState>

    <TeamFormModal v-if="showAddModal" @close="showAddModal = false" />
    <TeamFormModal v-if="editingTeam" :team="editingTeam" @close="editingTeam = null" />
    <GenerateCoachesModal v-if="showCoachesModal" @close="showCoachesModal = false" />
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

.team-abbr {
  font-family: var(--font-mono);
  font-weight: 600;
  letter-spacing: 0.04em;
}

/* Power, the number the simulation runs on. */
.team-power {
  min-width: 2ch;
  font-family: var(--font-mono);
  font-size: var(--fs-base);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--text);
  text-align: end;
}
</style>
