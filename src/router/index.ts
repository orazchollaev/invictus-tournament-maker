import { createRouter, createWebHashHistory } from "vue-router"

export default createRouter({
  history: createWebHashHistory(),
  // Page uses an out-in <Transition>, so wait for the swap before scrolling,
  // otherwise scroll fires against the outgoing page. Back/forward restores
  // saved position; everything else starts at the top.
  scrollBehavior(_to, _from, savedPosition) {
    return new Promise((resolve) => {
      setTimeout(() => resolve(savedPosition ?? { top: 0, left: 0 }), 250)
    })
  },
  routes: [
    { path: "/", redirect: "/tournaments" },

    { path: "/teams", component: () => import("../modules/teams/pages/TeamsPage.vue") },
    { path: "/teams/:id", component: () => import("../modules/teams/pages/TeamDetailPage.vue") },

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
