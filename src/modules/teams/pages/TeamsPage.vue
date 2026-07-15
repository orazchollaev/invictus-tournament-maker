<script setup lang="ts">
import { ref, computed } from "vue"
import { useRouter } from "vue-router"
import { useTeamsStore } from "../store"
import { useSettingsStore } from "@/modules/settings/store"
import TeamFormModal from "../components/TeamFormModal.vue"
import TeamBadge from "../components/TeamBadge.vue"
import type { Team } from "../types"
import BtnGroup from "@/components/BtnGroup.vue"
import { X, Pencil, Search, Plus, Users, List, Grid3x3 } from "@lucide/vue"
import { MAX_TEAMS } from "@/constants"
import { useI18n } from "vue-i18n"

const { t } = useI18n()
const store = useTeamsStore()
const settings = useSettingsStore()
const router = useRouter()

const showAddModal = ref(false)
const editingTeam = ref<Team | null>(null)
const query = ref("")

const viewOptions = computed(() => [
  { value: "list", label: t("tournaments.viewList"), icon: List },
  { value: "grid", label: t("tournaments.viewGrid"), icon: Grid3x3 },
])

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return store.teams
  return store.teams.filter((t) => t.name.toLowerCase().includes(q))
})
</script>

<template>
  <div class="page">
    <div class="page-top">
      <h2 class="page-title">
        {{ t("teams.title") }}
        <span class="count">{{ store.teams.length }}/{{ MAX_TEAMS }}</span>
      </h2>
      <button
        class="primary"
        :disabled="store.teams.length >= MAX_TEAMS"
        :title="store.teams.length >= MAX_TEAMS ? t('teams.limitReached', { max: MAX_TEAMS }) : ''"
        @click="showAddModal = true"
      >
        <Plus :size="12" />
        {{ t("teams.addBtn") }}
      </button>
    </div>

    <div v-if="store.teams.length" class="search-row">
      <div class="search-wrap">
        <Search :size="14" class="search-icon" />
        <input v-model="query" class="search-input" :placeholder="t('teams.searchPlaceholder')" />
      </div>
      <BtnGroup v-model="settings.teamsListView" :options="viewOptions" />
    </div>

    <div v-if="store.teams.length" class="t-list">
      <p v-if="!filtered.length" class="empty-text">{{ t("teams.noMatch", { query }) }}</p>
      <TransitionGroup
        name="list"
        tag="div"
        :class="settings.teamsListView === 'grid' ? 't-grid' : 't-list-inner'"
      >
        <div
          v-for="(team, i) in filtered"
          :key="team.id"
          :class="settings.teamsListView === 'grid' ? 't-card' : 't-row'"
          :style="{ '--team-color': team.color, '--i': i }"
          @click="router.push(`/teams/${team.id}`)"
        >
          <div class="t-body">
            <TeamBadge :team="team" :size="18" />
          </div>
          <span class="t-power">{{ team.power }}</span>
          <div class="t-actions">
            <button class="sm icon-btn" :title="t('common.edit')" @click.stop="editingTeam = team">
              <Pencil :size="13" />
            </button>
            <button class="danger sm icon-btn" @click.stop="store.remove(team.id)">
              <X :size="13" />
            </button>
          </div>
        </div>
      </TransitionGroup>
    </div>
    <div v-else class="empty-state">
      <Users :size="44" class="empty-icon" />
      <p class="empty-text">{{ t("teams.empty", { action: t("teams.addBtn") }) }}</p>
      <button class="primary" @click="showAddModal = true">
        {{ t("teams.addBtn") }}
      </button>
    </div>

    <TeamFormModal v-if="showAddModal" @close="showAddModal = false" />
    <TeamFormModal v-if="editingTeam" :team="editingTeam" @close="editingTeam = null" />
  </div>
</template>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 14px;
  text-align: center;
}
.empty-icon {
  color: var(--text-muted);
  opacity: 0.25;
}

.count {
  font-size: 13px;
  font-weight: 400;
  color: var(--text-muted);
  margin-left: 6px;
}

/* Team-colored left border + clickable */
.t-row {
  cursor: pointer;
  border-left-color: var(--team-color, var(--border-light));
}
.t-row:hover {
  border-left-color: var(--team-color, var(--accent));
  background: color-mix(in srgb, var(--team-color, var(--accent)) 6%, var(--surface));
}

/* Row layout — Teams uses horizontal body (name + abbr inline) */
.t-body {
  flex-direction: row;
  align-items: center;
  gap: 7px;
}
.t-power {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
  background: var(--bg);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  padding: 2px 8px;
  min-width: 34px;
  text-align: center;
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}

@media (max-width: 640px) {
  .t-body {
    flex: 1;
    min-width: 0;
  }
}

.t-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--sp-3);
}

@media (min-width: 641px) {
  .t-grid {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  }
}

.t-grid .t-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  padding: var(--sp-3);
  padding-right: 68px;
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-left: 3px solid var(--team-color, var(--border-light));
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  min-width: 0;
  cursor: pointer;
  transition:
    border-color var(--dur-fast),
    box-shadow var(--dur),
    transform var(--dur),
    background var(--dur-fast);
}

.t-grid .t-card:hover {
  border-left-color: var(--team-color, var(--accent));
  background: color-mix(in srgb, var(--team-color, var(--accent)) 6%, var(--surface));
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

.t-grid .t-card .t-body {
  flex-direction: row;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
}

.t-grid .t-card .t-power {
  align-self: flex-start;
}

.t-grid .t-card .t-actions {
  position: absolute;
  top: var(--sp-2);
  right: var(--sp-2);
}
</style>
