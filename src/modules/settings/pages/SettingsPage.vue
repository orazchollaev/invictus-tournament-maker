<script setup lang="ts">
import { useRouter } from "vue-router"
import { ref, onMounted, onUnmounted } from "vue"
import { version } from "../../../../package.json"
import { ArrowLeft } from "@lucide/vue"
import { useI18n } from "vue-i18n"
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

const activeCategory = ref<Category>("general")

function scrollToCategory(id: Category) {
  activeCategory.value = id
  document.getElementById(`cat-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" })
}

let observer: IntersectionObserver | null = null

onMounted(() => {
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          activeCategory.value = entry.target.id.replace("cat-", "") as Category
        }
      }
    },
    { rootMargin: "-20% 0px -70% 0px" }
  )
  CATEGORIES.forEach((id) => {
    const el = document.getElementById(`cat-${id}`)
    if (el) observer!.observe(el)
  })
})

onUnmounted(() => observer?.disconnect())
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

    <nav class="settings-nav">
      <button
        v-for="cat in CATEGORIES"
        :key="cat"
        class="nav-pill"
        :class="{ 'nav-pill--active': activeCategory === cat }"
        @click="scrollToCategory(cat)"
      >
        {{ t(`settings.nav.${cat}`) }}
      </button>
    </nav>

    <div id="cat-general" class="category-group">
      <div class="category-label">{{ t("settings.nav.general") }}</div>
      <SettingsSectionLanguage />
      <SettingsSectionAppearance />
    </div>

    <div id="cat-display" class="category-group">
      <div class="category-label">{{ t("settings.nav.display") }}</div>
      <SettingsSectionDisplay />
      <SettingsSectionGraphics />
    </div>

    <div id="cat-tournament" class="category-group">
      <div class="category-label">{{ t("settings.nav.tournament") }}</div>
      <SettingsSectionTableRules />
      <SettingsSectionMatchDefaults />
      <SettingsSectionNewTournament />
    </div>

    <div id="cat-simulation" class="category-group">
      <div class="category-label">{{ t("settings.nav.simulation") }}</div>
      <SettingsSectionSimulation />
    </div>

    <div id="cat-data" class="category-group">
      <div class="category-label">{{ t("settings.nav.data") }}</div>
      <SettingsSectionSampleData />
      <SettingsSectionDataManagement />
    </div>

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
</template>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
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

.settings-nav {
  display: flex;
  overflow-x: auto;
  scrollbar-width: none;
  margin-bottom: 20px;
  position: sticky;
  top: calc(52px + env(safe-area-inset-top));
  z-index: 9;
  background: var(--bg);
  border-bottom: 1px solid var(--border-light);
}
@media (max-width: 640px) {
  .settings-nav {
    top: calc(48px + env(safe-area-inset-top));
  }
}
.settings-nav::-webkit-scrollbar {
  display: none;
}
.nav-pill {
  flex-shrink: 0;
  padding: 8px 14px;
  border-radius: 0;
  border: none;
  border-bottom: 2px solid transparent;
  background: none;
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition:
    color 0.15s,
    border-color 0.15s;
  white-space: nowrap;
  margin-bottom: -1px;
}
.nav-pill:hover {
  color: var(--text);
}
.nav-pill--active {
  border-bottom-color: var(--accent);
  color: var(--accent);
  font-weight: 600;
}

.category-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 28px;
  scroll-margin-top: calc(104px + env(safe-area-inset-top));
}
.category-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  padding-bottom: 4px;
  border-bottom: 1px solid var(--border-light);
}

.version-row {
  display: flex;
  align-items: center;
  gap: 8.1px;
  margin-top: 8px;
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
</style>
