<script setup lang="ts">
/**
 * The one card surface. Collapses the 17 divergent card definitions
 * (`.section-box`, `.form-card`, `.t-card`, `.srp-card`, `.stat-card`,
 * `.dc-panel`, `.stats-panel`, `.mc`, `.tie-card`, …) into one contract.
 *
 * variant  elevated  surface + hairline + shadow — the default card
 *          outlined  surface + hairline, no shadow — dense/nested cards
 *          filled    --bg fill — cards sitting *inside* another card
 *
 * `title` renders the canonical section header strip — that is literally
 * AppSectionHeader, rather than a second copy of it. The two had drifted:
 * this file's own header was accent-coloured with no rule, while the
 * component named after the pattern (and the panels across the tournament
 * tabs) drew a muted label with a 3px accent rule. The named component wins.
 */
import AppSectionHeader from "./AppSectionHeader.vue"

withDefaults(
  defineProps<{
    variant?: "elevated" | "outlined" | "filled"
    padding?: "none" | "sm" | "md" | "lg"
    title?: string
    /** Left accent rail — used by list rows to signal team colour/state. */
    rail?: boolean
    /** Lift on hover. For cards that are links or open something. */
    interactive?: boolean
  }>(),
  {
    variant: "elevated",
    padding: "none",
  }
)
</script>

<template>
  <div
    class="card"
    :class="[`card--${variant}`, { 'card--rail': rail, 'card--interactive': interactive }]"
  >
    <AppSectionHeader v-if="title || $slots.title || $slots.actions" class="card-header">
      <slot name="title">{{ title }}</slot>
      <template v-if="$slots.actions" #actions>
        <slot name="actions" />
      </template>
    </AppSectionHeader>
    <div class="card-body" :class="`card-body--${padding}`">
      <slot />
    </div>
    <div v-if="$slots.footer" class="card-footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<style scoped>
.card {
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-light);
  background: var(--surface);
  overflow: hidden;
  min-width: 0;
}

.card--elevated {
  box-shadow: var(--elev-1);
}
.card--outlined {
  box-shadow: var(--elev-0);
}
.card--filled {
  background: var(--bg);
  box-shadow: var(--elev-0);
}

.card--rail {
  border-left: 3px solid var(--rail-color, transparent);
}

.card--interactive {
  transition:
    border-color var(--dur-fast) var(--ease),
    box-shadow var(--dur) var(--ease),
    transform var(--dur) var(--ease),
    background var(--dur-fast) var(--ease);
}
.card--interactive:hover {
  border-color: var(--border);
  background: color-mix(in srgb, var(--rail-color, var(--accent)) 5%, var(--surface));
  box-shadow: var(--elev-2);
  transform: translateY(-1px);
}
.card--interactive.card--rail:hover {
  border-left-color: var(--rail-color, var(--accent));
}

/* ── Header ──────────────────────────────────────────────────────
   Everything about how the strip *looks* lives in AppSectionHeader.
   Only the fit against the card's own edge is this file's business:
   the accent rule has to sit flush with the card border, not 1px in. */
.card-header {
  margin-left: -1px;
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
}

.card-body--none {
  padding: 0;
}
.card-body--sm {
  padding: var(--sp-2);
}
.card-body--md {
  padding: var(--sp-3);
}
.card-body--lg {
  padding: var(--sp-4);
}

.card-footer {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-3) var(--sp-4);
  border-top: 1px solid var(--border-light);
  background: var(--bg);
}

.card :deep(table tr:last-child td),
.card :deep(table tr:last-child th) {
  border-bottom: none;
}

@media (max-width: 600px) {
  .card-body--md,
  .card-body--lg {
    padding: var(--sp-3);
  }
  .card-header,
  .card-footer {
    padding: var(--sp-2) var(--sp-3);
  }
}

@media (prefers-reduced-motion: reduce) {
  .card--interactive,
  .card--interactive:hover {
    transition: none;
    transform: none;
  }
}
</style>
