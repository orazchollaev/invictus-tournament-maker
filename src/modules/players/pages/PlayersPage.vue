<script setup lang="ts">
import { ref, computed } from "vue"
import { usePlayersStore } from "../store"
import { useTeamsStore } from "@/modules/teams/store"
import { useSettingsStore } from "@/modules/settings/store"
import PlayerFormModal from "../components/PlayerFormModal.vue"
import PlayerAvatar from "../components/PlayerAvatar.vue"
import PlayersFilterMenu from "../components/PlayersFilterMenu.vue"
import type { Player } from "../types"
import {
  AppButton,
  AppCard,
  AppChip,
  AppEmptyState,
  AppIcon,
  AppSearchInput,
  BtnGroup,
} from "@/components/ui"
import { X, Pencil, Plus, UserRound, List, Grid3x3 } from "@lucide/vue"
import { useI18n } from "vue-i18n"

const { t } = useI18n()
const store = usePlayersStore()
const teamsStore = useTeamsStore()
const settings = useSettingsStore()

const showAddModal = ref(false)
const editingPlayer = ref<Player | null>(null)
const query = ref("")
const teamFilter = ref("all")

const isGrid = computed(() => settings.playersListView === "grid")

const viewOptions = computed(() => [
  { value: "list", label: t("tournaments.viewList"), icon: List },
  { value: "grid", label: t("tournaments.viewGrid"), icon: Grid3x3 },
])

function teamOf(player: Player) {
  return teamsStore.teams.find((tm) => tm.id === player.teamId)
}

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
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
</script>

<template>
  <div class="page">
    <div class="page-top">
      <h2 class="page-title">
        {{ t("players.title") }}
        <span class="count">{{ store.players.length }}</span>
      </h2>
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

    <div v-if="store.players.length" class="search-row">
      <AppSearchInput v-model="query" :placeholder="t('players.searchPlaceholder')" />
      <BtnGroup v-model="settings.playersListView" :options="viewOptions" size="md" />
      <PlayersFilterMenu
        v-model:team-filter="teamFilter"
        v-model:sort-key="settings.playersSortKey"
        v-model:sort-asc="settings.playersSortAsc"
        :teams="teamsStore.teams"
      />
    </div>

    <div v-if="store.players.length" class="t-list">
      <p v-if="!filtered.length" class="empty-text">{{ t("players.noMatch") }}</p>
      <TransitionGroup name="list" tag="div" :class="isGrid ? 'player-grid' : 't-list-inner'">
        <AppCard
          v-for="(player, i) in filtered"
          :key="player.id"
          rail
          padding="sm"
          interactive
          class="player-card"
          :class="{ 'player-card--grid': isGrid }"
          :style="{ '--rail-color': teamOf(player)?.color ?? '#999', '--i': i }"
          @click="$router.push(`/players/${player.id}`)"
        >
          <div class="player-card-main">
            <PlayerAvatar
              :name="player.name"
              :color="teamOf(player)?.color ?? '#999'"
              :number="player.number"
              :size="28"
              class="player-card-avatar"
            />
            <div class="player-card-info">
              <span class="player-card-name">{{ player.name }}</span>
              <span class="player-card-team">{{ teamOf(player)?.name ?? "—" }}</span>
            </div>
          </div>
          <div class="player-card-tags">
            <AppChip
              square
              class="player-position"
              :title="t(`players.positions.${player.position}`)"
            >
              {{ player.position }}
            </AppChip>
            <AppChip square class="player-power">{{ player.power }}</AppChip>
          </div>
          <div class="player-actions">
            <AppButton
              variant="text"
              icon-only
              :title="t('common.edit')"
              @click.stop="editingPlayer = player"
            >
              <AppIcon :icon="Pencil" />
            </AppButton>
            <AppButton variant="danger" icon-only @click.stop="store.remove(player.id)">
              <AppIcon :icon="X" />
            </AppButton>
          </div>
        </AppCard>
      </TransitionGroup>
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
  </div>
</template>

<style scoped>
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

.player-card :deep(.card-body) {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  min-width: 0;
}

.player-card-main {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  flex: 1;
  min-width: 0;
}

.player-card-avatar {
  flex-shrink: 0;
}

.player-card-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  line-height: 1.3;
}

.player-card-tags {
  display: flex;
  align-items: center;
  gap: var(--sp-1);
  flex-shrink: 0;
}

.player-card-name {
  font-size: var(--fs-base);
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.player-card-team {
  font-size: var(--fs-xs);
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.player-position {
  min-width: 34px;
  justify-content: center;
  font-variant-numeric: tabular-nums;
}

.player-power {
  min-width: 30px;
  justify-content: center;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.player-actions {
  display: flex;
  align-items: center;
  gap: var(--sp-1);
  flex-shrink: 0;
}

.player-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--sp-2);
}

@media (min-width: 641px) {
  .player-grid {
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  }
}

.player-card--grid {
  position: relative;
}

/* Grid cards are narrow — stack the name row above the tag row instead of
   cramming everything onto one line, or the name gets squeezed to nothing. */
.player-card--grid :deep(.card-body) {
  flex-direction: column;
  align-items: stretch;
  padding-inline-end: 68px;
}

.player-card--grid .player-card-tags {
  padding-inline-start: calc(28px + var(--sp-2));
}

.player-card--grid .player-actions {
  position: absolute;
  top: var(--sp-2);
  inset-inline-end: var(--sp-2);
}
</style>
