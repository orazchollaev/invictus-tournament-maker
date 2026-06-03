<script setup lang="ts">
import AppHeader from "@/components/AppHeader.vue"
import AppBottomNav from "@/components/AppBottomNav.vue"
import AppDialog from "@/components/AppDialog.vue"
import { useSettingsStore } from "@/modules/settings/store"

useSettingsStore()
</script>

<template>
  <div>
    <AppHeader />
    <main class="app-main">
      <RouterView v-slot="{ Component }">
        <Transition name="page" mode="out-in">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </main>
    <AppDialog />
    <AppBottomNav />
  </div>
</template>

<style>
@media (max-width: 640px) {
  .app-main {
    padding-bottom: calc(56px + env(safe-area-inset-bottom));
  }
}
</style>
