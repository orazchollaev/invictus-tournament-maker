<script setup lang="ts">
/**
 * The one badge/chip/tag/pill. Collapses ~30 definitions that spanned
 * 5 font sizes and 9 horizontal paddings (`.t-badge`, `.tag`,
 * `.season-badge`, `.group-badge`, `.srp-badge`, `.score-chip`,
 * `.t-format-tag`, `.stepper-badge`, `.phase-chip`, `.mt-badge`, …).
 *
 * variant  neutral  --bg fill + hairline — metadata, counts, seasons
 *          accent   accent-tinted fill + border — active/selected state
 *          success | danger | warning | live | gold — status colours
 *          solid    filled with `color`, white text — the old `.tag`
 */
withDefaults(
  defineProps<{
    variant?: "neutral" | "accent" | "success" | "danger" | "warning" | "live" | "gold" | "solid"
    size?: "xs" | "sm"
    /** Squared corners instead of a pill. */
    square?: boolean
    /** Fill colour for `variant="solid"` (team colours, format tags). */
    color?: string
  }>(),
  {
    variant: "neutral",
    size: "xs",
  }
)
</script>

<template>
  <span
    class="chip"
    :class="[`chip--${variant}`, `chip--${size}`, { 'chip--square': square }]"
    :style="variant === 'solid' && color ? { background: color } : undefined"
  >
    <slot />
  </span>
</template>

<style scoped>
.chip {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-1);
  border: 1px solid transparent;
  border-radius: var(--radius-pill);
  font-family: var(--font-ui);
  font-weight: 600;
  line-height: 1.5;
  white-space: nowrap;
  flex-shrink: 0;
}

.chip--xs {
  font-size: var(--fs-xs);
  padding: 2px var(--sp-2);
}
.chip--sm {
  font-size: var(--fs-sm);
  padding: var(--sp-1) var(--sp-3);
}

.chip--square {
  border-radius: var(--radius);
}

/* ── Variants ────────────────────────────────────────────────── */
.chip--neutral {
  background: var(--bg);
  border-color: var(--border-light);
  color: var(--text-muted);
  font-weight: 500;
}

.chip--accent {
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  border-color: color-mix(in srgb, var(--accent) 30%, transparent);
  color: var(--accent);
}

.chip--success {
  background: color-mix(in srgb, var(--success) 12%, transparent);
  border-color: color-mix(in srgb, var(--success) 30%, transparent);
  color: var(--success);
}

.chip--danger {
  background: color-mix(in srgb, var(--danger) 12%, transparent);
  border-color: color-mix(in srgb, var(--danger) 30%, transparent);
  color: var(--danger);
}

.chip--warning {
  background: color-mix(in srgb, var(--warning) 14%, transparent);
  border-color: color-mix(in srgb, var(--warning) 35%, transparent);
  color: color-mix(in srgb, var(--warning) 80%, var(--text));
}

.chip--live {
  background: color-mix(in srgb, var(--live) 12%, transparent);
  border-color: color-mix(in srgb, var(--live) 30%, transparent);
  color: var(--live);
  font-size: var(--fs-xs);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.chip--gold {
  background: var(--gold-faint);
  border-color: var(--gold-soft);
  color: var(--gold);
}

.chip--solid {
  background: var(--accent);
  color: var(--on-accent);
}
</style>
