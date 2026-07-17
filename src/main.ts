import { createApp } from "vue"
import { createPinia } from "pinia"
import { createPersistedStatePlugin } from "pinia-plugin-persistedstate-2"

import router from "./router"
import App from "./App.vue"
import i18n, { loadLocale } from "./i18n"
import type { Locale } from "./i18n"
import { initPush } from "./composables/usePush"

import "./assets/style/index.css"

const pinia = createPinia()
const persistedStatePlugin = createPersistedStatePlugin({
  storage: window.localStorage,
})
pinia.use(persistedStatePlugin)

async function bootstrap() {
  try {
    const raw = localStorage.getItem("settings")
    if (raw) {
      const saved = JSON.parse(raw)
      const locale = saved?.locale as Locale
      if (locale && locale !== "en") {
        await loadLocale(locale)
        i18n.global.locale.value = locale
      }
    }
  } catch {}

  const app = createApp(App)
  app.use(pinia)
  app.use(router)
  app.use(i18n)
  app.mount("#app")

  void initPush()
}

bootstrap()
