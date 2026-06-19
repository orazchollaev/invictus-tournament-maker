<script setup lang="ts">
import { onMounted, onUnmounted } from "vue"
import { useRouter } from "vue-router"
import { App } from "@capacitor/app"
import AppHeader from "@/components/AppHeader.vue"
import AppBottomNav from "@/components/AppBottomNav.vue"
import AppDialog from "@/components/AppDialog.vue"
import ErrorBoundary from "@/components/ErrorBoundary.vue"
import { useSettingsStore } from "@/modules/settings/store"

useSettingsStore()

const router = useRouter()
const ROOT_PATHS = ["/tournaments", "/teams", "/history", "/settings"]

let backButtonListener: (() => void) | null = null

onMounted(async () => {
  const handle = await App.addListener("backButton", () => {
    const currentPath = router.currentRoute.value.path
    if (ROOT_PATHS.includes(currentPath)) {
      App.exitApp()
    } else {
      router.back()
    }
  })
  backButtonListener = () => handle.remove()
})

onUnmounted(() => {
  backButtonListener?.()
})
</script>

<template>
  <div>
    <AppHeader />
    <main class="app-main">
      <ErrorBoundary>
        <RouterView v-slot="{ Component }">
          <Transition name="page" mode="out-in">
            <component :is="Component" />
          </Transition>
        </RouterView>
      </ErrorBoundary>
    </main>
    <AppDialog />
    <AppBottomNav />
  </div>
</template>

<style>
@media (max-width: 640px) {
  .app-main {
    padding-bottom: calc(var(--bottom-nav-height) + env(safe-area-inset-bottom));
  }
}
</style>
