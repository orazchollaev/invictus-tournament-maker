<script setup lang="ts">
import { ref } from "vue"
import { Trophy, Users, History, Settings, BookOpen, Menu, X } from "@lucide/vue"
import { useI18n } from "vue-i18n"
import { useNavActive } from "@/composables/useNavActive"
import AppLogo from "./AppLogo.vue"

const { t } = useI18n()
const { isNavActive } = useNavActive()

const open = ref(false)

const items = [
  { to: "/tournaments", icon: Trophy, label: () => t("nav.tournaments") },
  { to: "/teams", icon: Users, label: () => t("nav.teams") },
  { to: "/history", icon: History, label: () => t("nav.history") },
  { to: "/settings", icon: Settings, label: () => t("nav.settings") },
  { to: "/guide", icon: BookOpen, label: () => t("guide.title") },
]

function close() {
  open.value = false
}
</script>

<template>
  <div class="mobile-fab-nav">
    <Transition name="fab-backdrop">
      <div v-if="open" class="fab-backdrop" @click="close" />
    </Transition>

    <Transition name="fab-menu" tag="div">
      <div v-if="open" class="fab-menu">
        <RouterLink
          v-for="item in items"
          :key="item.to"
          :to="item.to"
          class="fab-item"
          :class="{ 'router-link-active': isNavActive(item.to) }"
          @click="close"
        >
          <component :is="item.icon" :size="18" />
          <span class="fab-label">{{ item.label() }}</span>
        </RouterLink>
        <RouterLink to="/" class="fab-item fab-item-logo" @click="close">
          <AppLogo class="fab-logo" />
          <span class="fab-label">Invictus</span>
        </RouterLink>
      </div>
    </Transition>

    <button
      class="fab-toggle"
      :class="{ 'fab-toggle-open': open }"
      :aria-label="t('nav.settings')"
      @click="open = !open"
    >
      <Menu v-if="!open" :size="22" />
      <X v-else :size="22" />
    </button>
  </div>
</template>

<style scoped>
.mobile-fab-nav {
  display: none;
}

@media (max-width: 640px) {
  .mobile-fab-nav {
    display: block;
  }

  .fab-backdrop {
    position: fixed;
    inset: 0;
    z-index: 98;
    background: rgba(0, 0, 0, 0.25);
    backdrop-filter: blur(2px);
  }

  .fab-toggle {
    position: fixed;
    right: 16px;
    bottom: calc(16px + env(safe-area-inset-bottom));
    z-index: 100;
    width: 58px;
    height: 58px;
    border-radius: var(--radius-pill);
    background: linear-gradient(
      145deg,
      color-mix(in srgb, var(--accent) 55%, transparent),
      color-mix(in srgb, var(--accent) 28%, transparent)
    );
    backdrop-filter: blur(20px) saturate(160%);
    -webkit-backdrop-filter: blur(20px) saturate(160%);
    border: 1px solid color-mix(in srgb, white 35%, transparent);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow:
      var(--shadow-lg),
      inset 0 1px 0 color-mix(in srgb, white 30%, transparent);
    transition:
      transform var(--dur) var(--ease),
      background var(--dur-fast) var(--ease);
  }

  .fab-toggle:active {
    transform: scale(0.94);
  }

  .fab-toggle-open {
    background: linear-gradient(
      145deg,
      color-mix(in srgb, var(--accent-hover) 60%, transparent),
      color-mix(in srgb, var(--accent-hover) 32%, transparent)
    );
  }

  .fab-menu {
    position: fixed;
    right: 16px;
    bottom: calc(84px + env(safe-area-inset-bottom));
    z-index: 99;
    display: flex;
    flex-direction: column-reverse;
    align-items: flex-end;
    gap: 10px;
  }

  .fab-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px 8px 10px;
    border-radius: var(--radius-pill);
    background: color-mix(in srgb, var(--surface) 55%, transparent);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    border: 1px solid color-mix(in srgb, var(--border-light) 70%, transparent);
    color: var(--text);
    text-decoration: none;
    font-size: 13px;
    font-weight: 500;
    box-shadow: var(--shadow-md);
    white-space: nowrap;
  }

  .fab-item :deep(svg) {
    flex-shrink: 0;
    color: var(--text-muted);
  }

  .fab-item.router-link-active {
    color: var(--accent);
    border-color: color-mix(in srgb, var(--accent) 40%, transparent);
  }

  .fab-item.router-link-active :deep(svg) {
    color: var(--accent);
  }

  .fab-item-logo {
    font-weight: 800;
  }

  .fab-logo {
    height: 24px;
    width: 24px;
    color: var(--accent);
  }

  .fab-menu-enter-active .fab-item,
  .fab-menu-leave-active .fab-item {
    transition:
      opacity 0.16s var(--ease),
      transform 0.16s var(--ease);
  }
  .fab-menu-enter-from .fab-item,
  .fab-menu-leave-to .fab-item {
    opacity: 0;
    transform: translateY(8px) scale(0.95);
  }

  .fab-backdrop-enter-active,
  .fab-backdrop-leave-active {
    transition: opacity 0.16s var(--ease);
  }
  .fab-backdrop-enter-from,
  .fab-backdrop-leave-to {
    opacity: 0;
  }
}
</style>
