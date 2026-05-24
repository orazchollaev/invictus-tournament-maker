<script setup lang="ts">
import { useRouter } from "vue-router"
import { useTeamsStore } from "../store"
import { useTeamForm } from "../composables/useTeamForm"
import { autoAbbr } from "@/composables/useTeamLookup"
import { X } from "lucide-vue-next"
import { MAX_TEAMS } from "@/constants"

const store = useTeamsStore()
const {
  newName,
  newAbbr,
  newColor,
  newPower,
  addTeam,
  editing,
  editName,
  editAbbr,
  editColor,
  editPower,
  startEdit,
  saveEdit,
} = useTeamForm()

const router = useRouter()
</script>

<template>
  <div class="page">
    <!-- Add Team -->
    <div class="section-box">
      <h2>Add Team</h2>
      <div :class="['section-body', { 'is-disabled': store.teams.length >= MAX_TEAMS }]">
        <div class="flex">
          <input
            v-model="newName"
            :placeholder="
              store.teams.length >= MAX_TEAMS ? `Team limit reached (${MAX_TEAMS})` : 'Team name'
            "
            class="name-input"
            :disabled="store.teams.length >= MAX_TEAMS"
            @keyup.enter="addTeam"
          />
          <input
            v-model="newAbbr"
            :placeholder="newName.trim() ? autoAbbr(newName.trim()) : 'Abbr'"
            maxlength="7"
            class="abbr-input"
            :disabled="store.teams.length >= MAX_TEAMS"
            @keyup.enter="addTeam"
          />
          <input
            v-model="newColor"
            type="color"
            class="color-input"
            :disabled="store.teams.length >= MAX_TEAMS"
          />
          <label class="field-label">Power</label>
          <input
            v-model.number="newPower"
            type="number"
            min="1"
            max="99"
            class="power-input"
            :disabled="store.teams.length >= MAX_TEAMS"
          />
          <button
            class="primary"
            :disabled="!newName.trim() || store.teams.length >= MAX_TEAMS"
            @click="addTeam"
          >
            Add
          </button>
        </div>
      </div>
    </div>

    <!-- Teams list -->
    <div class="section-box">
      <h2>
        Teams
        <span class="count">{{ store.teams.length }}/{{ MAX_TEAMS }}</span>
      </h2>
      <div class="section-body flush">
        <div v-if="store.teams.length" class="teams-list">
          <div
            v-for="team in store.teams"
            :key="team.id"
            class="team-row"
            :class="{ 'is-editing': editing === team.id }"
          >
            <span class="color-dot" :style="{ background: team.color }" />
            <template v-if="editing === team.id">
              <input v-model="editName" class="edit-name" @keyup.enter="saveEdit(team.id)" />
              <input
                v-model="editAbbr"
                :placeholder="autoAbbr(editName)"
                maxlength="7"
                class="abbr-input"
                @keyup.enter="saveEdit(team.id)"
              />
              <input v-model="editColor" type="color" class="color-input-sm" />
              <input v-model.number="editPower" type="number" min="1" max="99" class="edit-power" />
              <button class="primary sm" @click="saveEdit(team.id)">Save</button>
              <button class="sm" @click="editing = null">Cancel</button>
            </template>
            <template v-else>
              <span class="team-name">{{ team.name }}</span>
              <span class="team-power">{{ team.power }}</span>
              <div class="row-actions">
                <button class="sm" @click="router.push(`/teams/${team.id}`)">Open</button>
                <button class="sm" @click="startEdit(team)">Edit</button>
                <button class="danger sm" @click="store.remove(team.id)"><X :size="14" /></button>
              </div>
            </template>
          </div>
        </div>
        <p v-else class="empty-text">No teams yet.</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.name-input {
  width: 260px;
}
.abbr-input {
  width: 70px;
}
.power-input {
  width: 60px;
}
.color-input {
  width: 32px;
  height: 28px;
  padding: 2px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  cursor: pointer;
}
.color-input-sm {
  width: 28px;
  height: 24px;
  padding: 1px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  cursor: pointer;
}
.field-label {
  font-size: 12px;
  color: var(--text-muted);
}
.is-disabled {
  opacity: 0.5;
  pointer-events: none;
}

/* Header count badge */
.count {
  font-family: var(--font-ui);
  font-size: 12px;
  font-weight: normal;
  color: var(--text-muted);
  margin-left: 6px;
}

.teams-list {
  max-height: 500px;
  overflow-y: auto;
}
.team-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-bottom: 1px solid var(--border-light);
  min-width: 0;
}
.team-row:last-child {
  border-bottom: none;
}
.team-row.is-editing {
  background: var(--bg);
}
.color-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 1px solid var(--border-light);
  flex-shrink: 0;
}
.team-name {
  flex: 1;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}
.team-power {
  font-size: 12px;
  color: var(--text-muted);
  flex-shrink: 0;
  width: 28px;
  text-align: right;
}
.row-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}
.edit-name {
  flex: 1;
  min-width: 0;
}
.edit-power {
  width: 56px;
  flex-shrink: 0;
}

.empty-text {
  padding: 12px;
}

@media (max-width: 600px) {
  .section-body > .flex {
    flex-wrap: wrap;
  }
  .name-input {
    width: 100%;
    flex: 1 1 100%;
  }
  .power-input {
    width: 80px;
  }
  .team-row {
    flex-wrap: wrap;
  }
  .team-row.is-editing {
    row-gap: 6px;
  }
  .edit-name {
    flex: 1 1 100%;
  }
}
</style>
