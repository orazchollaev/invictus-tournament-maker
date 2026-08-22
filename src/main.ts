import { createApp } from "vue"
import { createPinia } from "pinia"
import { createPersistedStatePlugin } from "pinia-plugin-persistedstate-2"

import router from "./router"
import App from "./App.vue"
import i18n, { isRtl, loadLocale } from "./i18n"
import type { Locale } from "./i18n"
import { initPush } from "./composables/usePush"
import { initAnalytics, logScreenView } from "./composables/useAnalytics"
import { idbStorage } from "./lib/idbStorage"
import { useTournamentStore } from "./modules/tournament/store"

import "./assets/style/index.css"

const pinia = createPinia()
const persistedStatePlugin = createPersistedStatePlugin({
  storage: idbStorage,
})
pinia.use(persistedStatePlugin)

async function bootstrap() {
  try {
    const raw = await idbStorage.getItem("settings")
    if (raw) {
      const saved = JSON.parse(raw)
      const locale = saved?.locale as Locale
      if (locale && locale !== "en") {
        await loadLocale(locale)
        i18n.global.locale.value = locale
        document.documentElement.setAttribute("lang", locale)
        document.documentElement.setAttribute("dir", isRtl(locale) ? "rtl" : "ltr")
      }
    }
  } catch {}

  const app = createApp(App)
  app.use(pinia)
  app.use(router)
  app.use(i18n)

  // Matches played before v2.2.0 get stamped as legacy so the event engine
  // never invents scorers for them. Has to wait for the persisted state to
  // hydrate, or there would be nothing to stamp.
  const tournamentStore = useTournamentStore()
  try {
    await tournamentStore.$persistedState.isReady()
  } catch {}
  tournamentStore.migrateLegacyMatchStats()

  app.mount("#app")

  void initPush()
  void initAnalytics()
  router.afterEach((to) => {
    void logScreenView(to.path)
  })
}

bootstrap()
