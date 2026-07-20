<script setup lang="ts">
import { SwitchRoot, SwitchThumb } from "reka-ui"

defineProps<{
  modelValue: boolean
  ariaLabel?: string
  disabled?: boolean
}>()

defineEmits<{ "update:modelValue": [value: boolean] }>()
</script>

<template>
  <SwitchRoot
    class="toggle-switch"
    :model-value="modelValue"
    :aria-label="ariaLabel"
    :disabled="disabled"
    @update:model-value="(value) => $emit('update:modelValue', value)"
  >
    <SwitchThumb class="toggle-knob" />
  </SwitchRoot>
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
.toggle-switch[data-state="checked"] {
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
.toggle-switch[data-state="checked"] .toggle-knob {
  transform: translate(18px, -50%);
}

@media (prefers-reduced-motion: reduce) {
  .toggle-switch,
  .toggle-knob {
    transition: none;
  }
}
</style>
