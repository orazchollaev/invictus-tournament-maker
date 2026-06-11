<script setup lang="ts">
defineProps<{
  label: string
  min: number
  max: number
  hint?: string
}>()

const modelValue = defineModel<number>({ required: true })
</script>

<template>
  <div class="stepper-row">
    <span class="stepper-label">{{ label }}</span>
    <div class="stepper">
      <button :disabled="modelValue <= min" @click="modelValue = Math.max(min, modelValue - 1)">
        −
      </button>
      <span class="stepper-val">{{ modelValue }}</span>
      <button :disabled="modelValue >= max" @click="modelValue = Math.min(max, modelValue + 1)">
        +
      </button>
    </div>
    <span v-if="hint" class="stepper-hint">{{ hint }}</span>
  </div>
</template>

<style scoped>
.stepper-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}
.stepper-label {
  font-size: 13px;
  color: var(--text);
  width: 200px;
  flex-shrink: 0;
}
.stepper {
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}
.stepper button {
  width: 30px;
  height: 30px;
  padding: 0;
  border: none;
  border-radius: 0;
  font-size: 16px;
  line-height: 1;
  display: flex;
  justify-content: center;
}
.stepper button:first-child {
  border-right: 1px solid var(--border);
}
.stepper button:last-child {
  border-left: 1px solid var(--border);
}
.stepper-val {
  width: 36px;
  text-align: center;
  font-size: 15px;
  font-family: var(--font-ui);
  font-weight: 700;
}
.stepper-hint {
  font-size: 12px;
  color: var(--text-muted);
}
@media (max-width: 600px) {
  .stepper-label {
    width: auto;
    flex: 1 1 100%;
  }
  .stepper-row {
    row-gap: 6px;
  }
}
</style>
