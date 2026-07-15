<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue"
import {
  Settings,
  Star,
  Trophy,
  History,
  RefreshCw,
  FolderGit2,
  Users,
  BookOpen,
  WifiOff,
} from "@lucide/vue"
import { usePwaUpdate } from "@/composables/usePwaUpdate"
import { useNavActive } from "@/composables/useNavActive"
import AppLogo from "./AppLogo.vue"
import { useI18n } from "vue-i18n"

const { t } = useI18n()
const GITHUB_URL = "https://github.com/orazchollaev/invictus-tournament-maker"
const { needRefresh, applyUpdate } = usePwaUpdate()
const { isNavActive } = useNavActive()

const isOnline = ref(navigator.onLine)
function handleOnline() {
  isOnline.value = true
}
function handleOffline() {
  isOnline.value = false
}
onMounted(() => {
  window.addEventListener("online", handleOnline)
  window.addEventListener("offline", handleOffline)
})
onUnmounted(() => {
  window.removeEventListener("online", handleOnline)
  window.removeEventListener("offline", handleOffline)
})
</script>

<template>
  <header class="site-header">
    <div class="header-inner">
      <RouterLink to="/" class="brand">
        <AppLogo class="brand-logo" />
        <span class="brand-name">Invictus</span>
      </RouterLink>

      <nav class="main-nav">
        <RouterLink
          to="/tournaments"
          :class="{ 'router-link-active': isNavActive('/tournaments') }"
        >
          <Trophy :size="16" />
          {{ t("nav.tournaments") }}
        </RouterLink>
        <RouterLink to="/teams" :class="{ 'router-link-active': isNavActive('/teams') }">
          <Users :size="16" />
          {{ t("nav.teams") }}
        </RouterLink>
        <RouterLink to="/history" :class="{ 'router-link-active': isNavActive('/history') }">
          <History :size="16" class="nav-icon" />
          {{ t("nav.history") }}
        </RouterLink>
      </nav>

      <div class="header-end">
        <Transition name="update-btn">
          <div v-if="!isOnline" class="offline-chip" :title="t('common.offline')">
            <WifiOff :size="12" />
            <span>{{ t("common.offline") }}</span>
          </div>
        </Transition>
        <Transition name="update-btn">
          <button
            v-if="needRefresh"
            class="update-btn"
            :title="t('common.newVersionAvailable')"
            @click="applyUpdate"
          >
            <RefreshCw :size="13" />
            <span>{{ t("common.update") }}</span>
          </button>
        </Transition>

        <a
          :href="GITHUB_URL"
          target="_blank"
          rel="noopener noreferrer"
          class="github-star-btn"
          :title="t('common.starOnGithub')"
        >
          <FolderGit2 :size="15" />
          <span class="github-star-label">{{ t("common.star") }}</span>
          <Star :size="12" class="github-star-icon" />
        </a>
        <RouterLink
          to="/guide"
          class="settings-btn guide-btn"
          :class="{ 'router-link-active': isNavActive('/guide') }"
          :title="t('guide.title')"
        >
          <BookOpen :size="16" />
        </RouterLink>
        <RouterLink
          to="/settings"
          class="settings-btn"
          :class="{ 'router-link-active': isNavActive('/settings') }"
          :title="t('nav.settings')"
        >
          <Settings :size="16" />
        </RouterLink>
      </div>
    </div>
  </header>
</template>

<style scoped>
.site-header {
  background: color-mix(in srgb, var(--surface) 88%, transparent);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border-light);
  position: sticky;
  top: 0;
  z-index: 10;
  padding-top: env(safe-area-inset-top);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}

.header-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  height: 52px;
  justify-content: center;
  position: relative;
}

/* Brand */
.brand {
  display: flex;
  align-items: center;
  text-decoration: none;
  position: absolute;
  left: 20px;
}
.brand-logo {
  height: 50px;
  width: 50px;
  flex-shrink: 0;
  color: var(--accent);
}
.brand-name {
  font-size: 18px;
  font-weight: 800;
  font-family: var(--font);
  background: linear-gradient(-135deg, var(--text) 20%, var(--accent) 50%, var(--text) 80%);
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: 0.02em;
  filter: drop-shadow(0px 2px 4px var(--accent-subtle));
  transition:
    transform 0.3s ease,
    filter 0.3s ease;
  animation: shine 5s linear infinite;
}

.brand:hover .brand-name {
  filter: drop-shadow(0px 4px 8px color-mix(in srgb, var(--accent) 30%, transparent));
}

@keyframes shine {
  to {
    background-position: 200% center;
  }
}

/* Main nav */
.main-nav {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-left: 120px;
  margin-right: 120px;
}
.main-nav a {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-muted);
  text-decoration: none;
  padding: 5px 12px;
  border-radius: var(--radius);
  transition:
    background 0.12s,
    color 0.12s;
}
.nav-icon {
  flex-shrink: 0;
}
.main-nav a:hover {
  background: var(--bg);
  color: var(--text);
  text-decoration: none;
}
.main-nav a.router-link-active {
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  color: var(--accent);
}

/* Right side */
.header-end {
  position: absolute;
  right: 20px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.update-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: var(--radius);
  border: 1px solid color-mix(in srgb, var(--accent) 50%, transparent);
  background: color-mix(in srgb, var(--accent) 10%, transparent);
  color: var(--accent);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition:
    background 0.12s,
    border-color 0.12s;
}
.update-btn:hover {
  background: color-mix(in srgb, var(--accent) 18%, transparent);
  border-color: var(--accent);
}

.offline-chip {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: var(--radius);
  border: 1px solid color-mix(in srgb, #ef4444 50%, transparent);
  background: color-mix(in srgb, #ef4444 10%, transparent);
  color: #ef4444;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  pointer-events: none;
}

.update-btn-enter-active,
.update-btn-leave-active {
  transition:
    opacity 0.2s,
    transform 0.2s;
}
.update-btn-enter-from,
.update-btn-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.github-star-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 8px 10px;
  border-radius: var(--radius);
  border: 1px solid var(--border-light);
  background: var(--surface);
  color: var(--text-muted);
  text-decoration: none;
  font-size: 12px;
  font-weight: 500;
  transition:
    background 0.12s,
    color 0.12s,
    border-color 0.12s;
  white-space: nowrap;
}
.github-star-btn:hover {
  background: var(--bg);
  color: var(--text);
  border-color: var(--border);
  text-decoration: none;
}
.github-star-btn:hover .github-star-icon {
  color: #f0a500;
}
.github-star-label {
  line-height: 1;
}
.github-star-icon {
  transition: color 0.12s;
}

.settings-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius);
  color: var(--text-muted);
  text-decoration: none;
  transition:
    background 0.12s,
    color 0.12s;
  padding: 0;
}
.settings-btn:hover {
  background: var(--bg);
  color: var(--text);
  text-decoration: none;
}
.settings-btn.router-link-active {
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  color: var(--accent);
}


@media (max-width: 640px) {
  .site-header {
    display: none;
  }
}
</style>
