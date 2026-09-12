<script setup lang="ts">
/** Shape and instruction, changed mid-match. Takes effect from the next minute. */
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import { AppButton, AppButtonGroup, AppField, AppSelect, AppSheet } from "@/components/ui"
import { FORMATION_LIST, PLAY_STYLES, type LiveTactics } from "@/engine"
import type { Formation, PlayStyle } from "@/modules/teams/types"

const props = defineProps<{ tactics: LiveTactics }>()
const emit = defineEmits<{ apply: [tactics: LiveTactics]; close: [] }>()

const { t } = useI18n()
const sheet = ref<InstanceType<typeof AppSheet> | null>(null)

const formation = ref<Formation>(props.tactics.formation)
const style = ref<PlayStyle>(props.tactics.style)

const formationOptions = computed(() => FORMATION_LIST.map((value) => ({ value, label: value })))
const styleOptions = computed(() =>
  PLAY_STYLES.map((value) => ({ value, label: t(`coach.styles.${value}`) }))
)

function apply() {
  emit("apply", { formation: formation.value, style: style.value })
  sheet.value?.close()
}
</script>

<template>
  <AppSheet ref="sheet" :title="t('manager.tactics.title')" @close="emit('close')">
    <div class="mt-form">
      <p class="mt-hint">{{ t("manager.tactics.hint") }}</p>

      <AppField layout="stack" :label="t('coach.form.formation')">
        <AppSelect v-model="formation" :options="formationOptions" />
      </AppField>

      <AppField
        layout="stack"
        :label="t('coach.form.style')"
        :hint="t(`coach.styleHints.${style}`)"
      >
        <AppButtonGroup v-model="style" :options="styleOptions" block />
      </AppField>
    </div>

    <template #footer>
      <AppButton variant="filled" @click="apply">{{ t("manager.tactics.apply") }}</AppButton>
      <AppButton @click="sheet?.close()">{{ t("common.cancel") }}</AppButton>
    </template>
  </AppSheet>
</template>

<style scoped>
.mt-form {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
  min-width: 0;
}
.mt-hint {
  margin: 0;
  font-size: var(--fs-sm);
  color: var(--text-muted);
}
</style>
