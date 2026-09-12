<script setup lang="ts">
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import { Dices } from "@lucide/vue"
import { AppButton, AppButtonGroup, AppField, AppModal, AppSelect } from "@/components/ui"
import { FORMATION_LIST, PLAY_STYLES } from "@/engine"
import { useModal } from "@/composables/useModal"
import { useTeamsStore } from "../store"
import { drawCoachSpec } from "../utils/generateCoaches"
import { usePlayersStore } from "@/modules/players/store"
import type { Formation, PlayStyle, Team } from "../types"

const props = defineProps<{ team: Team }>()
const emit = defineEmits<{ close: [] }>()

const { t } = useI18n()
const store = useTeamsStore()
const playersStore = usePlayersStore()
const modal = ref<InstanceType<typeof AppModal> | null>(null)
useModal(() => modal.value?.close())

const name = ref(props.team.coach?.name ?? "")
const formation = ref<Formation>(props.team.coach?.formation ?? "4-4-2")
const style = ref<PlayStyle>(props.team.coach?.style ?? "balanced")
const power = ref(props.team.coach?.power ?? props.team.power)

const hadCoach = computed(() => !!props.team.coach)
const canSave = computed(() => name.value.trim().length > 0)

const formationOptions = computed(() => FORMATION_LIST.map((value) => ({ value, label: value })))

const styleOptions = computed(() =>
  PLAY_STYLES.map((value) => ({ value, label: t(`coach.styles.${value}`) }))
)

function randomize() {
  const spec = drawCoachSpec(
    props.team,
    playersStore.effectiveFirstNames(),
    playersStore.effectiveLastNames()
  )
  name.value = spec.name
  formation.value = spec.formation
  style.value = spec.style
  power.value = spec.power
}

function save() {
  if (!canSave.value) return
  store.setCoach(props.team.id, {
    name: name.value.trim(),
    formation: formation.value,
    style: style.value,
    power: power.value,
  })
  modal.value?.close()
}

function sack() {
  store.setCoach(props.team.id, undefined)
  modal.value?.close()
}
</script>

<template>
  <AppModal ref="modal" :title="t('coach.form.title')" @close="emit('close')">
    <div class="form">
      <p class="hint">{{ t("coach.form.hint") }}</p>

      <AppField layout="stack" :label="t('coach.form.name')">
        <input
          v-model="name"
          type="text"
          maxlength="40"
          :placeholder="t('coach.form.namePlaceholder')"
        />
      </AppField>

      <AppField
        layout="stack"
        :label="t('coach.form.formation')"
        :hint="t('coach.form.formationHint')"
      >
        <AppSelect v-model="formation" :options="formationOptions" />
      </AppField>

      <AppField
        layout="stack"
        :label="t('coach.form.style')"
        :hint="t(`coach.styleHints.${style}`)"
      >
        <AppButtonGroup v-model="style" :options="styleOptions" block />
      </AppField>

      <AppField layout="stack">
        <template #label>
          <span class="label-row">
            {{ t("coach.form.power") }}
            <span class="power-value">{{ power }}</span>
          </span>
        </template>
        <input
          v-model.number="power"
          class="power-slider"
          type="range"
          min="1"
          max="99"
          step="1"
          :style="{ '--pct': `${((power - 1) / 98) * 100}%` }"
          :aria-label="t('coach.form.power')"
        />
      </AppField>

      <AppButton variant="text" size="xs" @click="randomize">
        <Dices :size="14" />
        {{ t("coach.form.randomize") }}
      </AppButton>
    </div>

    <template #footer>
      <AppButton variant="filled" :disabled="!canSave" @click="save">
        {{ t("common.save") }}
      </AppButton>
      <AppButton v-if="hadCoach" variant="danger" @click="sack">
        {{ t("coach.form.sack") }}
      </AppButton>
      <AppButton @click="modal?.close()">{{ t("common.cancel") }}</AppButton>
    </template>
  </AppModal>
</template>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
  min-width: 0;
}

.hint {
  margin: 0;
  font-size: var(--fs-sm);
  color: var(--text-muted);
}

.label-row {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}

.power-value {
  font-weight: 700;
  color: var(--accent);
}
</style>
