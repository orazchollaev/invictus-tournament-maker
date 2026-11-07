<script setup lang="ts">
import { computed, ref, nextTick, onMounted, onUnmounted } from "vue"
import { useRoute, useRouter } from "vue-router"
import { APP_VERSION } from "@/constants"
import { useSettingsStore } from "@/modules/settings/store"
import { logEvent } from "@/composables/useAnalytics"
import { openSupport } from "@/composables/useSupport"
import { isMarketAvailable } from "@/modules/market/services/authService"
import { AppButton, AppMenu } from "@/components/ui"
import type { AppMenuItem } from "@/components/ui"
import {
  Palette,
  LayoutGrid,
  Trophy,
  Dices,
  Database,
  Store,
  Music,
  Menu,
  ChevronDown,
  Heart,
} from "@lucide/vue"
import type { Component } from "vue"
import { useI18n } from "vue-i18n"
import {
  SettingsAboutModal,
  SettingsSectionLanguage,
  SettingsSectionAppearance,
  SettingsSectionTableRules,
  SettingsSectionMatchDefaults,
  SettingsSectionNewTournament,
  SettingsSectionGraphics,
  SettingsSectionDisplay,
  SettingsSectionEffects,
  SettingsSectionMusic,
  SettingsSectionSimulation,
  SettingsSectionMarket,
  SettingsSectionDataManagement,
} from "@/modules/settings/components"

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

// The sample datasets moved to the market's offline tab; an old link to their
// settings tab goes there instead.
if (route.query.category === "sampleData") void router.replace("/market?tab=offline")
const settings = useSettingsStore()

/* Locale and design language get their own precise from/to events at the
   control that changes them (see SettingsSectionLanguage / -Appearance) — a
   generic snapshot diff can only say "something changed", not what to. This
   covers the rest of the settings surface, where a per-control event for
   every toggle would be a lot of near-identical wiring for little gain.
   Diffed on unmount rather than watched, so hydrating the persisted values
   on app launch never counts as the user changing anything. */
const TRACKED_SETTINGS_KEYS = [
  "theme",
  "primaryColor",
  "groupLegMode",
  "knockoutLegMode",
  "finalLegMode",
  "surpriseFactor",
  "showTeamAbbr",
  "confettiOnWin",
  "soundOnWin",
  "drawCeremony",
  "newSeasonDrawType",
  "newSeasonGroupDrawType",
  "newSeasonPlayoffSeedMode",
  "tiebreaker",
  "formFactorEnabled",
  "homeAdvantage",
  "redCardImpact",
  "injuriesEnabled",
  "fatigueFactorEnabled",
  "moraleFactorEnabled",
  "injuryFatigueImpact",
  "usePlayerPower",
  "bracketStyle",
  "bracketQuality",
  "bracketHighlightOnHover",
  "bracketConnectorColors",
  "winPoints",
  "drawPoints",
  "lossPoints",
  "gradualReveal",
  "autoAdvanceFixtureStage",
  "liveMatchSpeed",
] as const satisfies readonly (keyof typeof settings)[]

let settingsSnapshot: Partial<Record<(typeof TRACKED_SETTINGS_KEYS)[number], unknown>> = {}

onMounted(() => {
  settingsSnapshot = Object.fromEntries(TRACKED_SETTINGS_KEYS.map((key) => [key, settings[key]]))
})

onUnmounted(() => {
  for (const key of TRACKED_SETTINGS_KEYS) {
    const value = settings[key]
    if (settingsSnapshot[key] !== value) {
      void logEvent("setting_changed", { key, value: String(value) })
    }
  }
})

// "appearance": language + theme/color, both about how the app looks & speaks.
// "bracket": bracket rendering and win-celebration effects — visual feedback,
// kept apart from app-wide appearance.
// "tournament": rules & defaults that shape how tournaments play out.
// "music": background music playback and track management.
// "data": backup/export/import/clear. Ready-made team lists live in the
// market's offline tab, not here.
const CATEGORIES = [
  "appearance",
  "bracket",
  "tournament",
  "simulation",
  "music",
  "market",
  "data",
] as const
type Category = (typeof CATEGORIES)[number]

