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
 * `title` renders the canonical section header strip (uppercase muted
 * label with a 3px accent rule), replacing the four separate copies of
 * that pattern. Use the `header` slot when you need actions beside it.
 */
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
    <div v-if="title || $slots.title || $slots.actions" class="card-header">
      <h2 class="card-title">
        <slot name="title">{{ title }}</slot>
      </h2>
      <div v-if="$slots.actions" class="card-actions">
        <slot name="actions" />
      </div>
    </div>
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
  background: color-mix(in srgb, var(--accent) 4%, var(--surface));
  box-shadow: var(--elev-2);
  transform: translateY(-1px);
}
.card--interactive.card--rail:hover {
  border-left-color: var(--rail-color, var(--accent));
}

/* ── Header ──────────────────────────────────────────────────── */
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-2);
  padding: var(--sp-3) var(--sp-4);
  background: var(--bg);
  border-bottom: 1px solid var(--border-light);
  border-left: 3px solid var(--accent);
  /* The rail above belongs to the header strip; pull it back into the
     card's own left edge so a railed card doesn't double up. */
  margin-left: -1px;
}

.card-title {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  margin: 0;
  font-family: var(--font-ui);
  font-size: var(--fs-xs);
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--text-muted);
  min-width: 0;
}

.card-actions {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  flex-shrink: 0;
}

/* ── Body ────────────────────────────────────────────────────── */
.card-body--none {
  padding: 0;
}
.card-body--sm {
  padding: var(--sp-3);
}
.card-body--md {
  padding: var(--sp-4);
}
.card-body--lg {
  padding: var(--sp-5);
}

.card-footer {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-3) var(--sp-4);
  border-top: 1px solid var(--border-light);
  background: var(--bg);
}

/* Tables that sit flush inside a card shouldn't double their last border. */
.card :deep(table tr:last-child td),
.card :deep(table tr:last-child th) {
  border-bottom: none;
}

@media (max-width: 640px) {
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
