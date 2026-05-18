<script setup lang="ts">
import { ref } from "vue"
import { useTeamsStore } from "../store"
import type { Team } from "../types"

const store = useTeamsStore()

const newName = ref("")
const newColor = ref("#3366cc")
const newPower = ref(70)

function addTeam() {
  if (!newName.value.trim()) return
  store.add(newName.value.trim(), newColor.value, newPower.value)
  newName.value = ""
  newPower.value = 70
}

const editing = ref<string | null>(null)
const editName = ref("")
const editColor = ref("")
const editPower = ref(70)

function startEdit(team: Team) {
  editing.value = team.id
  editName.value = team.name
  editColor.value = team.color
  editPower.value = team.power
}

function saveEdit(id: string) {
  store.update(id, { name: editName.value, color: editColor.value, power: editPower.value })
  editing.value = null
}
</script>

<template>
  <div class="page">
    <div v-if="store.teams.length < 16" class="section-box">
      <h2>Add Team</h2>
      <div class="section-body">
        <div class="flex">
          <input
            v-model="newName"
            placeholder="Team name"
            style="width: 160px"
            @keyup.enter="addTeam"
          />
          <input
            v-model="newColor"
            type="color"
            style="width: 36px; height: 28px; padding: 0; border: 1px solid var(--border)"
          />
          <label>Power:</label>
          <input v-model.number="newPower" type="number" min="1" max="100" style="width: 60px" />
          <button class="primary" :disabled="!newName.trim()" @click="addTeam">Add</button>
        </div>
      </div>
    </div>

    <div class="section-box">
      <h2>Teams ({{ store.teams.length }}/16)</h2>
      <div class="section-body">
        <table v-if="store.teams.length">
          <thead>
            <tr>
              <th>Color</th>
              <th>Name</th>
              <th>Power</th>
              <th />
            </tr>
          </thead>
          <tbody>
            <tr v-for="team in store.teams" :key="team.id">
              <td>
                <span class="color-dot" :style="{ background: team.color }" />
              </td>
              <td>
                <input v-if="editing === team.id" v-model="editName" style="width: 140px" />
                <span v-else>{{ team.name }}</span>
              </td>
              <td>
                <span v-if="editing === team.id">
                  <input
                    v-model.number="editPower"
                    type="number"
                    min="1"
                    max="100"
                    style="width: 60px"
                  />
                </span>
                <span v-else>{{ team.power }}</span>
              </td>
              <td>
                <span class="flex">
                  <template v-if="editing === team.id">
                    <input
                      v-model="editColor"
                      type="color"
                      style="width: 32px; height: 24px; padding: 0; border: none"
                    />
                    <button class="primary" @click="saveEdit(team.id)">Save</button>
                    <button @click="editing = null">Cancel</button>
                  </template>
                  <template v-else>
                    <button @click="startEdit(team)">Edit</button>
                    <button class="danger" @click="store.remove(team.id)">✕</button>
                  </template>
                </span>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-else style="color: var(--text-muted)">No teams yet.</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.color-dot {
  display: inline-block;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 1px solid var(--border);
}
</style>
