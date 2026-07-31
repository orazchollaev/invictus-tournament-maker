<script setup lang="ts">
import { useI18n } from "vue-i18n"

const view = defineModel<"bracket" | "fixtures">({ required: true })
const { t } = useI18n()
</script>

<template>
  <div class="bracket-mobile-tabs">
    <button
      class="bracket-mobile-tab"
      :class="{ active: view === 'bracket' }"
      @click="view = 'bracket'"
    >
      {{ t("tournament.tabs.bracket") }}
    </button>
    <button
      class="bracket-mobile-tab"
      :class="{ active: view === 'fixtures' }"
      @click="view = 'fixtures'"
    >
      {{ t("tournament.tabs.fixtures") }}
    </button>
  </div>
</template>

<style scoped>
/* Desktop uses the inline view toggle in the panel header instead. */
.bracket-mobile-tabs {
  display: none;
}

@media (max-width: 640px) {
  .bracket-mobile-tabs {
    display: flex;
    position: fixed;
    bottom: env(safe-area-inset-bottom);
    left: 0;
    right: 0;
    z-index: var(--z-bottom-bar);
    background: var(--surface);
    border-top: 1px solid var(--border-light);
    height: 44px;
  }

  .bracket-mobile-tab {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--fs-base);
    font-weight: 500;
    background: transparent;
    border: none;
    border-radius: 0;
    color: var(--text-muted);
    transition:
      color var(--dur-fast) var(--ease),
      background var(--dur-fast) var(--ease);
    border-top: 2px solid transparent;
    margin-top: -1px;
  }

  .bracket-mobile-tab.active {
    color: var(--accent);
    border-top-color: var(--accent);
    background: color-mix(in srgb, var(--accent) 5%, transparent);
  }
}
</style>
