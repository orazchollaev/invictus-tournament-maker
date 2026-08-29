<script setup lang="ts">
import { Trophy, Users, UserRound, History, Settings } from "@lucide/vue"
import { useI18n } from "vue-i18n"
import { useNavActive } from "@/composables/useNavActive"

const { t } = useI18n()
const { isNavActive } = useNavActive()

const items = [
  { to: "/tournaments", icon: Trophy, label: () => t("nav.tournaments") },
  { to: "/teams", icon: Users, label: () => t("nav.teams") },
  { to: "/players", icon: UserRound, label: () => t("nav.players") },
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
      <!-- The icon is wrapped so a design language can paint a selection
           indicator behind it alone (M3) without resizing the glyph. -->
      <span class="mobile-nav-indicator">
        <component :is="item.icon" :size="20" class="mobile-nav-icon" />
      </span>
      <span class="mobile-nav-label">{{ item.label() }}</span>
    </RouterLink>
  </nav>
</template>

<style scoped>
/* Desktop uses the site header instead. */
.mobile-nav {
  display: none;
}

@media (max-width: 600px) {
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

  .mobile-nav-indicator {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
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

  /* ══ iOS tab bar ══════════════════════════════════════════════
     A floating glass capsule: heavy blur and saturation over whatever
     scrolls beneath it, a hairline edge, a soft cast shadow so it reads
     as hovering. Nothing is painted behind the selected item — the
     accent tint alone marks it, which is what keeps the bar quiet. */
  [data-design="ios"] .mobile-nav {
    left: calc(var(--safe-left) + var(--sp-3));
    right: calc(var(--safe-right) + var(--sp-3));
    bottom: calc(var(--safe-bottom) + var(--sp-2));
    height: 56px;
    padding: 4px;
    gap: 0;
    border: 0.5px solid color-mix(in srgb, var(--text) 10%, transparent);
    border-radius: var(--radius-pill);
    background: color-mix(in srgb, var(--surface) 62%, transparent);
    backdrop-filter: saturate(180%) blur(30px);
    -webkit-backdrop-filter: saturate(180%) blur(30px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.14);
  }

  [data-design="ios"] .mobile-nav-item {
    gap: 2px;
    border-radius: var(--radius-pill);
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0;
  }

  [data-design="ios"] .mobile-nav-icon {
    width: 23px;
    height: 23px;
    stroke-width: 1.9;
  }

  [data-design="ios"] .mobile-nav-item.router-link-active {
    background: none;
    color: var(--accent);
  }

  [data-design="ios"] .mobile-nav-item:active {
    transform: none;
    opacity: 0.45;
  }

  [data-theme="dark"][data-design="ios"] .mobile-nav {
    background: color-mix(in srgb, var(--surface) 70%, transparent);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.45);
  }

  /* ══ Material 3 navigation bar ════════════════════════════════
     Edge to edge on a solid tonal surface, and the selection is a pill
     behind the icon only — never behind the label. The pill is the
     indicator wrapper, so it can stretch to the cell without ever
     resizing the glyph or overflowing a narrow screen. */
  [data-design="android"] .mobile-nav {
    left: 0;
    right: 0;
    bottom: 0;
    height: auto;
    padding: var(--sp-3) 0 calc(var(--safe-bottom) + var(--sp-3));
    gap: 0;
    border: none;
    border-radius: 0;
    background: var(--surface-2);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    box-shadow: none;
  }

  [data-design="android"] .mobile-nav-item {
    gap: var(--sp-1);
    padding-inline: 2px;
    border-radius: 0;
    background: none;
    color: var(--text-muted);
    font-size: var(--fs-sm);
    font-weight: 500;
  }

  [data-design="android"] .mobile-nav-indicator {
    width: 100%;
    max-width: 64px;
    height: 32px;
    border-radius: var(--radius-pill);
    transition:
      background var(--dur) var(--ease),
      color var(--dur) var(--ease);
  }

  [data-design="android"] .mobile-nav-icon {
    width: 24px;
    height: 24px;
  }

  [data-design="android"] .mobile-nav-item.router-link-active {
    background: none;
    color: var(--text);
  }

  [data-design="android"] .mobile-nav-item.router-link-active .mobile-nav-indicator {
    background: var(--fill-3);
    color: var(--accent);
  }

  [data-design="android"] .mobile-nav-item.router-link-active .mobile-nav-label {
    font-weight: 600;
  }

  [data-design="android"] .mobile-nav-item:active {
    transform: none;
  }
  [data-design="android"] .mobile-nav-item:active .mobile-nav-indicator {
    background: var(--bg-hover);
  }
}
</style>
