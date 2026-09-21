import { createRouter, createWebHashHistory } from "vue-router"

/**
 * Every route below is a dynamic import, so a navigation can fail for a reason
 * that has nothing to do with the route: the chunk it names is no longer on the
 * server. That is the normal state of a tab left open across a deploy — the
 * build it was served is gone, and the first navigation afterwards rejects with
 * a fetch error rather than rendering anything. Vue Router reports it here and
 * then leaves the user on a page whose tap did nothing.
 *
 * Reloading is the whole fix: the next launch fetches the current build's
 * index and its hashed chunks. Guarded by a session flag so a genuinely broken
 * build cannot turn this into a reload loop.
 */
const RELOAD_FLAG = "invictus:chunk-reload"

function isMissingChunk(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return /dynamically imported module|Importing a module script failed|ChunkLoadError|Failed to fetch/i.test(
    message
  )
}

const router = createRouter({
  history: createWebHashHistory(),
  scrollBehavior(_to, _from, savedPosition) {
    return new Promise((resolve) => {
      setTimeout(() => resolve(savedPosition ?? { top: 0, left: 0 }), 250)
    })
  },
  routes: [
    { path: "/", redirect: "/tournaments" },

    { path: "/teams", component: () => import("../modules/teams/pages/TeamsPage.vue") },
    { path: "/teams/:id", component: () => import("../modules/teams/pages/TeamDetailPage.vue") },

    { path: "/players", component: () => import("../modules/players/pages/PlayersPage.vue") },
    {
      path: "/players/:id",
      component: () => import("../modules/players/pages/PlayerDetailPage.vue"),
    },

    {
      path: "/tournaments",
      component: () => import("../modules/tournament/pages/TournamentsPage.vue"),
    },
    {
      path: "/tournaments/new",
      component: () => import("../modules/tournament/pages/CreateTournamentPage.vue"),
    },
    {
      path: "/tournaments/:id",
      component: () => import("../modules/tournament/pages/TournamentDetailPage.vue"),
    },
    {
      path: "/tournaments/:id/settings",
      component: () => import("../modules/tournament/pages/TournamentSettingsPage.vue"),
    },
    {
      path: "/tournaments/:id/simulation",
      component: () => import("../modules/tournament/pages/SimulationResultsPage.vue"),
    },

    { path: "/history", component: () => import("../modules/history/pages/HistoryPage.vue") },
    {
      path: "/history/:name",
      component: () => import("../modules/history/pages/TournamentHistoryPage.vue"),
    },

    { path: "/settings", component: () => import("../modules/settings/pages/SettingsPage.vue") },

    { path: "/guide", component: () => import("../modules/core/pages/GuidePage.vue") },

    { path: "/:pathMatch(.*)*", component: () => import("../modules/core/pages/NotFoundPage.vue") },
  ],
})

router.onError((error, to) => {
  if (!isMissingChunk(error)) return
  try {
    if (sessionStorage.getItem(RELOAD_FLAG)) return
    sessionStorage.setItem(RELOAD_FLAG, "1")
  } catch {
    // Private mode with storage blocked: one reload attempt is still better
    // than a navigation that silently does nothing.
  }
  // Hash history: pointing the hash at the target and reloading lands on the
  // route the user actually asked for. Assigning the hash alone would not
  // reload — a same-document hash change never does — so the reload is
  // explicit.
  location.hash = to.fullPath
  location.reload()
})

router.afterEach(() => {
  try {
    sessionStorage.removeItem(RELOAD_FLAG)
  } catch {}
})

export default router
