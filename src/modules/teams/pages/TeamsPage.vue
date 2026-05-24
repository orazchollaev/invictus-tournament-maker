<script setup lang="ts">
import { ref, computed } from "vue"
import { useRouter } from "vue-router"
import { useTeamsStore } from "../store"
import TeamFormModal from "../components/TeamFormModal.vue"
import type { Team } from "../types"
import { X, Pencil, Search } from "lucide-vue-next"
import { MAX_TEAMS } from "@/constants"

const store = useTeamsStore()
const router = useRouter()

const showAddModal = ref(false)
const editingTeam = ref<Team | null>(null)
const query = ref("")

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
        Teams
        <span class="count">{{ store.teams.length }}/{{ MAX_TEAMS }}</span>
      </h2>
      <button
        class="primary"
        :disabled="store.teams.length >= MAX_TEAMS"
        :title="store.teams.length >= MAX_TEAMS ? `Team limit reached (${MAX_TEAMS})` : ''"
        @click="showAddModal = true"
      >
        + Add Team
      </button>
    </div>

    <div v-if="store.teams.length" class="search-row">
      <div class="search-wrap">
        <Search :size="14" class="search-icon" />
        <input v-model="query" class="search-input" placeholder="Search teams…" />
      </div>
    </div>

    <div v-if="store.teams.length" class="t-list">
      <p v-if="!filtered.length" class="empty-text">No teams match "{{ query }}".</p>
      <div v-for="team in filtered" :key="team.id" class="t-row">
        <span class="color-dot" :style="{ background: team.color }" />
        <div class="t-body">
          <span class="t-name">{{ team.name }}</span>
          <span v-if="team.abbr" class="t-abbr">{{ team.abbr }}</span>
        </div>
        <span class="t-power">{{ team.power }}</span>
        <div class="t-actions">
          <button class="sm" @click="router.push(`/teams/${team.id}`)">Open</button>
          <button class="sm icon-btn" title="Edit" @click="editingTeam = team">
            <Pencil :size="13" />
          </button>
          <button class="danger sm icon-btn" @click="store.remove(team.id)">
            <X :size="13" />
          </button>
        </div>
      </div>
    </div>
    <p v-else class="empty-text">
      No teams yet. Click
      <strong>+ Add Team</strong>
      to get started.
    </p>

    <TeamFormModal v-if="showAddModal" @close="showAddModal = false" />
    <TeamFormModal v-if="editingTeam" :team="editingTeam" @close="editingTeam = null" />
  </div>
</template>

<style scoped>
.page-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -0.02em;
}
.count {
  font-size: 13px;
  font-weight: 400;
  color: var(--text-muted);
  margin-left: 6px;
}

.search-row {
  margin-bottom: 10px;
}
.search-wrap {
  position: relative;
  display: flex;
  align-items: center;
}
.search-icon {
  position: absolute;
  left: 10px;
  color: var(--text-muted);
  pointer-events: none;
}
.search-input {
  width: 100%;
  padding-left: 32px;
}

.t-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.t-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-radius: 8px;
  min-width: 0;
}

.color-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, currentColor 15%, transparent);
  flex-shrink: 0;
}

.t-body {
  display: flex;
  align-items: center;
  gap: 7px;
  flex: 1;
  min-width: 0;
}
.t-name {
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.t-abbr {
  font-size: 11px;
  color: var(--text-muted);
  background: var(--bg);
  border: 1px solid var(--border-light);
  border-radius: 4px;
  padding: 1px 5px;
  flex-shrink: 0;
}

.t-power {
  font-size: 12px;
  color: var(--text-muted);
  width: 24px;
  text-align: right;
  flex-shrink: 0;
}

.t-actions {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
}
.icon-btn {
  width: 28px;
  height: 28px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-text {
  color: var(--text-muted);
  font-size: 13px;
}

@media (max-width: 600px) {
  .t-row {
    flex-wrap: wrap;
    row-gap: 8px;
  }
  .t-body {
    flex: 1;
  }
  .t-power {
    margin-left: auto;
  }
  .t-actions {
    flex: 1 1 100%;
  }
}
</style>
