<script setup lang="ts">
import { BookOpen, Heart } from "@lucide/vue"
import { useNavActive } from "@/composables/useNavActive"
import { openSupport } from "@/composables/useSupport"
import { useI18n } from "vue-i18n"

const { t } = useI18n()
const { isNavActive } = useNavActive()
</script>

<template>
  <header class="site-header">
    <div class="header-inner">
      <RouterLink to="/" class="brand">
        <span class="brand-name">Invictus</span>
      </RouterLink>

      <div class="header-end">
        <button
          type="button"
          class="header-btn support-btn"
          :title="t('settings.support.button')"
          :aria-label="t('settings.support.button')"
          @click="openSupport('header')"
        >
          <Heart :size="20" />
        </button>
        <RouterLink
          to="/guide"
          class="header-btn"
          :class="{ 'router-link-active': isNavActive('/guide') }"
          :title="t('guide.title')"
          :aria-label="t('guide.title')"
        >
          <BookOpen :size="20" />
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
  z-index: var(--z-header);
  padding-top: var(--safe-top);
  padding-inline: var(--safe-left) var(--safe-right);
}

.header-inner {
  max-width: 760px;
  margin: 0 auto;
  padding: 0 var(--sp-4);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-2);
  height: var(--header-height);
}

.brand {
  display: flex;
  align-items: center;
  min-width: 0;
  color: var(--text);
  text-decoration: none;
}

.brand-name {
  font-size: var(--fs-lg);
  font-weight: 800;
  letter-spacing: -0.02em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.header-end {
  display: flex;
  align-items: center;
  gap: var(--sp-1);
  flex-shrink: 0;
}

.header-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--tap-min);
  height: var(--tap-min);
  padding: 0;
  border: none;
  border-radius: var(--radius-pill);
  background: none;
  color: var(--text-muted);
  text-decoration: none;
  cursor: pointer;
  transition:
    background var(--dur-fast) var(--ease),
    color var(--dur-fast) var(--ease);
}

.header-btn:hover {
  background: var(--bg-hover);
  color: var(--text);
  text-decoration: none;
}

.header-btn:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

.header-btn:active {
  opacity: 0.55;
}

.support-btn {
  color: var(--accent);
}

/* Phones navigate with the bottom bar alone. */
@media (max-width: 600px) {
  .site-header {
    display: none;
  }
}

.header-btn.router-link-active {
  background: var(--accent-subtle);
  color: var(--accent);
}
</style>
