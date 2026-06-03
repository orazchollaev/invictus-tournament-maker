<script setup lang="ts">
import { ref, watch } from "vue"
import AppModal from "@/components/AppModal.vue"
import ColorPicker from "@/components/ColorPicker.vue"
import { useTeamsStore } from "../store"
import { useModal } from "@/composables/useModal"
import { autoAbbr } from "@/composables/useTeamLookup"
import { randomTeamName } from "@/composables/useRandomNames"
import { Shuffle } from "@lucide/vue"
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
        <div class="input-wrap">
          <input
            v-model="name"
            class="input-full"
            placeholder="Team name"
            autofocus
            @keyup.enter="submit"
          />
          <button class="btn-random" title="Random name" @click="name = randomTeamName()">
            <Shuffle :size="14" />
          </button>
        </div>
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
      </div>

      <div class="field">
        <label>Color</label>
        <ColorPicker v-model="color" />
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
  min-width: 0;
  max-width: 100%;
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

.input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.input-full {
  width: 100%;
  padding-right: 32px;
}

.btn-random {
  position: absolute;
  right: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  color: var(--text-muted);
  transition:
    color 0.15s,
    background 0.15s;
}
.btn-random:hover {
  color: var(--text);
  background: var(--bg-hover, rgba(255, 255, 255, 0.08));
}

.input-abbr {
  width: 90px;
}
.input-power {
  width: 72px;
}

.form-actions {
  display: flex;
  gap: 8px;
  padding-top: 4px;
  flex-wrap: wrap;
}

@media (max-width: 640px) {
  .field-row {
    flex-wrap: wrap;
  }
  .input-abbr {
    width: 100%;
  }
  .input-power {
    width: 100%;
  }
  .form-actions > button {
    flex: 1;
  }
}
</style>
