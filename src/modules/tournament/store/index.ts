// modules/tournament/store/index.ts
//
// Composition root. It owns the two pieces of state and wires the action
// slices together; the slices own the rules. Nothing here should grow a
// third responsibility -- if an action needs more than dispatching across
// slices, it belongs in a slice.
import { defineStore } from "pinia"
import { ref, watch, nextTick } from "vue"
import type { Tournament, Tiebreaker, LegMode } from "../types"
import { loadTournaments, saveTournament, deleteTournamentRecord, saveIndex } from "../services/persistence"
import {
  createMultiTierLeague,
  getLeaguePlayoffData,
  canStartLeaguePlayoff,
  isLeagueLike,
  seedLeaguePlayoffBracket,
  markLegacyMatchStats,
  claimWatchedStats,
  pendingStatsJobs,
  computeStatsForJob,
  applyStatsResults,
} from "@/engine"
import { generateStatsInWorker } from "@/engine/events/statsWorkerClient"
import { useTeamsStore } from "@/modules/teams/store"
import { usePlayersStore } from "@/modules/players/store"
import { makeWithTournament, assertNoSliceCollisions } from "./helpers"
import { useCrudActions } from "./crud"
import { useBracketActions } from "./bracket"
import { useThirdPlaceActions } from "./third-place"
import { useGroupActions } from "./groups"
import { useDrawActions } from "./draw"
import { useLeagueActions } from "./league"
import { useLeaguePlayoffActions } from "./leaguePlayoff"
import { useScoringActions } from "./scoring"

