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
const SWIPE_PATHS = ["/tournaments", "/teams", "/history", "/settings", "/guide"]

let touchStartX = 0
let touchStartY = 0
const transitionName = ref("page")

function onTouchStart(e: TouchEvent) {
  touchStartX = e.touches[0].clientX
  touchStartY = e.touches[0].clientY
}

function onTouchEnd(e: TouchEvent) {
  if (window.innerWidth > 640) return
  const dx = e.changedTouches[0].clientX - touchStartX
  const dy = e.changedTouches[0].clientY - touchStartY
  if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.5) return

  const idx = SWIPE_PATHS.indexOf(router.currentRoute.value.path)
  if (idx === -1) return
  if (dx < 0 && idx < SWIPE_PATHS.length - 1) navigateSwipe(SWIPE_PATHS[idx + 1], "slide-left")
  else if (dx > 0 && idx > 0) navigateSwipe(SWIPE_PATHS[idx - 1], "slide-right")
}

function navigateSwipe(path: string, direction: "slide-left" | "slide-right") {
  transitionName.value = direction
  router.push(path).then(() => {
    setTimeout(() => (transitionName.value = "page"), 300)
  })
}

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
    <main class="app-main" @touchstart.passive="onTouchStart" @touchend.passive="onTouchEnd">
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

@media (max-width: 640px) {
  .app-main {
    padding-bottom: calc(64px + var(--sp-4) + env(safe-area-inset-bottom));
  }
}
</style>
