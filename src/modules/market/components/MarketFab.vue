<script setup lang="ts">
/**
 * The way into the market from the list pages: a labelled pill in the corner.
 *
 * Shown on every platform — the market's built-in tab works offline and
 * needs no account, so there is always something behind it.
 */
import { useI18n } from "vue-i18n"
import { Store } from "@lucide/vue"

defineProps<{
  /** The current page has its own round button in this corner — sit above it. */
  stacked?: boolean
}>()

const { t } = useI18n()
</script>

<template>
  <RouterLink
    to="/market"
    class="market-fab"
    :class="{ 'market-fab--stacked': stacked }"
    :aria-label="t('market.title')"
  >
    <Store :size="17" class="market-fab-icon" />
    <span class="market-fab-label">{{ t("market.fabLabel") }}</span>
  </RouterLink>
</template>

<style scoped>
/* Same corner as .delete-all-fab (a 42px round button). Drawn like the bottom
   nav it floats above: a plain glass capsule with a hairline edge, the accent
   only on the icon. */
.market-fab {
  --fab-slot: calc(var(--safe-bottom) + var(--sp-4));
  --fab-stack: calc(42px + var(--sp-2));
  position: fixed;
  inset-inline-end: calc(var(--safe-right) + var(--sp-4));
  bottom: var(--fab-slot);
  z-index: var(--z-bottom-bar);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 40px;
  padding: 0 var(--sp-4) 0 14px;
  border: 0.5px solid color-mix(in srgb, var(--text) 10%, transparent);
  border-radius: var(--radius-pill);
  background: color-mix(in srgb, var(--surface) 94%, transparent);
  color: var(--text);
  font-family: var(--font-ui);
  font-size: var(--fs-sm);
  font-weight: 600;
  text-decoration: none;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.14);
  /* bottom: it moves up on the players page, where "delete all" takes the corner. */
  transition:
    bottom var(--dur) var(--ease),
    transform var(--dur-fast) var(--ease),
    opacity var(--dur-fast) var(--ease);
}

.market-fab--stacked {
  bottom: calc(var(--fab-slot) + var(--fab-stack));
}

@media (max-width: 600px) {
  .market-fab {
    --fab-slot: calc(var(--safe-bottom) + var(--mobile-nav-height) + var(--sp-5));
  }
}

.market-fab:hover {
  text-decoration: none;
}

.market-fab:active {
  opacity: 0.6;
}

/* Before :focus-visible, which has to win over it. */
/* The same darker glass as the bottom nav in the dark theme. */
[data-theme="dark"] .market-fab {
  background: color-mix(in srgb, var(--surface) 70%, transparent);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.45);
}

.market-fab:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

.market-fab-icon {
  flex-shrink: 0;
  color: var(--accent);
}

@media (prefers-reduced-motion: reduce) {
  .market-fab {
    transition: none;
  }
}
</style>
