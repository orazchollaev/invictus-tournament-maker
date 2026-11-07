<script setup lang="ts">
import { ref, computed, watch } from "vue"
import { useRouter } from "vue-router"
import { useTeamsStore } from "@/modules/teams/store"
import { useTournamentStore } from "@/modules/tournament/store"
import { useSettingsStore } from "@/modules/settings/store"
import type { Tournament } from "../types"
import { TeamCrest } from "@/modules/teams/components"
import { ChampionPill, TournamentsFilterMenu } from "@/modules/tournament/components"
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
import {
  Grid3x3,
  LayoutGrid,
  List,
  ListOrdered,
  Network,
  Plus,
  Settings,
  Shuffle,
  Store,
  Trash2,
  Trophy,
  Workflow,
} from "@lucide/vue"
import { showConfirm } from "@/composables/useDialog"
import { useI18n } from "vue-i18n"

/** A tournament cannot be created with fewer teams than this. */
const MIN_TEAMS = 2

const { t } = useI18n()
const router = useRouter()
const teamsStore = useTeamsStore()
const store = useTournamentStore()
const settings = useSettingsStore()

const viewOptions = computed(() => [
  { value: "list", label: t("tournaments.viewList"), icon: List },
  { value: "grid", label: t("tournaments.viewGrid"), icon: Grid3x3 },
])

const isGrid = computed(() => settings.tournamentListView === "grid")
const hasEnoughTeams = computed(() => teamsStore.teams.length >= MIN_TEAMS)

function winnerTeam(tour: Tournament) {
  return teamsStore.teams.find((tm) => tm.id === tour.winnerId)
}

const query = ref("")

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  const list = q
    ? store.tournaments.filter((tn) => tn.name.toLowerCase().includes(q))
    : [...store.tournaments]

  if (settings.tournamentsSortKey === "name") {
    list.sort((a, b) =>
      settings.tournamentsSortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
    )
  } else if (settings.tournamentsSortKey === "season") {
    list.sort((a, b) => (settings.tournamentsSortAsc ? a.season - b.season : b.season - a.season))
  } else {
    list.sort((a, b) => b.createdAt - a.createdAt)
  }

  return list
})

// Mounting every card at once is what makes a long tournament list feel
// laggy — only one page's worth is ever rendered.
const PAGE_SIZE = 24
const page = ref(1)

watch(filtered, () => {
  page.value = 1
})

const pagedTournaments = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE
  return filtered.value.slice(start, start + PAGE_SIZE)
})

function formatLabel(format: string) {
  if (format === "group+bracket") return t("tournaments.format.groupsKo")
  if (format === "league") return t("tournaments.format.league")
  if (format === "swiss") return t("tournaments.format.swiss")
  if (format === "custom") return t("tournaments.format.custom")
  return t("tournaments.format.bracket")
}

/** What a tournament without a champion yet shows in place of the winner's crest. */
function formatIcon(tour: Tournament) {
  if (tour.format === "group+bracket") return LayoutGrid
  if (tour.format === "league") return ListOrdered
  if (tour.format === "swiss") return Shuffle
  if (tour.format === "custom") return Workflow
  return Network
}

type MenuKey = "settings" | "delete"

const menuItems = computed<AppMenuItem<MenuKey>[]>(() => [
  { key: "settings", label: t("tournament.settings"), icon: Settings },
  { key: "delete", label: t("common.delete"), icon: Trash2, danger: true },
])

function onMenu(tour: Tournament, key: MenuKey) {
  if (key === "settings") router.push(`/tournaments/${tour.id}/settings`)
  else void deleteTournament(tour.id)
}

async function deleteTournament(id: string) {
  if (
    await showConfirm(t("tournaments.deleteConfirm"), {
      confirmLabel: t("tournaments.deleteLabel"),
      dangerous: true,
    })
  )
    store.remove(id)
}
</script>

<template>
  <div class="page">
    <div class="page-top">
      <h2 class="page-title">{{ t("tournaments.title") }}</h2>
      <AppButton
        variant="filled"
        :disabled="!hasEnoughTeams"
        :title="hasEnoughTeams ? '' : t('tournaments.needTeamsTitle')"
        @click="router.push('/tournaments/new')"
      >
        <AppIcon :icon="Plus" size="xs" />
        {{ t("tournaments.newBtn") }}
      </AppButton>
    </div>

    <div v-if="!hasEnoughTeams" class="notice">{{ t("tournaments.needTeamsNotice") }}</div>

    <div v-if="store.tournaments.length" class="search-row">
      <AppSearchInput v-model="query" :placeholder="t('tournaments.searchPlaceholder')" />
      <AppButtonGroup v-model="settings.tournamentListView" :options="viewOptions" size="md" />

      <TournamentsFilterMenu
        v-model:sort-key="settings.tournamentsSortKey"
        v-model:sort-asc="settings.tournamentsSortAsc"
      />
    </div>

    <div v-if="store.tournaments.length" class="t-list">
      <p v-if="!filtered.length" class="empty-text">{{ t("tournaments.noMatch", { query }) }}</p>
      <TransitionGroup name="list" tag="div" :class="isGrid ? 't-grid' : 't-list-inner'">
        <AppListItem
          v-for="(tour, i) in pagedTournaments"
          :key="tour.id"
          :layout="isGrid ? 'grid' : 'list'"
          :title="tour.name"
          :lead-icon="winnerTeam(tour) ? undefined : formatIcon(tour)"
          :menu="menuItems"
          :menu-label="t('tournament.header.more')"
          :style="{ '--i': i }"
          @open="router.push(`/tournaments/${tour.id}`)"
          @select="onMenu(tour, $event)"
        >
          <template v-if="winnerTeam(tour)" #lead>
            <TeamCrest :team="winnerTeam(tour)!" :size="28" />
          </template>
          <template #subtitle>
            {{ t("tournament.header.season", { n: tour.season }) }} ·
            {{ formatLabel(tour.format) }} · {{ t("common.teams", { n: tour.teamIds.length }) }}
          </template>
          <template #trail>
            <ChampionPill
              v-if="store.isTournamentFinished(tour.id) && winnerTeam(tour)"
              :team="winnerTeam(tour)!"
            />
            <AppChip v-else square>{{ t("tournaments.live") }}</AppChip>
          </template>
        </AppListItem>
      </TransitionGroup>
      <AppPagination v-model="page" :total-items="filtered.length" :page-size="PAGE_SIZE" />
    </div>

    <AppEmptyState
      v-else-if="hasEnoughTeams"
      :icon="Trophy"
      :description="t('tournaments.empty', { action: t('tournaments.newBtn') })"
    >
      <template #action>
        <div class="empty-actions">
          <AppButton variant="filled" @click="router.push('/tournaments/new')">
            {{ t("tournaments.newBtn") }}
          </AppButton>
          <AppButton variant="outlined" @click="router.push('/market?tab=offline')">
            <AppIcon :icon="Store" size="xs" />
            {{ t("tournaments.selectDatasetBtn") }}
          </AppButton>
        </div>
      </template>
    </AppEmptyState>

    <AppEmptyState v-else-if="!store.tournaments.length" :icon="Trophy">
      <template #action>
        <AppButton variant="outlined" @click="router.push('/market?tab=offline')">
          <AppIcon :icon="Store" size="xs" />
          {{ t("tournaments.selectDatasetBtn") }}
        </AppButton>
      </template>
    </AppEmptyState>
  </div>
</template>

<style scoped>
.empty-actions {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  flex-wrap: wrap;
  justify-content: center;
}
</style>
