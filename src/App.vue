<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue"
import { useRouter } from "vue-router"
import { App } from "@capacitor/app"
import { AppHeader, AppMobileBottomNav, ErrorBoundary } from "@/components/layout"
import { AppDialog } from "@/components/ui"
import { MusicController } from "@/modules/music/components"
import { useSettingsStore } from "@/modules/settings/store"
import { useStatusBar } from "@/composables/useStatusBar"
import { logEvent } from "@/composables/useAnalytics"

const settings = useSettingsStore()
const { setTheme } = useStatusBar()
watch(() => settings.theme, setTheme, { immediate: true })

const router = useRouter()
const ROOT_PATHS = ["/tournaments", "/teams", "/history", "/settings"]

const DETAIL_PAGE_PATTERNS = [
  /^\/tournaments\/[^/]+$/,
  /^\/tournaments\/[^/]+\/settings$/,
  /^\/teams\/[^/]+$/,
  /^\/players\/[^/]+$/,
  /^\/history\/[^/]+$/,
]
const hideBottomNav = computed(() =>
  DETAIL_PAGE_PATTERNS.some((pattern) => pattern.test(router.currentRoute.value.path))
)

const transitionName = ref("page")

let backButtonListener: (() => void) | null = null
let appStateListener: (() => void) | null = null

// A foreground period is what "a session" means for this event: it starts
// when the app comes to front (cold start, or resumed from background) and
// ends when it goes back — a launch nobody returns to reads the same as one
// that was closed right away, since `visibilitychange`/`beforeunload` are not
// reliable on Android once the OS can kill the process outright.
let sessionStartedAt = Date.now()

onMounted(async () => {
  void logEvent("app_open")

  const backHandle = await App.addListener("backButton", () => {
    const currentPath = router.currentRoute.value.path
    if (ROOT_PATHS.includes(currentPath)) {
      App.exitApp()
    } else {
      router.back()
    }
  })
  backButtonListener = () => backHandle.remove()

  const stateHandle = await App.addListener("appStateChange", ({ isActive }) => {
    if (isActive) {
      sessionStartedAt = Date.now()
      return
    }
    const minutes = Math.round(((Date.now() - sessionStartedAt) / 60000) * 10) / 10
    void logEvent("session_end", { minutes })
  })
  appStateListener = () => stateHandle.remove()
})

onUnmounted(() => {
  backButtonListener?.()
  appStateListener?.()
})
</script>

<template>
  <div style="height: 100vh">
    <AppHeader />
    <main class="app-main" :class="{ 'app-main--no-nav': hideBottomNav }">
      <ErrorBoundary>
        <RouterView v-slot="{ Component }">
          <Transition :name="transitionName" mode="out-in">
            <component :is="Component" />
          </Transition>
        </RouterView>
      </ErrorBoundary>
    </main>
    <AppDialog />
    <MusicController />
    <Transition name="mobile-nav">
      <AppMobileBottomNav v-if="!hideBottomNav" />
    </Transition>
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

  .app-main--no-nav::after {
    height: var(--safe-bottom);
  }
}

.mobile-nav-enter-active,
.mobile-nav-leave-active {
  transition:
    transform var(--dur) var(--ease),
    opacity var(--dur) var(--ease);
}

.mobile-nav-enter-from,
.mobile-nav-leave-to {
  transform: translateY(120%);
  opacity: 0;
}
</style>
