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

/* ── Design languages ────────────────────────────────────────────
   iOS: the platform's 51×31 switch — borderless track, large knob. */
[data-design="ios"] .toggle-switch {
  width: 51px;
  height: 31px;
  border-color: transparent;
  background: var(--fill-3);
}
[data-design="ios"] .toggle-switch[data-state="checked"] {
  border-color: transparent;
}
[data-design="ios"] .toggle-knob {
  width: 27px;
  height: 27px;
  left: 2px;
  box-shadow: var(--shadow-md);
}
[data-design="ios"] .toggle-switch[data-state="checked"] .toggle-knob {
  transform: translate(20px, -50%);
}

/* Material 3: outlined track, knob grows once the switch is on. */
[data-design="android"] .toggle-switch {
  width: 52px;
  height: 32px;
  background: var(--bg);
  border-width: 2px;
  border-color: var(--border);
}
[data-design="android"] .toggle-switch[data-state="checked"] {
  background: var(--accent);
  border-color: var(--accent);
}
[data-design="android"] .toggle-knob {
  width: 16px;
  height: 16px;
  left: 6px;
  background: var(--text-muted);
  box-shadow: none;
  transition:
    transform var(--dur-fast) var(--ease),
    width var(--dur-fast) var(--ease),
    height var(--dur-fast) var(--ease),
    background var(--dur-fast) var(--ease);
}
[data-design="android"] .toggle-switch[data-state="checked"] .toggle-knob {
  width: 24px;
  height: 24px;
  left: 2px;
  background: var(--on-accent);
  transform: translate(22px, -50%);
}

@media (prefers-reduced-motion: reduce) {
  .toggle-switch,
  .toggle-knob {
    transition: none;
  }
}
</style>
