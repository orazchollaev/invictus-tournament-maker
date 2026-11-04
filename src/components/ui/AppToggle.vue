<script setup lang="ts">
import { SwitchRoot, SwitchThumb } from "reka-ui"
import { useHaptic } from "@/composables/useHaptic"

defineProps<{
  modelValue: boolean
  ariaLabel?: string
  disabled?: boolean
}>()

const emit = defineEmits<{ "update:modelValue": [value: boolean] }>()
const { selection: hapticSelection } = useHaptic()

function onUpdate(value: boolean) {
  hapticSelection()
  emit("update:modelValue", value)
}
</script>

<template>
  <SwitchRoot
    class="toggle-switch"
    :model-value="modelValue"
    :aria-label="ariaLabel"
    :disabled="disabled"
    @update:model-value="onUpdate"
  >
    <SwitchThumb class="toggle-knob" />
  </SwitchRoot>
</template>

<style scoped>
.toggle-switch {
  flex-shrink: 0;
  position: relative;
  /* The platform's 51x31 switch: borderless track, large knob. */
  width: 51px;
  height: 31px;
  padding: 0;
  border-radius: var(--radius-pill);
  border: 1px solid transparent;
  background: var(--fill-3);
  cursor: pointer;
  transition:
    background var(--dur-fast) var(--ease),
    border-color var(--dur-fast) var(--ease);
}
.toggle-switch[data-state="checked"] {
  background: var(--accent);
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
  left: 2px;
  width: 27px;
  height: 27px;
  border-radius: 50%;
  background: #fff;
  box-shadow: var(--shadow-md);
  transform: translateY(-50%);
  transition: transform var(--dur-fast) var(--ease);
}
.toggle-switch[data-state="checked"] .toggle-knob {
  transform: translate(20px, -50%);
}

@media (prefers-reduced-motion: reduce) {
  .toggle-switch,
  .toggle-knob {
    transition: none;
  }
}
</style>
