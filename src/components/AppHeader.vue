<script setup lang="ts">
function clearData() {
  const isConfirm = confirm("Are you sure you want to clear all data? This cannot be undone.")

  if (isConfirm) {
    localStorage.removeItem("teams")
    localStorage.removeItem("tournament")
    location.reload()
  }
}
</script>

<template>
  <header class="site-header">
    <div class="header-inner">
      <span class="logo">⚽ Tournament Sim</span>

      <nav>
        <RouterLink to="/teams">Teams</RouterLink>
        <RouterLink to="/tournaments">Tournaments</RouterLink>
      </nav>

      <div class="clear-data">
        <button class="danger" @click="clearData">Clear all data</button>
      </div>
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
  font-weight: 700;
  font-size: 15px;
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
  background: var(--bg);
}
nav a.router-link-active {
  border-bottom-color: var(--accent);
  color: var(--accent);
}

.clear-data {
  margin-left: auto;
}

.clear-data button {
  font-size: 11px;
  padding: 1px 6px;
}
</style>
