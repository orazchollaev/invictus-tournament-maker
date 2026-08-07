<script setup lang="ts">
import { Trophy, Users, History, Settings } from "@lucide/vue"
import { useI18n } from "vue-i18n"
import { useNavActive } from "@/composables/useNavActive"

const { t } = useI18n()
const { isNavActive } = useNavActive()

const items = [
  { to: "/tournaments", icon: Trophy, label: () => t("nav.tournaments") },
  { to: "/teams", icon: Users, label: () => t("nav.teams") },
  { to: "/history", icon: History, label: () => t("nav.history") },
  { to: "/settings", icon: Settings, label: () => t("nav.settings") },
]
</script>

<template>
  <nav class="mobile-nav">
    <RouterLink
      v-for="item in items"
      :key="item.to"
      :to="item.to"
      class="mobile-nav-item"
      :class="{ 'router-link-active': isNavActive(item.to) }"
    >
      <component :is="item.icon" :size="19" class="mobile-nav-icon" />
      <span class="mobile-nav-label">{{ item.label() }}</span>
    </RouterLink>
  </nav>
</template>

<style scoped>
/* Desktop uses the site header instead. */
.mobile-nav {
  display: none;
}

@media (max-width: 640px) {
  .mobile-nav {
    display: flex;
    position: fixed;
    left: calc(var(--safe-left) + var(--sp-2));
    right: calc(var(--safe-right) + var(--sp-2));
    bottom: calc(var(--safe-bottom) + var(--mobile-nav-gap));
    z-index: var(--z-mobile-nav);
    height: var(--mobile-nav-height);
    padding: var(--sp-1);
    gap: var(--sp-1);
    border: 1px solid var(--border-light);
    border-radius: var(--radius-lg);
    background: color-mix(in srgb, var(--surface) 88%, transparent);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    box-shadow: var(--elev-3);
  }

  .mobile-nav-item {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    border-radius: var(--radius);
    color: var(--text-muted);
    text-decoration: none;
    font-size: var(--fs-xs);
    font-weight: 500;
    line-height: 1.2;
    transition:
      background var(--dur-fast) var(--ease),
      color var(--dur-fast) var(--ease),
      transform var(--dur-fast) var(--ease);
  }

  .mobile-nav-item:hover {
    text-decoration: none;
  }

  .mobile-nav-item:active {
    transform: scale(0.94);
  }

  .mobile-nav-item.router-link-active {
    background: color-mix(in srgb, var(--accent) 12%, transparent);
    color: var(--accent);
  }

  .mobile-nav-icon {
    flex-shrink: 0;
  }

  .mobile-nav-label {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
