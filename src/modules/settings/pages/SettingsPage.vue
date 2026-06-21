<script setup lang="ts">
import { useRouter } from "vue-router"
import { ref, computed, nextTick } from "vue"
import { version } from "../../../../package.json"
import { ArrowLeft, Globe, Monitor, Trophy, Dices, Database, Menu, ChevronDown } from "@lucide/vue"
import type { Component } from "vue"
import { useI18n } from "vue-i18n"
import { useMotionPrefs } from "@/composables/useMotionPrefs"
import SettingsSectionLanguage from "../components/SettingsSectionLanguage.vue"
import SettingsSectionAppearance from "../components/SettingsSectionAppearance.vue"
import SettingsSectionTableRules from "../components/SettingsSectionTableRules.vue"
import SettingsSectionMatchDefaults from "../components/SettingsSectionMatchDefaults.vue"
import SettingsSectionNewTournament from "../components/SettingsSectionNewTournament.vue"
import SettingsSectionGraphics from "../components/SettingsSectionGraphics.vue"
import SettingsSectionDisplay from "../components/SettingsSectionDisplay.vue"
import SettingsSectionSimulation from "../components/SettingsSectionSimulation.vue"
import SettingsSectionSampleData from "../components/SettingsSectionSampleData.vue"
import SettingsSectionDataManagement from "../components/SettingsSectionDataManagement.vue"

const { t } = useI18n()
const router = useRouter()

const CATEGORIES = ["general", "display", "tournament", "simulation", "data"] as const
type Category = (typeof CATEGORIES)[number]

const CATEGORY_ICONS: Record<Category, Component> = {
  general: Globe,
  display: Monitor,
  tournament: Trophy,
  simulation: Dices,
  data: Database,
}

const GROUPS: Record<Category, Component[]> = {
  general: [SettingsSectionLanguage, SettingsSectionAppearance],
  display: [SettingsSectionDisplay, SettingsSectionGraphics],
  tournament: [
    SettingsSectionTableRules,
    SettingsSectionMatchDefaults,
    SettingsSectionNewTournament,
  ],
  simulation: [SettingsSectionSimulation],
  data: [SettingsSectionSampleData, SettingsSectionDataManagement],
}

const { enabled: motionEnabled } = useMotionPrefs()
const transitionName = computed(() => (motionEnabled.value ? "settings-panel" : ""))

const activeCategory = ref<Category>("general")
const menuOpen = ref(false)

function selectCategory(id: Category) {
  menuOpen.value = false
  if (activeCategory.value === id) return
  activeCategory.value = id
  nextTick(() => {
    window.scrollTo({ top: 0, behavior: "auto" })
  })
}
</script>

<template>
  <div class="page">
    <div class="page-header">
      <button class="back-btn" @click="router.back()">
        <ArrowLeft :size="14" />
        {{ t("common.back") }}
      </button>
      <h2>{{ t("settings.title") }}</h2>
    </div>

    <div class="mobile-nav">
      <button class="mobile-nav-trigger" :aria-expanded="menuOpen" @click="menuOpen = !menuOpen">
        <Menu :size="18" class="mobile-nav-burger" />
        <component :is="CATEGORY_ICONS[activeCategory]" :size="16" class="side-link-icon" />
        <span class="mobile-nav-label">{{ t(`settings.nav.${activeCategory}`) }}</span>
        <ChevronDown :size="16" class="mobile-nav-chev" :class="{ 'is-open': menuOpen }" />
      </button>
      <Transition name="menu">
        <div v-if="menuOpen" class="mobile-nav-menu">
          <button
            v-for="cat in CATEGORIES"
            :key="cat"
            class="side-link"
            :class="{ 'side-link--active': activeCategory === cat }"
            :aria-current="activeCategory === cat ? 'page' : undefined"
            @click="selectCategory(cat)"
          >
            <component :is="CATEGORY_ICONS[cat]" :size="16" class="side-link-icon" />
            <span>{{ t(`settings.nav.${cat}`) }}</span>
          </button>
        </div>
      </Transition>
    </div>

    <div class="settings-layout">
      <nav class="settings-sidebar">
        <button
          v-for="cat in CATEGORIES"
          :key="cat"
          class="side-link"
          :class="{ 'side-link--active': activeCategory === cat }"
          :aria-current="activeCategory === cat ? 'page' : undefined"
          @click="selectCategory(cat)"
        >
          <component :is="CATEGORY_ICONS[cat]" :size="16" class="side-link-icon" />
          <span>{{ t(`settings.nav.${cat}`) }}</span>
        </button>
      </nav>

      <div class="settings-panel">
        <Transition :name="transitionName" mode="out-in">
          <div :key="activeCategory" class="category-group">
            <component :is="section" v-for="(section, i) in GROUPS[activeCategory]" :key="i" />
          </div>
        </Transition>

        <div class="version-row">
          <span class="version">v{{ version }}</span>
          <RouterLink class="changelog-btn" to="/guide">
            {{ t("guide.title") }}
          </RouterLink>
          <a
            class="changelog-btn"
            href="https://github.com/orazchollaev/invictus-tournament-maker/blob/main/CHANGELOG.md"
            target="_blank"
            rel="noopener"
          >
            {{ t("settings.changelog") }}
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
.page-header h2 {
  margin: 0;
}
.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: none;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 4px 12px;
  font-size: 13px;
  color: var(--text-muted);
  cursor: pointer;
}
.back-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}

