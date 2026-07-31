<script setup lang="ts">
/**
 * `[−][value][+]` control. The single implementation of a pattern that
 * existed four times: the global `.stepper` (forms.css), `AppStepper`'s
 * private copy, `.stepper-ctrl` (SettingsSectionNewTournament) and
 * `.stepper-btn`/`.stepper-value` (SettingsSectionSimulation).
 *
 * `editable` swaps the read-only value for a number input, which is what
 * the simulation settings need so a value can be typed directly.
 */
const props = withDefaults(
  defineProps<{
    min: number
    max: number
    step?: number
    /** Let the user type the value instead of only stepping it. */
    editable?: boolean
    disabled?: boolean
    /** Width of the value cell — wider for 3-digit ranges. */
    valueWidth?: "sm" | "md"
  }>(),
  { step: 1, valueWidth: "sm" }
)

const model = defineModel<number>({ required: true })

const clamp = (v: number) => Math.max(props.min, Math.min(props.max, v))

function bump(delta: number) {
  model.value = clamp(model.value + delta * props.step)
}
</script>

<template>
  <div class="num" :class="{ 'num--disabled': disabled }">
    <button
      type="button"
      class="num-btn"
      :disabled="disabled || model <= min"
      :aria-label="`−${step}`"
      @click="bump(-1)"
    >
      −
    </button>

    <input
      v-if="editable"
      v-model.number="model"
      type="number"
      class="num-value num-value--input"
      :class="`num-value--${valueWidth}`"
      :min="min"
      :max="max"
      :step="step"
      :disabled="disabled"
      @change="model = clamp(model)"
    />
    <span v-else class="num-value" :class="`num-value--${valueWidth}`">{{ model }}</span>

    <button
      type="button"
      class="num-btn"
      :disabled="disabled || model >= max"
      :aria-label="`+${step}`"
      @click="bump(1)"
    >
      +
    </button>
  </div>
</template>

<style scoped>
.num {
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  flex-shrink: 0;
}

.num--disabled {
  opacity: 0.5;
}

.num-btn {
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 0;
  font-size: var(--fs-md);
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface);
  color: var(--text);
  cursor: pointer;
}

.num-btn:first-child {
  border-right: 1px solid var(--border);
}
.num-btn:last-child {
  border-left: 1px solid var(--border);
}

.num-btn:hover:not(:disabled) {
  background: var(--accent-subtle);
  color: var(--accent);
}

.num-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.num-value {
  text-align: center;
  font-family: var(--font-ui);
  font-size: var(--fs-md);
  font-weight: 700;
  color: var(--text);
}

.num-value--sm {
  width: 36px;
}
.num-value--md {
  width: 44px;
}

.num-value--input {
  border: none;
  border-radius: 0;
  background: var(--surface);
  padding: 0 var(--sp-1);
  color: var(--accent);
  -moz-appearance: textfield;
}
.num-value--input:focus {
  outline: none;
  box-shadow: none;
}
.num-value--input::-webkit-outer-spin-button,
.num-value--input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
</style>
