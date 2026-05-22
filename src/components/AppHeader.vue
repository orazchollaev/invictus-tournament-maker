<script setup lang="ts">
import AppLogo from "./AppLogo.vue"
</script>

<template>
  <header class="site-header">
    <div class="header-inner">
      <div class="logo">
        <AppLogo class="logo-img" />
        Tournament Sim
      </div>

      <nav>
        <RouterLink to="/teams">Teams</RouterLink>
        <RouterLink to="/tournaments">Tournaments</RouterLink>
      </nav>

      <nav class="nav-right">
        <RouterLink to="/settings">Settings</RouterLink>
      </nav>
    </div>
  </header>
</template>

<style scoped>
.site-header {
  background: var(--surface);
  border-bottom: 1px solid var(--border-light);
  border-top: 3px solid var(--accent);
  position: sticky;
  top: 0;
  z-index: 10;
}
.header-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 16px;
  display: flex;
  align-items: center;
  gap: 24px;
  height: 48px;
}
.logo {
  display: flex;
  align-items: center;
  font-weight: 800;
  font-size: 14px;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: var(--text);
  gap: 0;
}
.logo-img {
  margin-right: 8px;
  width: 22px;
  height: 22px;
  color: var(--accent);
}
nav {
  display: flex;
  gap: 0;
}
nav a {
  display: block;
  padding: 0 14px;
  line-height: 48px;
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 500;
  border-bottom: 3px solid transparent;
  text-decoration: none;
  transition: color 0.12s;
}
nav a:hover {
  color: var(--text);
  text-decoration: none;
}
nav a.router-link-active {
  border-bottom-color: var(--accent);
  color: var(--accent);
}

.nav-right {
  margin-left: auto;
}
.nav-right a {
  font-size: 12px;
  color: var(--text-muted);
}

@media (max-width: 600px) {
  .header-inner {
    flex-wrap: wrap;
    height: auto;
    gap: 0;
    padding: 0 10px;
  }
  .logo {
    order: 1;
    flex: 1;
    line-height: 48px;
  }
  .nav-right {
    order: 2;
    margin-left: 0;
  }
  nav:not(.nav-right) {
    order: 3;
    width: 100%;
    border-top: 1px solid var(--border-light);
  }
  nav a {
    padding: 0 10px;
    line-height: 38px;
    font-size: 13px;
  }
}
</style>