/* ── Layout ── */
.settings-layout {
  display: flex;
  align-items: flex-start;
  gap: var(--sp-5);
}
.settings-panel {
  flex: 1;
  min-width: 0;
}

/* ── Sidebar (desktop) ── */
.settings-sidebar {
  flex: 0 0 200px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  position: sticky;
  top: calc(64px + env(safe-area-inset-top));
}
.side-link {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  text-align: left;
  padding: 9px 12px;
  border: none;
  border-left: 3px solid transparent;
  border-radius: var(--radius);
  background: none;
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition:
    color var(--dur-fast) var(--ease),
    background var(--dur-fast) var(--ease);
}
.side-link-icon {
  flex-shrink: 0;
  opacity: 0.8;
}
.side-link:hover {
  color: var(--text);
  background: var(--border-light);
}
.side-link--active {
  color: var(--accent);
  background: var(--accent-subtle);
  border-left-color: var(--accent);
  font-weight: 600;
}
.side-link--active .side-link-icon {
  opacity: 1;
}
.side-link:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

/* ── Panel content ── */
.category-group {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ── Panel transition ── */
.settings-panel-enter-active,
.settings-panel-leave-active {
  transition:
    opacity var(--dur) var(--ease),
    transform var(--dur) var(--ease);
}
.settings-panel-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
.settings-panel-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* ── Section card "medium" modernization (settings only) ── */
.settings-panel :deep(.section-box h2) {
  display: flex;
  align-items: center;
  gap: 8px;
}
.settings-panel :deep(.section-icon) {
  color: var(--accent);
  flex-shrink: 0;
}
.settings-panel :deep(.section-body) {
  padding: 4px var(--sp-4);
}
.settings-panel :deep(.setting-row) {
  margin-bottom: 0;
  padding: 14px 0;
  border-bottom: 1px solid var(--border-light);
}
.settings-panel :deep(.setting-row:last-child) {
  border-bottom: none;
}

.version-row {
  display: flex;
  align-items: center;
  gap: 8.1px;
  margin-top: 20px;
}
.version {
  font-size: 12px;
  color: var(--text-muted);
}
.changelog-btn {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: var(--radius);
  border: 1px solid var(--border-light);
  color: var(--text-muted);
  text-decoration: none;
  transition: all 0.15s;
}
.changelog-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}

/* ── Mobile hamburger nav (hidden on desktop) ── */
.mobile-nav {
  display: none;
}
.mobile-nav-trigger {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--text);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
.mobile-nav-burger {
  flex-shrink: 0;
  color: var(--text-muted);
}
.mobile-nav-label {
  flex: 1;
  text-align: left;
}
.mobile-nav-chev {
  flex-shrink: 0;
  color: var(--text-muted);
  transition: transform var(--dur-fast) var(--ease);
}
.mobile-nav-chev.is-open {
  transform: rotate(180deg);
}
.mobile-nav-menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  z-index: 20;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: var(--shadow-lg);
}

/* dropdown open/close animation */
.menu-enter-active,
.menu-leave-active {
  transition:
    opacity var(--dur-fast) var(--ease),
    transform var(--dur-fast) var(--ease);
  transform-origin: top;
}
.menu-enter-from,
.menu-leave-to {
  opacity: 0;
  transform: translateY(-6px) scaleY(0.96);
}

@media (max-width: 860px) {
  .settings-sidebar {
    display: none;
  }
  .mobile-nav {
    display: block;
    margin-bottom: 16px;
    position: sticky;
    top: calc(52px + env(safe-area-inset-top));
    z-index: 9;
  }
  .settings-layout {
    flex-direction: column;
    gap: 0;
  }
  .settings-panel {
    width: 100%;
  }
}
@media (max-width: 640px) {
  .mobile-nav {
    top: calc(48px + env(safe-area-inset-top));
  }
}

@media (prefers-reduced-motion: reduce) {
  .mobile-nav-chev {
    transition: none;
  }
}
</style>