const CATEGORY_ICONS: Record<Category, Component> = {
  appearance: Palette,
  bracket: LayoutGrid,
  tournament: Trophy,
  simulation: Dices,
  music: Music,
  market: Store,
  data: Database,
}

const GROUPS: Record<Category, Component[]> = {
  appearance: [SettingsSectionLanguage, SettingsSectionAppearance],
  bracket: [SettingsSectionDisplay, SettingsSectionGraphics, SettingsSectionEffects],
  tournament: [
    SettingsSectionTableRules,
    SettingsSectionMatchDefaults,
    SettingsSectionNewTournament,
  ],
  simulation: [SettingsSectionSimulation],
  music: [SettingsSectionMusic],
  market: [SettingsSectionMarket],
  data: [SettingsSectionDataManagement],
}

// The market tab only exists where the market does (Android app, dev browser).
const visibleCategories = CATEGORIES.filter((c) => c !== "market" || isMarketAvailable)

const transitionName = ""

const initialCategory = CATEGORIES.includes(route.query.category as Category)
  ? (route.query.category as Category)
  : "appearance"

const activeCategory = ref<Category>(initialCategory)
const aboutOpen = ref(false)

const categoryMenuItems = computed<AppMenuItem<Category>[]>(() =>
  visibleCategories.map((cat) => ({
    key: cat,
    label: t(`settings.nav.${cat}`),
    icon: CATEGORY_ICONS[cat],
  }))
)

function selectCategory(id: Category) {
  if (activeCategory.value === id) return
  activeCategory.value = id
  nextTick(() => {
    window.scrollTo({ top: 0, behavior: "auto" })
  })
}
</script>

<template>
  <div class="page">
    <div class="page-top">
      <h2 class="page-title">{{ t("settings.title") }}</h2>
    </div>

    <div class="mobile-nav">
      <AppMenu
        :items="categoryMenuItems"
        :label="t('settings.title')"
        :active="activeCategory"
        block
        @select="selectCategory"
      >
        <template #trigger>
          <button type="button" class="mobile-nav-trigger">
            <Menu :size="18" class="mobile-nav-burger" />
            <component :is="CATEGORY_ICONS[activeCategory]" :size="16" class="side-link-icon" />
            <span class="mobile-nav-label">{{ t(`settings.nav.${activeCategory}`) }}</span>
            <ChevronDown :size="16" class="mobile-nav-chev" />
          </button>
        </template>
      </AppMenu>
    </div>

    <div class="settings-layout">
      <nav class="settings-sidebar">
        <button
          v-for="cat in visibleCategories"
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
        <div class="support-card">
          <Heart :size="18" class="support-card-icon" />
          <div class="support-card-text">
            <strong>{{ t("settings.support.title") }}</strong>
            <span>{{ t("settings.support.bannerText") }}</span>
          </div>
          <AppButton variant="tonal" size="sm" @click="openSupport('settings')">
            {{ t("settings.support.button") }}
          </AppButton>
        </div>

        <Transition :name="transitionName" mode="out-in">
          <div :key="activeCategory" class="category-group">
            <component :is="section" v-for="(section, i) in GROUPS[activeCategory]" :key="i" />
          </div>
        </Transition>

        <div class="version-row">
          <span class="version">v{{ APP_VERSION }}</span>
          <RouterLink class="changelog-btn" to="/guide">
            {{ t("guide.title") }}
          </RouterLink>
          <a
            class="changelog-btn"
            href="https://www.youtube.com/@ShiftFnDev"
            target="_blank"
            rel="noopener"
          >
            <svg
              class="tutorials-icon"
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <rect x="2" y="5" width="20" height="14" rx="5" />
              <path d="m10 9 5 3-5 3z" fill="currentColor" stroke="none" />
            </svg>
            {{ t("settings.tutorials") }}
          </a>
          <div class="changelog-btn" @click="aboutOpen = true">
            {{ t("settings.about") }}
          </div>
        </div>
      </div>
    </div>

    <SettingsAboutModal v-if="aboutOpen" @close="aboutOpen = false" />
  </div>
