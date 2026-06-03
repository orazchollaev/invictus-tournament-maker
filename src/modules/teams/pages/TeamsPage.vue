<script setup lang="ts">
import { ref, computed } from "vue"
import { useRouter } from "vue-router"
import { useTeamsStore } from "../store"
import TeamFormModal from "../components/TeamFormModal.vue"
import type { Team } from "../types"
import { X, Pencil, Search, ChevronRight } from "@lucide/vue"
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
          <button class="sm icon-btn" title="Open" @click="router.push(`/teams/${team.id}`)">
            <ChevronRight :size="14" />
          </button>
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
.count {
  font-size: 13px;
  font-weight: 400;
  color: var(--text-muted);
  margin-left: 6px;
}

/* Row layout overrides — Teams uses horizontal body (name + abbr inline) */
.t-body {
  flex-direction: row;
  align-items: center;
  gap: 7px;
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

@media (max-width: 640px) {
  .t-body {
    flex: 1;
  }
  .t-power {
    margin-left: auto;
  }
}
</style>
