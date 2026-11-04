<script setup lang="ts">
import { useI18n } from "vue-i18n"
import { Store } from "@lucide/vue"
import { isMarketAvailable } from "../services/authService"

defineProps<{
  /** The page already has its own round button in this corner — sit above it. */
  stacked?: boolean
}>()

const { t } = useI18n()
</script>

<template>
  <!-- A small quiet bubble: findable, but not competing with the page's own actions. -->
  <RouterLink
    v-if="isMarketAvailable"
    to="/market"
    class="market-fab"
    :class="{ 'market-fab--stacked': stacked }"
    :title="t('market.title')"
    :aria-label="t('market.title')"
  >
    <Store :size="20" />
  </RouterLink>
</template>

<style scoped>
/* Same slot as .load-dataset-fab / .delete-all-fab (42px round buttons). */
.market-fab {
  --fab-slot: calc(var(--safe-bottom) + var(--sp-4));
  --fab-stack: calc(42px + var(--sp-2));
  position: fixed;
  inset-inline-end: calc(var(--safe-right) + var(--sp-4));
  bottom: var(--fab-slot);
  z-index: var(--z-bottom-bar);
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-pill);
  background: color-mix(in srgb, var(--surface) 92%, transparent);
  color: var(--accent);
  box-shadow: var(--shadow-md);
  opacity: 0.92;
  transition:
    opacity var(--dur-1) var(--ease),
    transform var(--dur-1) var(--ease);
}

.market-fab--stacked {
  bottom: calc(var(--fab-slot) + var(--fab-stack));
}

@media (max-width: 600px) {
  .market-fab {
    --fab-slot: calc(var(--safe-bottom) + var(--mobile-nav-height) + var(--sp-5));
  }
}

.market-fab:hover,
.market-fab:focus-visible {
  opacity: 1;
  transform: scale(1.05);
}

.market-fab:active {
  transform: scale(0.96);
}
</style>