</template>

<style scoped>
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

.settings-sidebar {
  flex: 0 0 240px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  position: sticky;
  top: var(--sticky-top);
}
.side-link {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  width: 100%;
  text-align: start;
  padding: var(--sp-2) var(--sp-3);
  border: none;
  border-left: 3px solid transparent;
  border-radius: var(--radius);
  background: none;
  color: var(--text-muted);
  font-size: var(--fs-base);
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
  color: var(--accent) !important;
  background: var(--accent-subtle) !important;
  font-weight: 600;
}
.side-link--active .side-link-icon {
  opacity: 1;
}
.side-link:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

/* ── Support card ──
   A quiet strip, not a banner: neutral surface, one line of text, small button
   that stays beside the text on phones instead of stretching across a new row. */
.support-card {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  margin-bottom: var(--sp-4);
  padding: var(--sp-2) var(--sp-3);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  background: var(--surface);
}
.support-card-icon {
  flex-shrink: 0;
  color: var(--accent);
}
.support-card-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  font-size: var(--fs-xs);
  line-height: 1.35;
  color: var(--text-muted);
}
.support-card-text strong {
  font-size: var(--fs-sm);
  color: var(--text);
}
.support-card-text span {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.support-card :deep(.btn) {
  flex-shrink: 0;
}

/* ── Panel content ── */
.category-group {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
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

.settings-panel :deep(.card-title svg) {
  color: var(--accent);
}
.settings-panel :deep(.card-body) {
  padding: var(--sp-2) var(--sp-3);
}
.settings-panel :deep(.field) {
  padding: var(--sp-2) 0;
  border-bottom: 1px solid var(--border-light);
}
.settings-panel :deep(.field:last-child) {
  border-bottom: none;
}

@media (max-width: 600px) {
  .settings-panel :deep(.field-info) {
    display: flex;
    align-items: center;
    gap: var(--sp-1);
    width: 100%;
  }
  .settings-panel :deep(.field-label) {
    flex: 1;
  }
}

.version-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--sp-2);
  margin-top: var(--sp-5);
}
.version {
  font-size: var(--fs-sm);
  color: var(--text-muted);
}
.changelog-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--fs-xs);
  padding: 2px var(--sp-2);
  border-radius: var(--radius);
  border: 1px solid var(--border-light);
  background: none;
  color: var(--text-muted);
  text-decoration: none;
  cursor: pointer;
  transition:
    border-color var(--dur-fast) var(--ease),
    color var(--dur-fast) var(--ease);
}
.changelog-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}
.tutorials-icon {
  flex-shrink: 0;
}

/* ── Mobile hamburger nav (hidden on desktop) ── */
.mobile-nav {
  display: none;
}
.mobile-nav-trigger {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  width: 100%;
  padding: var(--sp-3) var(--sp-4);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--text);
  font-size: var(--fs-base);
  font-weight: 600;
  cursor: pointer;
}
.mobile-nav-burger {
  flex-shrink: 0;
  color: var(--text-muted);
}
.mobile-nav-label {
  flex: 1;
  text-align: start;
}
.mobile-nav-chev {
  flex-shrink: 0;
  color: var(--text-muted);
  transition: transform var(--dur-fast) var(--ease);
}
.mobile-nav-trigger[data-state="open"] .mobile-nav-chev {
  transform: rotate(180deg);
}
.mobile-nav-trigger:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

@media (max-width: 860px) {
  .settings-sidebar {
    display: none;
  }
  .mobile-nav {
    display: block;
    margin-bottom: var(--sp-4);
    position: sticky;
    top: var(--sticky-top);
    z-index: var(--z-sticky);
  }
  .settings-layout {
    flex-direction: column;
    gap: 0;
  }
  .settings-panel {
    width: 100%;
  }
}
@media (max-width: 600px) {
  .mobile-nav {
    top: calc(var(--safe-top) + 10px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .mobile-nav-chev {
    transition: none;
  }
}
</style>
