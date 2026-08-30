<script setup lang="ts">
import { useHaptic } from "@/composables/useHaptic"

const props = withDefaults(
  defineProps<{
    variant?: "filled" | "tonal" | "outlined" | "text" | "danger"
    size?: "xs" | "sm" | "md"
    iconOnly?: boolean
    pill?: boolean
    block?: boolean
    solid?: boolean
    disabled?: boolean
    type?: "button" | "submit" | "reset"
  }>(),
  {
    variant: "outlined",
    size: "sm",
    type: "button",
  }
)

const { tap: hapticTap, warning: hapticWarning } = useHaptic()

/** Every tap gets a tick; destructive buttons get the heavier warning buzz. */
function onPointerDown() {
  if (props.disabled) return
  if (props.variant === "danger") hapticWarning()
  else hapticTap()
}
</script>

<template>
  <button
    :type="type"
    :disabled="disabled"
    class="btn"
    :class="[
      `btn--${variant}`,
      `btn--${size}`,
      {
        'btn--icon': iconOnly,
        'btn--pill': pill,
        'btn--block': block,
        'btn--solid': solid,
      },
    ]"
    @pointerdown="onPointerDown"
  >
    <slot />
  </button>
</template>

<style scoped>
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-1);
  font-family: var(--font-ui);
  font-weight: 600;
  line-height: 1.4;
  white-space: nowrap;
  cursor: pointer;
  border: 1px solid transparent;
  border-radius: var(--radius);
  background: transparent;
  color: var(--text);
  transition:
    background var(--dur-fast) var(--ease),
    border-color var(--dur-fast) var(--ease),
    box-shadow var(--dur-fast) var(--ease),
    color var(--dur-fast) var(--ease),
    transform var(--dur-fast) var(--ease);
}

/* ── Sizes ───────────────────────────────────────────────────── */
.btn--xs {
  font-size: var(--fs-xs);
  padding: var(--sp-1) var(--sp-2);
}
.btn--sm {
  font-size: var(--fs-sm);
  padding: var(--sp-2) var(--sp-3);
}
.btn--md {
  font-size: var(--fs-base);
  padding: var(--sp-2) var(--sp-4);
}

.btn--icon {
  padding: 0;
  gap: 0;
}
.btn--icon.btn--xs {
  width: 24px;
  height: 24px;
}
.btn--icon.btn--sm {
  width: 28px;
  height: 28px;
}
/* 30px painted + the 1px border on each side = a 32px outer box, which
   is exactly what a BtnGroup comes out at. The two stand side by side in
   every search row, so they have to agree. */
.btn--icon.btn--md {
  width: 30px;
  height: 30px;
}

.btn--pill {
  border-radius: var(--radius-pill);
}
.btn--block {
  display: flex;
  width: 100%;
}

/* ── Variants ────────────────────────────────────────────────── */
.btn--outlined {
  background: var(--surface);
  border-color: var(--border);
}
.btn--outlined:hover:not(:disabled) {
  background: var(--accent-subtle);
  border-color: var(--accent);
  color: var(--accent);
  box-shadow: var(--elev-1);
}

.btn--filled {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--on-accent);
  box-shadow: var(--elev-1);
}
.btn--filled:hover:not(:disabled) {
  background: var(--accent-hover);
  border-color: var(--accent-hover);
  box-shadow: var(--elev-2);
  transform: translateY(-1px);
}
.btn--filled:active:not(:disabled) {
  transform: translateY(0) scale(0.97);
}

.btn--tonal {
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  border-color: color-mix(in srgb, var(--accent) 30%, transparent);
  color: var(--accent);
}
.btn--tonal:hover:not(:disabled) {
  background: color-mix(in srgb, var(--accent) 20%, transparent);
  border-color: var(--accent);
}

.btn--text {
  color: var(--text-muted);
}
.btn--text:hover:not(:disabled) {
  background: var(--bg-hover);
  color: var(--text);
}

.btn--danger {
  background: var(--surface);
  border-color: var(--danger);
  color: var(--danger);
}
.btn--danger:hover:not(:disabled) {
  background: color-mix(in srgb, var(--danger) 12%, var(--surface));
  box-shadow: var(--elev-1);
}
.btn--danger.btn--solid {
  background: var(--danger);
  border-color: var(--danger);
  color: var(--on-accent);
}
.btn--danger.btn--solid:hover:not(:disabled) {
  background: color-mix(in srgb, var(--danger) 85%, #000);
  border-color: color-mix(in srgb, var(--danger) 85%, #000);
}

/* ── Shared states ───────────────────────────────────────────── */
.btn:active:not(:disabled) {
  transform: scale(0.96);
}
.btn:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}
.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* ── Design languages ────────────────────────────────────────────
   iOS presses dim; nothing lifts, and filled buttons are capsules. */
[data-design="ios"] .btn {
  font-weight: 600;
}
[data-design="ios"] .btn--filled,
[data-design="ios"] .btn--tonal {
  box-shadow: none;
}
[data-design="ios"] .btn--tonal {
  border-color: transparent;
  background: color-mix(in srgb, var(--accent) 14%, transparent);
}
[data-design="ios"] .btn--text {
  color: var(--accent);
}
[data-design="ios"] .btn--filled:hover:not(:disabled) {
  box-shadow: none;
  transform: none;
}
[data-design="ios"] .btn--outlined:hover:not(:disabled),
[data-design="ios"] .btn--danger:hover:not(:disabled) {
  box-shadow: none;
}
[data-design="ios"] .btn:active:not(:disabled),
[data-design="ios"] .btn--filled:active:not(:disabled) {
  transform: none;
  opacity: 0.55;
}

/* Material 3: every button is a capsule, and pressing paints a state
   layer instead of squashing the button. */
[data-design="android"] .btn {
  border-radius: var(--radius-pill);
  font-weight: 500;
}
[data-design="android"] .btn--md:not(.btn--icon) {
  padding: 10px var(--sp-5);
}
[data-design="android"] .btn--sm:not(.btn--icon) {
  padding: var(--sp-2) var(--sp-4);
}
[data-design="android"] .btn--tonal {
  border-color: transparent;
  background: var(--fill-3);
}
[data-design="android"] .btn--filled {
  box-shadow: none;
}
[data-design="android"] .btn--filled:hover:not(:disabled) {
  transform: none;
}
[data-design="android"] .btn:active:not(:disabled),
[data-design="android"] .btn--filled:active:not(:disabled) {
  transform: none;
  box-shadow: inset 0 0 0 999px color-mix(in srgb, currentColor 12%, transparent);
}

@media (prefers-reduced-motion: reduce) {
  .btn,
  .btn:active:not(:disabled),
  .btn--filled:hover:not(:disabled) {
    transition: none;
    transform: none;
  }
}
</style>
