<script setup lang="ts">
import { ref, computed, watch } from "vue"
import { usePlayersStore } from "../store"
import { useTeamsStore } from "@/modules/teams/store"
import { useSettingsStore } from "@/modules/settings/store"
import {
  GeneratePlayersModal,
  PlayerFormModal,
  PlayerAvatar,
  PlayersFilterMenu,
} from "@/modules/players/components"
import type { Player } from "../types"
import {
  AppButton,
  AppButtonGroup,
  AppChip,
  AppEmptyState,
  AppIcon,
  AppListItem,
  AppPagination,
  AppSearchInput,
  type AppMenuItem,
} from "@/components/ui"
import { Grid3x3, List, Pencil, Plus, Sparkles, Trash2, UserRound } from "@lucide/vue"
import { useI18n } from "vue-i18n"
import { showConfirm } from "@/composables/useDialog"

const { t } = useI18n()
const store = usePlayersStore()
const teamsStore = useTeamsStore()
const settings = useSettingsStore()

const showAddModal = ref(false)
const showGenerateModal = ref(false)
const editingPlayer = ref<Player | null>(null)
const query = ref("")
const teamFilter = ref("all")

type MenuKey = "edit" | "delete"

const menuItems = computed<AppMenuItem<MenuKey>[]>(() => [
  { key: "edit", label: t("common.edit"), icon: Pencil },
  { key: "delete", label: t("common.delete"), icon: Trash2, danger: true },
])

function onMenu(player: Player, key: MenuKey) {
  if (key === "edit") editingPlayer.value = player
  else store.remove(player.id)
}

// The search field updates `query` on every keystroke, but re-filtering and
// re-rendering the whole list on every keystroke is what causes the freeze
// once the squad count gets large — so the actual filter runs off a debounced
// copy instead.
const debouncedQuery = ref("")
let debounceTimer: ReturnType<typeof setTimeout> | undefined
watch(query, (value) => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    debouncedQuery.value = value
  }, 200)
})

const isGrid = computed(() => settings.playersListView === "grid")

const viewOptions = computed(() => [
  { value: "list", label: t("tournaments.viewList"), icon: List },
  { value: "grid", label: t("tournaments.viewGrid"), icon: Grid3x3 },
])

const teamsById = computed(() => new Map(teamsStore.teams.map((tm) => [tm.id, tm])))

function teamOf(player: Player) {
  return teamsById.value.get(player.teamId)
}

const filtered = computed(() => {
  const q = debouncedQuery.value.trim().toLowerCase()
  let list = store.players.filter((p) => (q ? p.name.toLowerCase().includes(q) : true))
  if (teamFilter.value !== "all") list = list.filter((p) => p.teamId === teamFilter.value)
  else list = [...list]

  if (settings.playersSortKey === "name") {
    list.sort((a, b) =>
      settings.playersSortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
    )
  } else if (settings.playersSortKey === "power") {
    list.sort((a, b) => (settings.playersSortAsc ? a.power - b.power : b.power - a.power))
  }

  return list
})

// Rendering every match at once is what makes 100+ players feel laggy — a
// full card tree per row, animated by TransitionGroup, adds up fast. Only
// one page's worth of cards is ever mounted at a time.
const PAGE_SIZE = 24
const page = ref(1)

watch(filtered, () => {
  page.value = 1
})

const pagedPlayers = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE
  return filtered.value.slice(start, start + PAGE_SIZE)
})

async function handleDeleteAll() {
  if (
    !(await showConfirm(t("players.deleteAllConfirm"), {
      confirmLabel: t("common.delete"),
      dangerous: true,
    }))
  )
    return
  store.removeAll()
}
</script>

