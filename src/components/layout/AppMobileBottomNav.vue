<script setup lang="ts">
import { Trophy, Users, History, Settings, BookOpen } from "@lucide/vue"
import { useI18n } from "vue-i18n"
import { useNavActive } from "@/composables/useNavActive"

const { t } = useI18n()
const { isNavActive } = useNavActive()

const items = [
  { to: "/tournaments", icon: Trophy, label: () => t("nav.tournaments") },
  { to: "/teams", icon: Users, label: () => t("nav.teams") },
  { to: "/history", icon: History, label: () => t("nav.history") },
  { to: "/guide", icon: BookOpen, label: () => t("guide.title") },
  { to: "/settings", icon: Settings, label: () => t("nav.settings") },
]
</script>

<template>
  <nav class="mobile-bottom-nav">
    <RouterLink
      v-for="item in items"
      :key="item.to"
      :to="item.to"
      class="bottom-nav-item"
      :class="{ 'router-link-active': isNavActive(item.to) }"
    >
      <component :is="item.icon" class="bottom-nav-icon" :size="21" />
      <span class="bottom-nav-label">{{ item.label() }}</span>
    </RouterLink>
  </nav>
</template>

<style scoped>
.mobile-bottom-nav {
  display: none;
}

@media (max-width: 640px) {
  .mobile-bottom-nav {
    position: fixed;
    left: var(--sp-3);
    right: var(--sp-3);
    bottom: calc(var(--sp-3) + env(safe-area-inset-bottom));
    z-index: var(--z-bottom-bar);
    display: flex;
    align-items: stretch;
    border-radius: var(--radius-lg);
    background: color-mix(in srgb, var(--surface) 90%, transparent);
    backdrop-filter: blur(20px) saturate(160%);
    -webkit-backdrop-filter: blur(20px) saturate(160%);
    border: 1px solid var(--border-light);
    box-shadow: var(--shadow-lg);
  }

  .bottom-nav-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    padding: var(--sp-2) var(--sp-1);
    border-radius: var(--radius);
    margin: var(--sp-1);
    color: var(--text-muted);
    text-decoration: none;
    font-size: var(--fs-xs);
    font-weight: 500;
    line-height: 1.1;
    text-align: center;
    transition:
      color var(--dur-fast) var(--ease),
      background var(--dur-fast) var(--ease),
      transform var(--dur-fast) var(--ease);
  }

  .bottom-nav-item:active {
    transform: scale(0.94);
  }

  .bottom-nav-icon {
    transition:
      color var(--dur-fast) var(--ease),
      transform var(--dur-fast) var(--ease);
  }

  .bottom-nav-label {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .bottom-nav-item.router-link-active {
    color: var(--accent);
    background: var(--accent-subtle);
  }

  .bottom-nav-item.router-link-active .bottom-nav-icon {
    transform: translateY(-1px);
  }
}
</style>
