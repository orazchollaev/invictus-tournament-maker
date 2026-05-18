<script setup lang="ts">
import AppHeader from "@/components/AppHeader.vue"
import { useSettingsStore } from "@/modules/settings/store"

useSettingsStore()
</script>

<template>
  <div>
    <AppHeader />
    <main>
      <RouterView />
    </main>
  </div>
</template>