<template>
  <div class="page">
    <div class="page-top">
      <h2 class="page-title">
        {{ t("players.title") }}
        <span class="count">{{ store.players.length }}</span>
      </h2>
      <div class="page-top-actions">
        <AppButton
          variant="text"
          :disabled="!teamsStore.teams.length"
          :title="!teamsStore.teams.length ? t('players.needTeamFirst') : ''"
          @click="showGenerateModal = true"
        >
          <AppIcon :icon="Sparkles" size="xs" />
          {{ t("players.generate.buttonLabel") }}
        </AppButton>
        <AppButton
          variant="filled"
          :disabled="!teamsStore.teams.length"
          :title="!teamsStore.teams.length ? t('players.needTeamFirst') : ''"
          @click="showAddModal = true"
        >
          <AppIcon :icon="Plus" size="xs" />
          {{ t("players.addBtn") }}
        </AppButton>
      </div>
    </div>

    <div v-if="store.players.length" class="search-row">
      <AppSearchInput v-model="query" :placeholder="t('players.searchPlaceholder')" />
      <AppButtonGroup v-model="settings.playersListView" :options="viewOptions" size="md" />
      <PlayersFilterMenu
        v-model:team-filter="teamFilter"
        v-model:sort-key="settings.playersSortKey"
        v-model:sort-asc="settings.playersSortAsc"
        :teams="teamsStore.teams"
      />
    </div>

    <div v-if="store.players.length" class="t-list">
      <p v-if="!filtered.length" class="empty-text">{{ t("players.noMatch") }}</p>
      <TransitionGroup name="list" tag="div" :class="isGrid ? 't-grid' : 't-list-inner'">
        <AppListItem
          v-for="(player, i) in pagedPlayers"
          :key="player.id"
          :layout="isGrid ? 'grid' : 'list'"
          :title="player.name"
          :subtitle="teamOf(player)?.name ?? '—'"
          :menu="menuItems"
          :menu-label="t('tournament.header.more')"
          :style="{ '--i': i }"
          @open="$router.push(`/players/${player.id}`)"
          @select="onMenu(player, $event)"
        >
          <template #lead>
            <PlayerAvatar
              :name="player.name"
              :color="teamOf(player)?.color ?? '#999'"
              :number="player.number"
              :image="player.image"
              :face="player.face"
              :size="32"
            />
          </template>
          <template #trail>
            <AppChip square :title="t(`players.positions.${player.position}`)">
              {{ player.position }}
            </AppChip>
            <span class="player-power">{{ player.power }}</span>
          </template>
        </AppListItem>
      </TransitionGroup>
      <AppPagination v-model="page" :total-items="filtered.length" :page-size="PAGE_SIZE" />
    </div>

    <AppEmptyState
      v-else-if="!teamsStore.teams.length"
      :icon="UserRound"
      :description="t('players.emptyNoTeams')"
    >
      <template #action>
        <AppButton variant="filled" @click="$router.push('/teams')">
          {{ t("teams.addBtn") }}
        </AppButton>
      </template>
    </AppEmptyState>

    <AppEmptyState
      v-else
      :icon="UserRound"
      :description="t('players.empty', { action: t('players.addBtn') })"
    >
      <template #action>
        <AppButton variant="filled" @click="showAddModal = true">
          {{ t("players.addBtn") }}
        </AppButton>
      </template>
    </AppEmptyState>

    <PlayerFormModal v-if="showAddModal" @close="showAddModal = false" />
    <PlayerFormModal v-if="editingPlayer" :player="editingPlayer" @close="editingPlayer = null" />
    <GeneratePlayersModal
      v-if="showGenerateModal"
      :team-id="teamFilter !== 'all' ? teamFilter : undefined"
      @close="showGenerateModal = false"
    />

    <button
      v-if="store.players.length"
      type="button"
      class="delete-all-fab"
      :title="t('players.deleteAllConfirm')"
      :aria-label="t('players.deleteAllConfirm')"
      @click="handleDeleteAll"
    >
      <AppIcon :icon="Trash2" size="lg" />
    </button>
  </div>
</template>

<style scoped>
.page-top-actions {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  flex-shrink: 0;
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

/* Power, the number the simulation runs on. */
.player-power {
  min-width: 2ch;
  font-family: var(--font-mono);
  font-size: var(--fs-base);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--text);
  text-align: end;
}

.delete-all-fab {
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
  background: var(--danger);
  color: #fff;
  box-shadow: var(--shadow-md);
  cursor: pointer;
  z-index: var(--z-bottom-bar);
  transition:
    transform var(--dur-1) var(--ease),
    box-shadow var(--dur-1) var(--ease);
}

.delete-all-fab:hover {
  transform: scale(1.05);
  box-shadow: var(--elev-3);
}

@media (max-width: 600px) {
  .delete-all-fab {
    bottom: calc(var(--safe-bottom) + var(--mobile-nav-height) + var(--sp-5));
  }
}
</style>
