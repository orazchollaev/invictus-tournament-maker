<script setup lang="ts">
import { Trophy, Users, History, Settings } from "@lucide/vue"
</script>

<template>
  <nav class="bottom-nav">
    <RouterLink to="/tournaments" class="bottom-nav-item">
      <Trophy :size="22" />
      <span>Tournaments</span>
    </RouterLink>
    <RouterLink to="/teams" class="bottom-nav-item">
      <Users :size="22" />
      <span>Teams</span>
    </RouterLink>
    <RouterLink to="/history" class="bottom-nav-item">
      <History :size="22" />
      <span>History</span>
    </RouterLink>
    <RouterLink to="/settings" class="bottom-nav-item">
      <Settings :size="22" />
      <span>Settings</span>
    </RouterLink>
  </nav>
</template>

<style scoped>
.bottom-nav {
  display: none;
}

@media (max-width: 640px) {
  .bottom-nav {
    display: flex;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 100;
    background: var(--surface);
    border-top: 1px solid var(--border-light);
    height: 56px;
    padding-bottom: env(safe-area-inset-bottom);
  }

  .bottom-nav-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    color: var(--text-muted);
    text-decoration: none;
    font-size: 10px;
    font-weight: 500;
    transition: color 0.12s;
    min-width: 0;
  }

  .bottom-nav-item:hover {
    color: var(--text);
    text-decoration: none;
  }

  .bottom-nav-item.router-link-active {
    color: var(--accent);
  }
}
</style>
