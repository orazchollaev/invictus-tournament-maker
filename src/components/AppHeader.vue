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
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 10;
}
.header-inner {
  max-width: 960px;
  margin: 0 auto;
  padding: 0 16px;
  display: flex;
  align-items: center;
  gap: 24px;
  height: 44px;
}
.logo {
  display: flex;
  align-items: center;
  font-weight: 700;
  font-size: 15px;
}
.logo-img {
  margin-right: 8px;
  width: 24px;
  height: 24px;
  color: var(--accent);
}
nav {
  display: flex;
  gap: 0;
}
nav a {
  display: block;
  padding: 0 14px;
  line-height: 44px;
  color: var(--text);
  font-size: 14px;
  border-bottom: 3px solid transparent;
  text-decoration: none;
}
nav a:hover {
  border-bottom-color: var(--border);
}
nav a.router-link-active {
  border-bottom-color: var(--accent);
  color: var(--accent);
}

.nav-right {
  margin-left: auto;
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
    line-height: 44px;
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
