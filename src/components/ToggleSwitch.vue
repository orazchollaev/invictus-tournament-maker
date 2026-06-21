<script setup lang="ts">
defineProps<{
  modelValue: boolean
  ariaLabel?: string
  disabled?: boolean
}>()

const emit = defineEmits<{ "update:modelValue": [value: boolean] }>()

function toggle(current: boolean) {
  emit("update:modelValue", !current)
}
</script>

<template>
  <button
    type="button"
    role="switch"
    class="toggle-switch"
    :class="{ 'is-on': modelValue }"
    :aria-checked="modelValue"
    :aria-label="ariaLabel"
    :disabled="disabled"
    @click="toggle(modelValue)"
  >
    <span class="toggle-knob" />
  </button>
</template>

<style scoped>
.toggle-switch {
  flex-shrink: 0;
  position: relative;
  width: 44px;
  height: 26px;
  padding: 0;
  border-radius: var(--radius-pill);
  border: 1px solid var(--border);
  background: var(--border-light);
  cursor: pointer;
  transition:
    background var(--dur-fast) var(--ease),
    border-color var(--dur-fast) var(--ease);
}
.toggle-switch.is-on {
  background: var(--accent);
  border-color: var(--accent-hover);
}
.toggle-switch:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.toggle-switch:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.toggle-knob {
  position: absolute;
  top: 50%;
  left: 3px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  box-shadow: var(--shadow-sm);
  transform: translateY(-50%);
  transition: transform var(--dur-fast) var(--ease);
}
.toggle-switch.is-on .toggle-knob {
  transform: translate(18px, -50%);
}

@media (prefers-reduced-motion: reduce) {
  .toggle-switch,
  .toggle-knob {
    transition: none;
  }
}
</style>
