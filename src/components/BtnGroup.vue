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
  display: inline-flex;
  gap: 2px;
  padding: 3px;
  background: var(--border-light);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
.btn-group button {
  border: none;
  background: none;
  box-shadow: none;
  border-radius: calc(var(--radius) - 3px);
  font-size: 12px;
  font-weight: 500;
  padding: 5px 12px;
  color: var(--text-muted);
  transition:
    color var(--dur-fast) var(--ease),
    background var(--dur-fast) var(--ease),
    box-shadow var(--dur-fast) var(--ease);
}
.btn-group button:hover:not(.active) {
  color: var(--text);
  background: color-mix(in srgb, var(--text) 8%, transparent);
}
.btn-group button.active {
  background: var(--accent);
  color: #fff;
  font-weight: 600;
  box-shadow: var(--shadow-sm);
}
.btn-group button.active:hover {
  background: var(--accent-hover);
}

@media (prefers-reduced-motion: reduce) {
  .btn-group button {
    transition: none;
  }
}
</style>
