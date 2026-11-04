import { defineStore } from "pinia"
import { ref } from "vue"
import * as api from "./services/marketApi"
import * as authService from "./services/authService"
import type { MarketListing, MarketSort, MarketUser } from "./types"

/**
 * Session state for the market: who is signed in and the page of listings on
 * screen. Nothing here is worth keeping across launches — the data lives in
 * Firestore — so the persistence plugin is opted out.
 */
export const useMarketStore = defineStore(
  "market",
  () => {
    const available = authService.isMarketAvailable
    const user = ref<MarketUser | null>(null)
    const listings = ref<MarketListing[]>([])
    const sort = ref<MarketSort>("new")
    const cursor = ref<string | null>(null)
    const loading = ref(false)
    const failed = ref(false)
    let initializing: Promise<void> | null = null

    /**
     * Subscribes before reading, so a sign-in restored in between is not missed,
     * and runs once however many screens ask for it at the same time.
     */
    function init() {
      if (!available) return Promise.resolve()
      initializing ??= (async () => {
        try {
          await authService.onAuthChange((u) => (user.value = u))
          user.value = await authService.getCurrentUser()
        } catch {
          // Auth unavailable: the market stays browsable, publishing is just disabled.
          initializing = null
        }
      })()
      return initializing
    }

    async function signIn() {
      user.value = await authService.signInWithGoogle()
      return user.value
    }

    async function signOut() {
      await authService.signOut()
      user.value = null
    }

    /** Loads the first page (`reset`) or the next one. Safe to call while loading. */
    async function load(reset = false) {
      if (!available || loading.value) return
      if (!reset && listings.value.length && !cursor.value) return
      loading.value = true
      failed.value = false
      try {
        const page = await api.listDatasets(sort.value, reset ? null : cursor.value)
        listings.value = reset ? page.items : [...listings.value, ...page.items]
        cursor.value = page.cursor
      } catch {
        failed.value = true
      } finally {
        loading.value = false
      }
    }

    async function setSort(next: MarketSort) {
      if (next === sort.value) return
      sort.value = next
      await load(true)
    }

    function removeListing(id: string) {
      listings.value = listings.value.filter((l) => l.id !== id)
    }

    return {
      available,
      user,
      listings,
      sort,
      cursor,
      loading,
      failed,
      init,
      signIn,
      signOut,
      load,
      setSort,
      removeListing,
    }
  },
  { persistedState: { persist: false } }
)
