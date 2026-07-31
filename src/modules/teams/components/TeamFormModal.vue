<script setup lang="ts">
import { ref, watch } from "vue"
import { AppButton, AppField, AppIcon, AppModal, ColorPicker } from "@/components/ui"
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
      <AppField layout="stack" :label="t('teams.form.name')">
        <div class="input-wrap">
          <input
            v-model="name"
            class="input-full"
            :placeholder="t('teams.form.namePlaceholder')"
            autofocus
            @keyup.enter="submit"
          />
          <AppButton
            variant="text"
            size="xs"
            icon-only
            class="btn-random"
            :title="t('teams.form.randomName')"
            @click="name = randomTeamName()"
          >
            <AppIcon :icon="Shuffle" />
          </AppButton>
        </div>
      </AppField>

      <div class="field-row">
        <AppField layout="stack" :label="t('teams.form.abbreviation')">
          <input
            v-model="abbr"
            class="input-abbr"
            :placeholder="abbrPlaceholder"
            maxlength="7"
            @keyup.enter="submit"
          />
        </AppField>
        <AppField layout="stack" :label="t('teams.form.power')">
          <input
            v-model.number="power"
            type="number"
            min="1"
            max="99"
            class="input-power"
            @keyup.enter="submit"
          />
        </AppField>
      </div>

      <AppField layout="stack" :label="t('teams.form.flag')">
        <AppButton class="btn-flag-toggle" @click="showFlagPicker = true">
          <FlagCircle v-if="flag" :code="flag" :size="20" />
          <span v-show="!flag">{{ t("teams.form.flagNone") }}</span>
        </AppButton>
        <AppButton v-if="flag" variant="text" size="xs" icon-only @click="flag = undefined">
          <AppIcon :icon="X" size="xs" />
        </AppButton>
      </AppField>

      <AppField layout="stack" :label="t('teams.form.color')">
        <ColorPicker v-model="color" />
      </AppField>

      <div class="modal-actions">
        <AppButton variant="filled" :disabled="!name.trim()" @click="submit">
          {{ isEdit ? t("common.save") : t("teams.form.addTitle") }}
        </AppButton>
        <AppButton @click="modal?.close()">{{ t("common.cancel") }}</AppButton>
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
  gap: var(--sp-4);
  min-width: 0;
  max-width: 100%;
}

.field-row {
  display: flex;
  gap: var(--sp-3);
  align-items: flex-end;
}

.input-wrap {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
}

.input-full {
  width: 100%;
  padding-right: var(--sp-6);
}

.btn-random {
  position: absolute;
  right: var(--sp-2);
}

.btn-flag-toggle {
  height: 32px;
}

.input-abbr {
  width: 90px;
}
.input-power {
  width: 72px;
}

@media (max-width: 640px) {
  .field-row {
    flex-wrap: wrap;
  }
  .input-abbr,
  .input-power {
    width: 100%;
  }
}
</style>
