<script setup lang="ts">
import AppHeader from "@/components/AppHeader.vue"
import { useSettingsStore } from "@/modules/settings/store"

useSettingsStore()
</script>

<template>
  <div>
    <AppHeader />
    <main>
      <RouterView v-slot="{ Component }">
        <Transition name="page" mode="out-in">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </main>
  </div>
</template>
