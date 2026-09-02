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

/**
 * The persistence plugin fires on every state mutation and, by default,
 * `JSON.stringify`s the whole store synchronously right then — on the same
 * thread that just needs to close the score modal and repaint the table.
 * Now that a played match carries a full report (lineups, events, ratings),
 * that stringify is heavy enough to be felt as lag on every single save.
 *
 * This defers the actual stringify to idle time, after the browser has had
 * a chance to paint the result the user is waiting on. It reads `state` at
 * the moment it actually runs, not when scheduled, so a burst of mutations
 * from one save collapses into a single stringify of the latest values
 * instead of one per mutation.
 */
const idleScheduled = new WeakMap<object, Promise<string>>()
function idleSerialize(state: object): Promise<string> {
  const pending = idleScheduled.get(state)
  if (pending) return pending

  const promise = new Promise<string>((resolve) => {
    const run = () => {
      idleScheduled.delete(state)
      resolve(JSON.stringify(state))
    }
    if (typeof requestIdleCallback === "function") requestIdleCallback(run, { timeout: 500 })
    else setTimeout(run, 0)
  })
  idleScheduled.set(state, promise)
  return promise
}

const pinia = createPinia()
const persistedStatePlugin = createPersistedStatePlugin({
  storage: idbStorage,
  serialize: idleSerialize,
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
  // never invents scorers for them. Has to wait for hydration, or there
  // would be nothing to stamp.
  //
  // The tournament store opts out of the plugin above entirely and persists
  // everything (`tournaments`, `active`, `statsMigrated`) by hand — see
  // modules/tournament/store/index.ts and services/persistence.ts. Pinia's
  // own `$subscribe`, which the plugin relies on, deep-watches the whole
  // store state regardless of `includePaths`, which made every match save
  // pay for a full traversal of every loaded tournament.
  const tournamentStore = useTournamentStore()
  try {
    await tournamentStore.hydrate()
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