export const useTournamentStore = defineStore(
  "tournament",
  () => {
    const tournaments = ref<Tournament[]>([])
    const active = ref<string | null>(null)
    /** Set once the pre-v2.2.0 archive has been stamped — see migrateLegacyMatchStats. */
    const statsMigrated = ref(false)

    /**
     * Whether it's safe to write. False while `hydrate()` is still loading —
     * without this guard, populating `tournaments.value` from storage would
     * immediately write every tournament straight back to where it just came
     * from, for no reason.
     */
    const hydrated = ref(false)

    /**
     * `tournaments` no longer goes through pinia-plugin-persistedstate-2 —
     * see persistence.ts for why. This is its replacement: one deep watcher
     * per tournament, each writing only that tournament's own record, plus
     * a shallow watcher on the list itself for tournaments being added or
     * removed. A save or a draw only ever touches one tournament, so this is
     * the whole fix — the cost of persisting it no longer depends on how
     * many other tournaments (or how much match history) already exist.
     */
    const stopWatchers = new Map<string, () => void>()

    function watchTournament(t: Tournament) {
      if (stopWatchers.has(t.id)) return
      stopWatchers.set(
        t.id,
        watch(
          () => t,
          () => {
            if (hydrated.value) void saveTournament(t)
          },
          { deep: true, flush: "post" }
        )
      )
    }

    // Watching `tournaments` (a ref) directly only fires when `.value` is
    // *reassigned* — never on `.push()`/`.splice()`, which is how every
    // create/delete in this store actually mutates it. A tournament being
    // added or removed silently missed this watcher entirely. Watching a
    // getter that reads each id instead ties the trigger to the one thing
    // that actually needs to be caught: the *set* of tournaments changing.
    // It also stays cheap and leaves content mutations to the per-item
    // watchers below, which is what `deep: true` here would have muddled.
    watch(
      () => tournaments.value.map((t) => t.id),
      () => {
        const list = tournaments.value
        const liveIds = new Set(list.map((t) => t.id))
        for (const [id, stop] of stopWatchers) {
          if (!liveIds.has(id)) {
            stop()
            stopWatchers.delete(id)
            if (hydrated.value) deleteTournamentRecord(id)
          }
        }
        for (const t of list) {
          if (!stopWatchers.has(t.id)) {
            watchTournament(t)
            if (hydrated.value) void saveTournament(t)
          }
        }
        if (hydrated.value) saveIndex(list.map((t) => t.id))
      },
      { immediate: true }
    )

    /**
     * Loads every tournament from its own record. Runs once, before mount
     * — see main.ts. A storage failure here used to be fatal for the whole
     * app (an unawaited rejection meant `app.mount` never ran, i.e. a
     * permanent blank screen) — starting empty is a far smaller loss than
     * that, and whatever else is on disk stays untouched for a later,
     * working launch to pick up.
     */
    async function hydrate() {
      try {
        tournaments.value = await loadTournaments()
      } catch {
        tournaments.value = []
      }
      // Let the watcher above finish its "a whole new list arrived" pass
      // (which only sets up per-item watchers while `hydrated` is still
      // false) before allowing writes.
      await nextTick()
      hydrated.value = true
    }

    function getTeams() {
      return useTeamsStore().teams
    }

    const withTournament = makeWithTournament(tournaments)

  /**
   * Fill in match events for anything just played. Results are committed
   * from a dozen actions across every slice, so rather than teach each one
   * about players, every action is wrapped and the tournament it touched is
   * swept afterwards. The sweep skips matches that already have stats, so
   * the repeat cost is one pass over the match list.
   *
   * The claim step (reusing a report already rolled in the live window) is
   * cheap and stays on the main thread.
   *
   * Generating a report from scratch measures under a millisecond even for
   * a full squad — a single save's worth of that is cheaper than a worker
   * round trip (structured clone + postMessage + scheduling), so it runs
   * right here. A worker only pays for itself once a sweep turns up a
   * batch worth off-thread — "Simulate All" filling in a whole bracket's
   * worth of reports at once, say — which is the case this threshold
   * routes there instead.
   */
  const WORKER_WORTHWHILE_JOBS = 8

  function ensureStatsFor(tournamentId: string) {
    const t = tournaments.value.find((x) => x.id === tournamentId)
    if (!t) return
    claimWatchedStats(t)
    const jobs = pendingStatsJobs(t)
    if (!jobs.length) return

    const teams = getTeams()
    const players = usePlayersStore().players

    if (jobs.length < WORKER_WORTHWHILE_JOBS) {
      applyStatsResults(
        t,
        jobs.map((job) => computeStatsForJob(job, teams, players))
      )
      return
    }

    generateStatsInWorker(jobs, teams, players).then((results) => {
      const target = tournaments.value.find((x) => x.id === tournamentId)
      if (target) applyStatsResults(target, results)
    })
  }

  type ActionSlice = Record<string, (...args: never[]) => unknown>

  /**
   * Every slice action takes the tournament id first, so the wrapper knows
   * what to sweep. Actions that take something else first (crud.create takes
   * a name) simply find no tournament and sweep nothing — which is correct,
   * since a tournament being created has no results yet.
   */
  function withStats<T extends ActionSlice>(slice: T): T {
    const wrapped: ActionSlice = {}
    for (const [name, action] of Object.entries(slice)) {
      wrapped[name] = (...args: never[]) => {
        const out = action(...args)
        if (typeof args[0] === "string") ensureStatsFor(args[0])
        return out
      }
    }
    return wrapped as T
  }

  const thirdPlace = useThirdPlaceActions(tournaments, getTeams)
  const crud = useCrudActions(tournaments, active, getTeams)
  const bracket = useBracketActions(tournaments, getTeams, thirdPlace.simulateThirdPlace)
  const groups = useGroupActions(tournaments, getTeams)
  const draw = useDrawActions(tournaments, getTeams)
  const leagueActions = useLeagueActions(tournaments, getTeams)
  const leaguePlayoff = useLeaguePlayoffActions(tournaments, getTeams)
  const scoring = useScoringActions(tournaments)

  if (import.meta.env.DEV) {
    assertNoSliceCollisions({
      crud,
      bracket,
      thirdPlace,
      groups,
      draw,
      leagueActions,
      leaguePlayoff,
      scoring,
    })
  }

  function createMultiTierLeagueTournament(
    name: string,
    tierDefs: Array<{ name: string; teamIds: string[] }>,
    legMode: LegMode = "single",
    promotionCount = 1,
    tiebreaker?: Tiebreaker,
    winPoints?: number,
    drawPoints?: number,
    lossPoints?: number
  ): string {
    const allTeams = useTeamsStore().teams
    const season =
      tournaments.value
        .filter((t) => t.name === name)
        .reduce((max, t) => Math.max(max, t.season), 0) + 1
    const resolvedTiers = tierDefs.map((td) => ({
      name: td.name,
      teams: allTeams.filter((t) => td.teamIds.includes(t.id)),
    }))
    const newT = createMultiTierLeague(name, resolvedTiers, season, legMode, promotionCount)
    if (tiebreaker) newT.tiebreaker = tiebreaker
    if (winPoints !== undefined) newT.winPoints = winPoints
    if (drawPoints !== undefined) newT.drawPoints = drawPoints
    if (lossPoints !== undefined) newT.lossPoints = lossPoints
    tournaments.value.push(newT)
    active.value = newT.id
    return newT.id
  }

  /** One "Simulate All" plays out the whole structure, whatever it is. */
  function simulateTournament(tournamentId: string) {
    withTournament(tournamentId, (t) => {
      if (isLeagueLike(t)) {
        if (t.tiers?.length) {
          leagueActions.simAllTiers(tournamentId)
        } else {
          leagueActions.simAllLeague(tournamentId)
        }
        // Auto-seed the playoff bracket once the season is done (like
        // group -> bracket), then play it out.
        const data = getLeaguePlayoffData(t)
        if (data?.enabled && !data.started && canStartLeaguePlayoff(t)) {
          seedLeaguePlayoffBracket(t, getTeams(), data.seedMode)
        }
        if (t.rounds.length && getLeaguePlayoffData(t)?.started) {
          bracket.simulateAll(tournamentId)
        }
        return
      }

      if (t.format === "group+bracket") {
        groups.simAllGroups(tournamentId)
        // Only seed the bracket if it hasn't been seeded yet — re-seeding
        // would rebuild rounds and wipe knockout matches already played.
        if (!t.groupsDone) groups.advanceToBracket(tournamentId)
      }

      bracket.simulateAll(tournamentId)
    })
    ensureStatsFor(tournamentId)
  }

  /**
   * One-time upgrade pass: stamp every match already played before v2.2.0
   * so the sweep never invents events for history the user played under the
   * old engine. Runs after the persisted state has hydrated.
   */
  function migrateLegacyMatchStats() {
    if (statsMigrated.value) return
    tournaments.value.forEach(markLegacyMatchStats)
    statsMigrated.value = true
  }

  return {
    tournaments,
    active,
    statsMigrated,
    hydrate,
    ...withStats(crud),
    ...withStats(bracket),
    ...withStats(thirdPlace),
    ...withStats(groups),
    ...withStats(draw),
    ...withStats(leagueActions),
    ...withStats(leaguePlayoff),
    ...withStats(scoring),
    createMultiTierLeagueTournament,
    simulateTournament,
    migrateLegacyMatchStats,
  }
  },
  {
    persistedState: {
      // `tournaments` is persisted by hand (see persistence.ts) — one
      // record per tournament instead of the whole history in one blob.
      // Only these two small fields still go through the plugin.
      includePaths: ["active", "statsMigrated"],
      // The plugin's default merge (`(state, saved) => saved`) would hand
      // back whatever shape is on disk wholesale — including a `tournaments`
      // array, if the pre-refactor blob under this same key still has one.
      // Only take the two fields this store still delegates to the plugin.
      merge: (state, saved) => ({
        ...state,
        active: saved?.active ?? state.active,
        statsMigrated: saved?.statsMigrated ?? state.statsMigrated,
      }),
    },
  }
)
