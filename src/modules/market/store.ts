import { defineStore } from "pinia"
import { ref } from "vue"
import * as api from "./services/marketApi"
import * as authService from "./services/authService"
import type { MarketCreator, MarketListing, MarketSort, MarketUser, WeeklyTally } from "./types"
import { tallyWins, topOfWeek, weeksToSettle } from "./utils/champions"
import { weekOf } from "./utils/week"

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
     * False until the saved sign-in has been looked up. On the web that is a
     * network round trip, and until it ends "no user" means "don't know yet",
     * not "signed out".
     */
    const authChecked = ref(false)

    /**
     * Subscribes before reading, so a sign-in restored in between is not missed,
     * and runs once however many screens ask for it at the same time.
     */
    function init() {
      if (!available) {
        authChecked.value = true
        return Promise.resolve()
      }
      initializing ??= (async () => {
        try {
          await authService.onAuthChange((u) => (user.value = u))
          user.value = await authService.getCurrentUser()
        } catch {
          // Auth unavailable: the market stays browsable, publishing is just disabled.
          initializing = null
        } finally {
          authChecked.value = true
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

    // ── Creators ────────────────────────────────────────────────────
    const creators = ref<MarketCreator[]>([])
    const creatorsLoading = ref(false)
    const creatorsFailed = ref(false)
    /** Last finished week's winner: the one wearing the badge right now. */
    const champion = ref<WeeklyTally | null>(null)
    /** Weeks won, by uid. */
    const wins = ref<Map<string, number>>(new Map())
    let championsLoaded: Promise<void> | null = null

    /**
     * Reads the settled winners and settles any finished week that has none
     * yet — the app has no server of its own, so the first device to look
     * after a week ends writes its result. Once per session.
     */
    function loadChampions() {
      if (!available) return Promise.resolve()
      championsLoaded ??= (async () => {
        try {
          const winners = await api.listWinners()
          const current = weekOf(Date.now())
          const weeks = weeksToSettle(
            current,
            winners.map((w) => w.week)
          )
          const tallies = await Promise.all(weeks.map((w) => api.listWeek(w)))
          weeks.forEach((week, i) => {
            const recorded = winners.find((w) => w.week === week) ?? null
            const top = topOfWeek(tallies[i], recorded)
            if (!top || top === recorded) return
            const at = winners.indexOf(recorded as WeeklyTally)
            if (at >= 0) winners.splice(at, 1, top)
            else winners.push(top)
            if (user.value) void api.recordWinner(top)
          })
          champion.value = winners.find((w) => w.week === current - 1) ?? null
          wins.value = tallyWins(winners)
        } catch {
          // No badge this session; nothing else depends on it.
          championsLoaded = null
        }
      })()
      return championsLoaded
    }

    async function loadCreators() {
      if (!available || creatorsLoading.value) return
      creatorsLoading.value = true
      creatorsFailed.value = false
      try {
        const [list] = await Promise.all([api.listCreators(), loadChampions()])
        creators.value = list
      } catch {
        creatorsFailed.value = true
      } finally {
        creatorsLoading.value = false
      }
    }

    return {
      available,
      user,
      authChecked,
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
      creators,
      creatorsLoading,
      creatorsFailed,
      champion,
      wins,
      loadChampions,
      loadCreators,
    }
  },
  { persistedState: { persist: false } }
)
