<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue"
import { useRouter } from "vue-router"
import { App } from "@capacitor/app"
import AppHeader from "@/components/layout/AppHeader.vue"
import AppMobileBottomNav from "@/components/layout/AppMobileBottomNav.vue"
import AppDialog from "@/components/ui/AppDialog.vue"
import ErrorBoundary from "@/components/layout/ErrorBoundary.vue"
import { useSettingsStore } from "@/modules/settings/store"
import { useStatusBar } from "@/composables/useStatusBar"

const settings = useSettingsStore()
const { setTheme } = useStatusBar()
watch(() => settings.theme, setTheme, { immediate: true })

const router = useRouter()
const ROOT_PATHS = ["/tournaments", "/teams", "/history", "/settings"]

const transitionName = ref("page")

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
  <div style="height: 100%">
    <AppHeader />
    <main class="app-main">
      <ErrorBoundary>
        <RouterView v-slot="{ Component }">
          <Transition :name="transitionName" mode="out-in">
            <component :is="Component" />
          </Transition>
        </RouterView>
      </ErrorBoundary>
    </main>
    <AppDialog />
    <AppMobileBottomNav />
  </div>
</template>

<style>
.app-main {
  height: 100%;
}

.app-main::after {
  content: "";
  display: block;
  height: var(--safe-bottom);
}

@media (max-width: 600px) {
  .app-main::after {
    height: calc(var(--mobile-nav-offset) + var(--sp-4));
  }
}
</style>
