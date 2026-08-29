<script setup lang="ts">
import { onScopeDispose, ref, watch } from "vue"
import { useHaptic } from "@/composables/useHaptic"

const props = withDefaults(
  defineProps<{
    min: number
    max: number
    step?: number
    editable?: boolean
    disabled?: boolean
    valueWidth?: "xs" | "sm" | "md"
    size?: "sm" | "md"
    layout?: "row" | "stack"
    empty?: boolean
    placeholder?: string
  }>(),
  { step: 1, valueWidth: "sm", size: "md", layout: "row" }
)

const emit = defineEmits<{ bump: [value: number] }>()

const model = defineModel<number>({ required: true })

const { tap } = useHaptic()

const clamp = (v: number) => Math.max(props.min, Math.min(props.max, v))

const emitted = ref<number | null>(null)
watch(model, () => (emitted.value = null))

function bump(delta: number) {
  const next = clamp((emitted.value ?? model.value) + delta * props.step)
  emitted.value = next
  model.value = next
  emit("bump", next)
  tap()
}

const HOLD_DELAY = 400
const REPEAT_MS = 110
const FAST_AFTER = 1200
const FAST_MS = 55

let holdTimer: ReturnType<typeof setTimeout> | null = null
let repeatTimer: ReturnType<typeof setInterval> | null = null

function stopHold() {
  if (holdTimer !== null) clearTimeout(holdTimer)
  if (repeatTimer !== null) clearInterval(repeatTimer)
  holdTimer = null
  repeatTimer = null
}

function atBound(delta: number): boolean {
  return (emitted.value ?? model.value) === (delta > 0 ? props.max : props.min)
}

function startHold(delta: number) {
  stopHold()
  if (props.disabled) return
  holdTimer = setTimeout(() => {
    const startedAt = Date.now()
    repeatTimer = setInterval(() => {
      bump(delta)
      // Bounds reached — nothing left to repeat.
      if (atBound(delta)) {
        stopHold()
        return
      }
      if (Date.now() - startedAt > FAST_AFTER && repeatTimer !== null) {
        clearInterval(repeatTimer)
        repeatTimer = setInterval(() => {
          bump(delta)
          if (atBound(delta)) stopHold()
        }, FAST_MS)
      }
    }, REPEAT_MS)
  }, HOLD_DELAY)
}

onScopeDispose(stopHold)

function onInputFocus(e: FocusEvent) {
  ;(e.target as HTMLInputElement).select()
}
</script>

<template>
  <div class="num" :class="[`num--${size}`, `num--${layout}`, { 'num--disabled': disabled }]">
    <button
      v-if="layout === 'row'"
      type="button"
      class="num-btn"
      :disabled="disabled || (!empty && model <= min)"
      :aria-label="`−${step}`"
      @click="bump(-1)"
      @pointerdown="startHold(-1)"
      @pointerup="stopHold"
      @pointerleave="stopHold"
      @pointercancel="stopHold"
      @contextmenu.prevent
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
      :placeholder="placeholder"
      :disabled="disabled"
      @focus="onInputFocus"
      @change="model = clamp(model)"
    />
    <span v-else class="num-value" :class="`num-value--${valueWidth}`">
      {{ empty ? (placeholder ?? "") : model }}
    </span>

    <button
      v-if="layout === 'row'"
      type="button"
      class="num-btn"
      :disabled="disabled || (!empty && model >= max)"
      :aria-label="`+${step}`"
      @click="bump(1)"
      @pointerdown="startHold(1)"
      @pointerup="stopHold"
      @pointerleave="stopHold"
      @pointercancel="stopHold"
      @contextmenu.prevent
    >
      +
    </button>

    <!-- Stacked layout: one narrow column instead of two side cells, so a
         score cell costs the width of the number plus ~18px. -->
    <div v-else class="num-stack">
      <button
        type="button"
        class="num-btn num-btn--up"
        :disabled="disabled || (!empty && model >= max)"
        :aria-label="`+${step}`"
        @click="bump(1)"
        @pointerdown="startHold(1)"
        @pointerup="stopHold"
        @pointerleave="stopHold"
        @pointercancel="stopHold"
        @contextmenu.prevent
      >
        +
      </button>
      <button
        type="button"
        class="num-btn num-btn--down"
        :disabled="disabled || (!empty && model <= min)"
        :aria-label="`−${step}`"
        @click="bump(-1)"
        @pointerdown="startHold(-1)"
        @pointerup="stopHold"
        @pointerleave="stopHold"
        @pointercancel="stopHold"
        @contextmenu.prevent
      >
        −
      </button>
    </div>
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
  /* No double-tap zoom or text selection while hammering the buttons. */
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
}

