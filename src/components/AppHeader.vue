<script setup lang="ts">
import AppLogoWordmark from "./AppLogoWordmark.vue"
import { Settings, Star, Github, Trophy, History } from "lucide-vue-next"
import { useSettingsStore } from "@/modules/settings/store"

const GITHUB_URL = "https://github.com/orazchollaev/tournament-sim"
const settings = useSettingsStore()
</script>

<template>
  <header class="site-header">
    <div class="header-inner">
      <RouterLink to="/" class="brand">
        <AppLogoWordmark class="brand-wordmark" />
      </RouterLink>

      <Transition name="wc-badge">
        <div v-if="settings.theme === 'worldcup2026'" class="wc-badge">
          <Trophy :size="12" />
          <span>FIFA World Cup 2026™</span>
          <span class="wc-hosts">USA · CAN · MEX</span>
        </div>
      </Transition>

      <nav class="main-nav">
        <RouterLink to="/teams">Teams</RouterLink>
        <RouterLink to="/tournaments">Tournaments</RouterLink>
        <RouterLink to="/history">
          <History :size="13" class="nav-icon" />
          History
        </RouterLink>
      </nav>

      <div class="header-end">
        <a
          :href="GITHUB_URL"
          target="_blank"
          rel="noopener noreferrer"
          class="github-star-btn"
          title="Star on GitHub"
        >
          <Github :size="15" />
          <span class="github-star-label">Star</span>
          <Star :size="12" class="github-star-icon" />
        </a>
        <RouterLink to="/settings" class="settings-btn" title="Settings">
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
}

.header-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  height: 52px;
}

/* Brand */
.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  margin-right: 12px;
}
.brand-wordmark {
  height: 30px;
  width: auto;
  flex-shrink: 0;
}

/* Main nav */
.main-nav {
  display: flex;
  align-items: center;
  gap: 2px;
  flex: 1;
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
  border-radius: 6px;
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
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 6px;
}

.github-star-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: 6px;
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
  border-radius: 6px;
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
  border-radius: 20px;
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

@media (max-width: 600px) {
  .header-inner {
    padding: 0 12px;
    height: 48px;
  }
  .brand-wordmark {
    height: 24px;
  }
  .main-nav a {
    padding: 5px 10px;
    font-size: 12px;
  }
  .github-star-label {
    display: none;
  }
  .github-star-btn {
    padding: 5px 8px;
  }
  .wc-badge {
    display: none;
  }
}
</style>
