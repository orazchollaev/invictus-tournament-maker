<script setup lang="ts">
import { Settings, Star, Trophy, History, RefreshCw, FolderGit2 } from "@lucide/vue"
import { useSettingsStore } from "@/modules/settings/store"
import { usePwaUpdate } from "@/composables/usePwaUpdate"
import AppLogo from "./AppLogo.vue"
import { useI18n } from "vue-i18n"

const { t } = useI18n()
const GITHUB_URL = "https://github.com/orazchollaev/invictus-tournament-maker"
const settings = useSettingsStore()
const { needRefresh, applyUpdate } = usePwaUpdate()
</script>

<template>
  <header class="site-header">
    <div class="header-inner">
      <RouterLink to="/" class="brand">
        <AppLogo class="brand-logo" />
        <span class="brand-name">Invictus</span>
      </RouterLink>

      <Transition name="wc-badge">
        <div v-if="settings.theme === 'worldcup2026'" class="wc-badge">
          <Trophy :size="12" />
          <span>FIFA World Cup 2026™</span>
          <span class="wc-hosts">USA · CAN · MEX</span>
        </div>
      </Transition>

      <nav class="main-nav">
        <RouterLink to="/tournaments">{{ t("nav.tournaments") }}</RouterLink>
        <RouterLink to="/teams">{{ t("nav.teams") }}</RouterLink>
        <RouterLink to="/history">
          <History :size="13" class="nav-icon" />
          {{ t("nav.history") }}
        </RouterLink>
      </nav>

      <div class="header-end">
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
        <RouterLink to="/settings" class="settings-btn" :title="t('nav.settings')">
          <Settings :size="16" />
        </RouterLink>
      </div>
    </div>
  </header>
</template>

<style scoped>
.site-header {
  background: var(--surface);
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
  font-size: 15px;
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.01em;
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
  font-weight: 600;
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
  padding: 5px 10px;
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

/* World Cup 2026 badge */
.wc-badge {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: var(--radius);
  border: 1px solid color-mix(in srgb, #c9a227 40%, transparent);
  background: color-mix(in srgb, #c9a227 8%, transparent);
  color: #c9a227;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  white-space: nowrap;
}
.wc-hosts {
  font-size: 10px;
  opacity: 0.7;
  font-weight: 400;
  letter-spacing: 0.06em;
}

.wc-badge-enter-active,
.wc-badge-leave-active {
  transition:
    opacity 0.25s,
    transform 0.25s;
}
.wc-badge-enter-from,
.wc-badge-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@media (max-width: 640px) {
  .header-inner {
    padding: 0 12px;
    height: 48px;
  }
  .brand {
    left: 12px;
  }
  .header-end {
    right: 12px;
  }
  .brand-logo {
    height: 44px;
    width: 44px;
  }
  .main-nav {
    display: none;
  }
  .github-star-btn {
    display: none;
  }
  .settings-btn {
    display: none;
  }
  .wc-badge {
    display: none;
  }
}
</style>
