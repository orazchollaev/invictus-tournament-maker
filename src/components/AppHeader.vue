<script setup lang="ts">
import AppLogoWordmark from "./AppLogoWordmark.vue"
import { Settings } from "lucide-vue-next"
</script>

<template>
  <header class="site-header">
    <div class="header-inner">
      <RouterLink to="/" class="brand">
        <AppLogoWordmark class="brand-wordmark" />
      </RouterLink>

      <nav class="main-nav">
        <RouterLink to="/teams">Teams</RouterLink>
        <RouterLink to="/tournaments">Tournaments</RouterLink>
      </nav>

      <div class="header-end">
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
}
</style>
