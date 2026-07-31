<script setup lang="ts">
/**
 * Labelled number row. Now just `AppField` + `AppNumberInput` — it used
 * to carry its own private copy of the stepper markup and CSS.
 */
import AppField from "./AppField.vue"
import AppNumberInput from "./AppNumberInput.vue"

defineProps<{
  label: string
  min: number
  max: number
  hint?: string
}>()

const modelValue = defineModel<number>({ required: true })
</script>

<template>
  <AppField :label="label" :hint="hint" label-width="lg" class="stepper-row">
    <AppNumberInput v-model="modelValue" :min="min" :max="max" />
  </AppField>
</template>

<style scoped>
.stepper-row {
  margin-bottom: var(--sp-2);
}
</style>
