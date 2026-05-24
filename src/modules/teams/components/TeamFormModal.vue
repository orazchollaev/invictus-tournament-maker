<script setup lang="ts">
import { ref, watch } from "vue"
import AppModal from "@/components/AppModal.vue"
import { useTeamsStore } from "../store"
import { useModal } from "@/composables/useModal"
import { autoAbbr } from "@/composables/useTeamLookup"
import type { Team } from "../types"

const props = defineProps<{ team?: Team }>()
const emit = defineEmits<{ close: [] }>()

const store = useTeamsStore()
useModal(() => emit("close"))

const isEdit = !!props.team

const name = ref(props.team?.name ?? "")
const abbr = ref(props.team?.abbr ?? "")
const color = ref(props.team?.color ?? "#3366cc")
const power = ref(props.team?.power ?? 70)

const abbrPlaceholder = ref(autoAbbr(name.value))
watch(name, (v) => {
  abbrPlaceholder.value = autoAbbr(v)
})

function submit() {
  if (!name.value.trim()) return
  if (isEdit && props.team) {
    store.update(props.team.id, {
      name: name.value.trim(),
      abbr: abbr.value.trim().slice(0, 7) || undefined,
      color: color.value,
      power: power.value,
    })
  } else {
    store.add(name.value.trim(), color.value, power.value, abbr.value.trim() || undefined)
  }
  emit("close")
}
</script>

<template>
  <AppModal :title="isEdit ? 'Edit Team' : 'Add Team'" @close="emit('close')">
    <div class="form">
      <div class="field">
        <label>Name</label>
        <input
          v-model="name"
          class="input-full"
          placeholder="Team name"
          autofocus
          @keyup.enter="submit"
        />
      </div>

      <div class="field-row">
        <div class="field">
          <label>Abbreviation</label>
          <input
            v-model="abbr"
            class="input-abbr"
            :placeholder="abbrPlaceholder"
            maxlength="7"
            @keyup.enter="submit"
          />
        </div>
        <div class="field">
          <label>Power</label>
          <input
            v-model.number="power"
            type="number"
            min="1"
            max="99"
            class="input-power"
            @keyup.enter="submit"
          />
        </div>
        <div class="field">
          <label>Color</label>
          <input v-model="color" type="color" class="input-color" />
        </div>
      </div>

      <div class="form-actions">
        <button class="primary" :disabled="!name.trim()" @click="submit">
          {{ isEdit ? "Save" : "Add Team" }}
        </button>
        <button @click="emit('close')">Cancel</button>
      </div>
    </div>
  </AppModal>
</template>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.field label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-muted);
}

.field-row {
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

.input-full {
  width: 100%;
}
.input-abbr {
  width: 90px;
}
.input-power {
  width: 72px;
}
.input-color {
  width: 40px;
  height: 32px;
  padding: 2px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  cursor: pointer;
}

.form-actions {
  display: flex;
  gap: 8px;
  padding-top: 4px;
}
</style>