.num--disabled {
  opacity: 0.5;
}

/* ── Design languages ────────────────────────────────────────────
   iOS: the stepper control — one grey capsule, a hairline between the
   two halves, no outline. */
[data-design="ios"] .num {
  border-color: transparent;
  border-radius: var(--radius-pill);
  background: var(--fill-1);
}
[data-design="ios"] .num-btn {
  background: transparent;
  color: var(--text);
}
[data-design="ios"] .num-btn:first-child {
  border-right-color: color-mix(in srgb, var(--text) 12%, transparent);
}
[data-design="ios"] .num-btn:last-child {
  border-left-color: color-mix(in srgb, var(--text) 12%, transparent);
}
[data-design="ios"] .num-value {
  font-weight: 500;
}

/* M3: capsule outline, circular tonal buttons at each end. */
[data-design="android"] .num {
  border-radius: var(--radius-pill);
  border-color: var(--border);
}
[data-design="android"] .num-btn {
  background: var(--fill-1);
  color: var(--accent);
}
[data-design="android"] .num-btn:first-child,
[data-design="android"] .num-btn:last-child {
  border-color: transparent;
}
[data-design="android"] .num-value {
  font-weight: 500;
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
  touch-action: manipulation;
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
.num-btn:active:not(:disabled) {
  background: color-mix(in srgb, var(--accent) 18%, transparent);
  color: var(--accent);
}

.num-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.num-value {
  height: stretch;
  text-align: center;
  font-family: var(--font-ui);
  font-size: var(--fs-md);
  font-weight: 700;
  color: var(--text);
}

.num-value--xs {
  width: 26px;
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
  appearance: textfield;
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

/* ── Match-card variant ──
   Same anatomy at score-cell scale: 20px buttons keep the control inside a
   26px row while staying a real tap target. */
.num--sm {
  background: var(--surface);
  border-color: var(--border-light);
}
.num--sm .num-btn {
  /* 24px floor — the small variant used to paint a 20x22 target. */
  width: 24px;
  height: 24px;
  font-size: var(--fs-sm);
  background: transparent;
  color: var(--text-muted);
}
.num--sm.num--row .num-btn:first-child {
  border-right-color: var(--border-light);
}
.num--sm.num--row .num-btn:last-child {
  border-left-color: var(--border-light);
}
.num--sm .num-value {
  font-size: var(--fs-sm);
  padding: 0;
}
.num--sm .num-value--input {
  background: transparent;
  color: inherit;
}

/* ── Stacked layout ──
   `+` over `−` in a single column. A score cell then costs the number plus one
   button width, which is what lets a bracket card keep its name column. */
.num--stack .num-stack {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  align-self: stretch;
  border-left: 1px solid var(--border);
}
/* Stacked halves are height-capped by the match-card row they sit in, so the
   extra target area has to come from the width. */
.num--stack .num-btn {
  width: 34px;
  height: 19px;
  border: none;
  border-radius: 0;
  font-size: var(--fs-md);
  font-weight: 700;
  line-height: 1;
}
.num--stack .num-btn--up {
  border-bottom: 1px solid var(--border);
}

.num--sm.num--stack .num-stack {
  border-left-color: var(--border-light);
}
/* Halves sized against the 34px match-card rows (15 + 1 + 15 + the control's
   own 2px border = 33). Anything smaller was not a tap target. */
.num--sm.num--stack .num-btn {
  width: 30px;
  height: 15px;
  font-size: var(--fs-sm);
}
.num--sm.num--stack .num-btn--up {
  border-bottom-color: var(--border-light);
}
</style>
