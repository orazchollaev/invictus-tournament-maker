<script setup lang="ts">
import { ref, watch } from "vue"
import AppModal from "@/components/AppModal.vue"
import ColorPicker from "@/components/ColorPicker.vue"
import FlagPicker from "./FlagPicker.vue"
import FlagCircle from "./FlagCircle.vue"
import { flagPrimaryColor } from "../flags"
import { useTeamsStore } from "../store"
import { useModal } from "@/composables/useModal"
import { autoAbbr } from "@/composables/useTeamLookup"
import { randomTeamName } from "@/composables/useRandomNames"
import { Shuffle, X } from "@lucide/vue"
import type { Team } from "../types"
import { useI18n } from "vue-i18n"

const props = defineProps<{ team?: Team }>()
const emit = defineEmits<{ close: [] }>()

const { t } = useI18n()
const store = useTeamsStore()
useModal(() => modal.value?.close())

const modal = ref<InstanceType<typeof AppModal> | null>(null)
const flagModal = ref<InstanceType<typeof AppModal> | null>(null)
const isEdit = !!props.team

const name = ref(props.team?.name ?? "")
const abbr = ref(props.team?.abbr ?? "")
const color = ref(props.team?.color ?? "#3366cc")
const flag = ref<string | undefined>(props.team?.flag)
const power = ref(props.team?.power ?? 70)
const showFlagPicker = ref(false)

const abbrPlaceholder = ref(autoAbbr(name.value))
watch(name, (v) => {
  abbrPlaceholder.value = autoAbbr(v)
})

async function onFlagSelect(code: string | undefined) {
  flag.value = code
  flagModal.value?.close()
  if (code) {
    const primary = await flagPrimaryColor(code)
    if (primary) color.value = primary
  }
}

function submit() {
  if (!name.value.trim()) return
  if (isEdit && props.team) {
    store.update(props.team.id, {
      name: name.value.trim(),
      abbr: abbr.value.trim().slice(0, 7) || undefined,
      color: color.value,
      flag: flag.value,
      power: power.value,
    })
  } else {
    store.add(
      name.value.trim(),
      color.value,
      power.value,
      abbr.value.trim() || undefined,
      flag.value
    )
  }
  modal.value?.close()
}
</script>

<template>
  <AppModal
    ref="modal"
    :title="isEdit ? t('teams.form.editTitle') : t('teams.form.addTitle')"
    @close="emit('close')"
  >
    <div class="form">
      <div class="field">
        <label>{{ t("teams.form.name") }}</label>
        <div class="input-wrap">
          <input
            v-model="name"
            class="input-full"
            :placeholder="t('teams.form.namePlaceholder')"
            autofocus
            @keyup.enter="submit"
          />
          <button
            class="btn-random"
            :title="t('teams.form.randomName')"
            @click="name = randomTeamName()"
          >
            <Shuffle :size="14" />
          </button>
        </div>
      </div>

      <div class="field-row">
        <div class="field">
          <label>{{ t("teams.form.abbreviation") }}</label>
          <input
            v-model="abbr"
            class="input-abbr"
            :placeholder="abbrPlaceholder"
            maxlength="7"
            @keyup.enter="submit"
          />
        </div>
        <div class="field">
          <label>{{ t("teams.form.power") }}</label>
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
        <label>{{ t("teams.form.flag") }}</label>
        <div class="flag-header">
          <button type="button" class="btn-flag-toggle" @click="showFlagPicker = true">
            <FlagCircle v-if="flag" :code="flag" :size="20" />
            <span v-show="!flag">{{ t("teams.form.flagNone") }}</span>
          </button>
          <button v-if="flag" type="button" class="btn-flag-remove" @click="flag = undefined">
            <X :size="12" />
          </button>
        </div>
      </div>

      <div class="field">
        <label>{{ t("teams.form.color") }}</label>
        <ColorPicker v-model="color" />
      </div>

      <div class="form-actions">
        <button class="primary" :disabled="!name.trim()" @click="submit">
          {{ isEdit ? t("common.save") : t("teams.form.addTitle") }}
        </button>
        <button @click="modal?.close()">{{ t("common.cancel") }}</button>
      </div>
    </div>
  </AppModal>

  <AppModal
    v-if="showFlagPicker"
    ref="flagModal"
    :title="t('teams.form.flagPickerTitle')"
    :z-index="210"
    @close="showFlagPicker = false"
  >
    <FlagPicker :model-value="flag" @update:model-value="onFlagSelect" />
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
  border-radius: var(--radius);
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

.flag-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-flag-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: var(--radius);
  cursor: pointer;
  color: var(--text-muted);
  transition:
    color 0.1s,
    background 0.1s;
}
.btn-flag-remove:hover {
  color: var(--text);
  background: color-mix(in srgb, var(--border) 60%, transparent);
}

.btn-flag-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  cursor: pointer;
  font-size: 13px;
  color: var(--text);
  transition: background 0.1s;
  height: 32px;
}
.btn-flag-toggle:hover {
  background: var(--bg-hover, rgba(255, 255, 255, 0.08));
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
