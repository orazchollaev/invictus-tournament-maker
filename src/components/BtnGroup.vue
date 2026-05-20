<script setup lang="ts">
defineProps<{
  options: { value: string; label: string }[]
  modelValue: string
}>()

defineEmits<{ "update:modelValue": [value: string] }>()
</script>

<template>
  <div class="btn-group">
    <button
      v-for="opt in options"
      :key="opt.value"
      type="button"
      :class="{ active: modelValue === opt.value }"
      @click="$emit('update:modelValue', opt.value)"
    >
      {{ opt.label }}
    </button>
  </div>
</template>

<style scoped>
.btn-group {
  display: flex;
}
.btn-group button {
  border-radius: 0;
  margin-left: -1px;
  position: relative;
  font-size: 12px;
  padding: 4px 10px;
}
.btn-group button:first-child {
  margin-left: 0;
  border-radius: var(--radius) 0 0 var(--radius);
}
.btn-group button:last-child {
  border-radius: 0 var(--radius) var(--radius) 0;
}
.btn-group button.active {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent-hover);
  z-index: 1;
}
.btn-group button.active:hover {
  background: var(--accent-hover);
}
.btn-group button:hover:not(.active) {
  background: var(--border-light);
}
</style>
