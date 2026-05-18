import { createRouter, createWebHashHistory } from "vue-router"

import TeamsPage from "../modules/teams/pages/TeamsPage.vue"
import TeamDetailPage from "../modules/teams/pages/TeamDetailPage.vue"
import TournamentsPage from "../modules/tournament/pages/TournamentsPage.vue"
import TournamentDetailPage from "../modules/tournament/pages/TournamentDetailPage.vue"
import SettingsPage from "../modules/settings/pages/SettingsPage.vue"

export default createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: "/", redirect: "/teams" },
    { path: "/teams", component: TeamsPage },
    { path: "/teams/:id", component: TeamDetailPage },
    { path: "/tournaments", component: TournamentsPage },
    { path: "/tournaments/:id", component: TournamentDetailPage },
    { path: "/settings", component: SettingsPage },
  ],
})
