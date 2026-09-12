<script setup lang="ts">
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import { AppButton, AppChip, AppModal, AppToggle } from "@/components/ui"
import { useModal } from "@/composables/useModal"
import { usePlayersStore } from "@/modules/players/store"
import { useTeamsStore } from "../store"
import { drawCoachSpecs, planCoachGeneration } from "../utils/generateCoaches"

const emit = defineEmits<{ close: [] }>()

const { t } = useI18n()
const store = useTeamsStore()
const playersStore = usePlayersStore()
const modal = ref<InstanceType<typeof AppModal> | null>(null)
useModal(() => modal.value?.close())

/** Off: only the clubs without a manager. On: everyone gets a new one. */
const overwrite = ref(false)

const targets = computed(() => planCoachGeneration(store.teams, overwrite.value))
const alreadyCoached = computed(() => store.teams.filter((team) => team.coach).length)
const canGenerate = computed(() => targets.value.length > 0)

function generate() {
  if (!canGenerate.value) return
  store.setCoaches(
    drawCoachSpecs(
      targets.value,
      playersStore.effectiveFirstNames(),
      playersStore.effectiveLastNames()
    )
  )
  modal.value?.close()
}
</script>

<template>
  <AppModal ref="modal" :title="t('coach.generate.title')" @close="emit('close')">
    <div class="form">
      <p class="hint">{{ t("coach.generate.hint") }}</p>

      <div class="form-row">
        <span class="form-label form-label--md">{{ t("coach.generate.overwrite") }}</span>
        <AppToggle v-model="overwrite" :aria-label="t('coach.generate.overwrite')" />
      </div>

      <div class="plan-summary">
        <template v-if="canGenerate">
          <span>{{ t("coach.generate.willAdd", { count: targets.length }) }}</span>
          <AppChip v-if="!overwrite && alreadyCoached" square size="xs">
            {{ t("coach.generate.keeping", { count: alreadyCoached }) }}
          </AppChip>
        </template>
        <span v-else class="plan-full">{{ t("coach.generate.allCoached") }}</span>
      </div>
    </div>

    <template #footer>
      <AppButton variant="filled" :disabled="!canGenerate" @click="generate">
        {{ t("coach.generate.generateBtn") }}
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

.plan-summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-3);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-light);
  background: var(--surface-2);
  font-size: var(--fs-sm);
}

.plan-full {
  color: var(--text-muted);
}
</style>
