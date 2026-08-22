# Player Match Events & Statistics — v2.2.0 Design

**Status:** approved
**Date:** 2026-08-22

## Problem

The players system added in v2.1.0 is skin-deep. `usePlayersStore` exists, players
can be created and assigned to teams, but the only thing a player affects is the
squad-average blend in the `usePlayerPower` resolver (`modules/settings/store.ts`).
The match engine never sees a player: `simulateMatch` reads `resolvePower(team)` and
returns two integers.

Nothing in the app answers "who scored?". There is no per-match detail view, no
scorer table, and no player-level page. A tournament is a set of numbers, not a
story.

## Goals

1. Every match played from v2.2.0 onward carries a full event record: goals,
   assists, cards, own goals, penalties, goalkeeper saves.
2. A per-match statistics screen reachable from the score modal.
3. The tournament `Stats` tab splits into `Team Stats` (today's content, moved
   unchanged) and `Player Stats` (new rankings).
4. A player detail page with career totals and honours.
5. An all-time player tab in History.
6. Squads shorter than eleven players do not distort the data: unfilled positions
   become anonymous "Unknown Player" slots that absorb their share of events.

## Non-goals

Deliberately out of scope for v2.2.0:

- Card suspensions and injuries. Cards are recorded and displayed; they never
  affect a later match, team power, or lineup.
- Player statistics in the PDF/Excel export.
- Goal-scorer probabilities in the Monte Carlo simulation.
- A discipline ranking table. Cards appear in the match modal and in a player's
  career totals, not as a tournament leaderboard.
- Manual assignment of goals to players. Events are engine-generated and
  read-only.
- Retroactive events for matches already played before the upgrade.

## Data model

Events hang off `MatchResult`. That is the single anchor shared by knockout
matches (`Match.result`, `Match.leg2Result`), group matches (`GroupMatch.result`),
league matches, and the third-place match — so one optional field covers every
format without touching any other type.

```ts
// modules/tournament/types.ts

export type MatchEventType = "goal" | "ownGoal" | "penGoal" | "penMiss" | "yellow" | "red"

export interface MatchEvent {
  minute: number // 1-90, or 90+ for stoppage time
  type: MatchEventType
  side: "home" | "away" // the team the event is credited to
  playerId: string | null // null = Unknown Player (anonymous, never aggregated)
  assistId?: string | null
}

export interface PlayerMatchLine {
  playerId: string | null
  side: "home" | "away"
  position: PlayerPosition
  goals: number
  assists: number
  yellow: number
  red: number
  saves?: number // goalkeepers only
  conceded?: number // goalkeepers only
  cleanSheet?: boolean // goalkeepers and defenders
  rating: number // 1.0-10.0, one decimal
}

export interface TeamMatchStats {
  possession: number // home share, 0-100; away is the remainder
  shots: [home: number, away: number]
  onTarget: [home: number, away: number]
  corners: [home: number, away: number]
  fouls: [home: number, away: number]
}

export interface MatchStats {
  events: MatchEvent[]
  lines: PlayerMatchLine[]
  team: TeamMatchStats
}

export interface MatchResult {
  home: number
  away: number
  penHome?: number
  penAway?: number
  /**
   * undefined — not generated yet, `ensureMatchStats` will fill it.
   * null      — a match that was already played before v2.2.0; never generated.
   */
  stats?: MatchStats | null
}
```

`PlayerPosition` is imported from `modules/players/types`. That is a new dependency
from the tournament types onto the players module; it is a leaf type with no
further imports, so it introduces no cycle.

### Why persist rather than derive

The alternative was deriving events on read from a PRNG seeded by match id and
score. That needs no storage and no migration, but a player added to a squad later
would silently rewrite the scorers of every past match. Persisted events are
immutable history. The cost is backup size, which the existing gzip layer in
`useDataManagement` already absorbs.

## Generation choke point

Results are written in at least eight places across `store/bracket.ts`,
`store/groups.ts`, `store/league.ts`, `store/third-place.ts`, and their engine
counterparts. Threading event generation through each one would be brittle.

Instead, a single sweep mirrors the existing `recalcAllStandings` pattern:

```ts
// engine/events/ensure.ts
export function ensureMatchStats(t: Tournament, teams: Team[], players: Player[]): void
```

It walks every match in the tournament — knockout rounds (both legs), the
third-place match, groups, the single league, and every tier — and for any result
whose `stats` is `undefined`, generates and assigns it. Results already carrying
`stats` (object or `null`) are skipped, so the sweep is idempotent and cheap.

Call sites: the tournament store, immediately after any mutation that can commit a
result — the same places that already call `recalcAllStandings`.

The Monte Carlo worker (`engine/monteCarlo.worker.ts`) never calls it. Thousands of
runs must not generate events.

### Migration

The user's decision: existing matches stay untouched.

A one-time pass on app start stamps `stats = null` on every already-played result
across all stored tournaments. It generates nothing — it only marks what is old.
From then on, `undefined` unambiguously means "played under v2.2.0 or later" and
the sweep fills it.

The pass is guarded by a version marker persisted alongside the tournament store so
it runs exactly once.

Consequence, accepted by the user: the new History → Players tab starts empty and
fills as new seasons are played. Its empty state must say so rather than looking
broken.

## Lineup selection

`engine/events/lineup.ts` builds an eleven-slot skeleton in a 1-4-3-3 shape:
1 GK, 4 DEF, 3 MID, 3 FWD.

For each position bucket, the team's registered players at that position are
sampled without replacement using weight `power²` — strong players start most
matches, squad players rotate in occasionally. Slots with no candidate left become
`null`: an Unknown Player.

Unknown slots are anonymous. They appear in that match's screen as "Unknown Player"
and are excluded from every ranking and career total (`playerId === null` is never
aggregated).

The practical effect the user asked for: a team with one registered striker sees
that striker score roughly three of ten goals, not all ten.

## Event generation

`engine/events/generate.ts` takes the two lineups and the final score, and returns
events consistent with that score by construction — the goal counts per side always
sum to the recorded result.

- **Goal attribution weight:** `positionWeight × (power / 50)`, with
  FWD 1.0, MID 0.55, DEF 0.2, GK 0.02. Unknown slots use the position's baseline
  weight at power 50.
- **Own goals:** ~2% of goals, credited against a DEF or GK of the conceding side
  and counted for the scoring side's total.
- **Penalty goals:** ~8% of goals, taken by the highest-power FWD or MID in the
  lineup.
- **Assists:** ~70% of goals that are neither penalties nor own goals get an assist
  from a different player on the same side, weighted MID 1.0, FWD 0.7, DEF 0.35.
- **Cards:** Poisson, λ ≈ 2.2 yellow and 0.06 red per team per match, weighted
  DEF 1.0, MID 0.9, FWD 0.6, GK 0.15.
- **Goalkeeper saves:** opponent shots on target minus goals conceded, floored at
  zero.
- **Minutes:** drawn across 1-90 with a small stoppage-time tail, sorted ascending.
- **Shootouts:** penalty-shootout kicks are not timeline events. The modal shows the
  shootout score as a separate line.

`engine/events/teamStats.ts` derives the comparison bar figures from the power
difference and the score: possession, shots, shots on target, corners, fouls. These
are team-level and simulated; the user accepted them explicitly. Player-level
numbers are never invented — only what an event produced.

## Rating

`engine/events/rating.ts`. Inputs chosen by the user: goals and assists, team
result, clean sheet and goals conceded. Cards and raw player power deliberately do
**not** feed the rating.

```
6.0 base
+ 0.6 win / 0.0 draw / -0.4 loss
+ per goal:   FWD 0.9, MID 1.1, DEF 1.4, GK 2.0
+ per assist: 0.6 (DEF 0.8)
+ clean sheet: GK 1.0, DEF 0.7, MID 0.2
- per goal conceded beyond the first (GK only): 0.25
+ per save (GK only): 0.1
clamp to [1.0, 10.0], rounded to one decimal
```

## Module layout

```
src/engine/events/
  lineup.ts       starting eleven + Unknown slots
  generate.ts     events and per-player lines
  teamStats.ts    possession / shots / corners / fouls
  rating.ts       the 1-10 formula
  ensure.ts       ensureMatchStats sweep + one-time migration stamp
  index.ts
  __tests__/

src/modules/tournament/components/match-stats/
  MatchStatsModal.vue    AppModal drawer, layered over MatchScoreModal
  MatchTimeline.vue
  MatchTeamCompare.vue
  MatchPlayerTable.vue
  index.ts

src/modules/tournament/components/stats/
  TeamStatsPanel.vue     today's TournamentStats content, moved verbatim
  PlayerStatsPanel.vue
  index.ts

src/modules/tournament/composables/
  useTournamentPlayerStats.ts

src/modules/players/
  components/PlayerRatingChip.vue
  components/detail/PlayerCareerCard.vue
  components/detail/PlayerHonoursCard.vue
  components/detail/index.ts
  composables/usePlayerCareer.ts
  pages/PlayerDetailPage.vue

src/modules/history/
  components/PlayersTab.vue
  composables/useHistoryPlayerStats.ts

src/components/ui/AppStatBar.vue
```

`TournamentStats.vue` becomes a thin shell holding a `SubTabBar` and the two
panels. Its current body moves into `TeamStatsPanel.vue` unchanged — no behaviour
is lost or altered by the split.

## User interface

**Score modal.** `MatchScoreModal.vue` gains a `ChartColumn` ghost button in its
footer, styled with the existing `.ms-ghost` class, rendered only when `result` is
set. It opens `MatchStatsModal` on top; the score modal stays mounted underneath
and is revealed again on close. The stats drawer sits at `--z-modal + 20`, above the
score modal's `--z-modal + 11`.

**Match stats modal.** An `AppModal` drawer containing, in order: the scoreline
header (with the shootout score when there was one), the team comparison bars, the
minute-by-minute timeline, and the two player tables with colour-coded ratings.

**Tournament Stats tab.** A `SubTabBar` selects Team Stats or Player Stats,
matching the existing group/wildcard sub-tab pattern.

**Player Stats panel.** A `BtnGroup` switches between four rankings: top scorers,
top assists, highest average rating, and goalkeepers (clean sheets, saves, goals
conceded). Each is an `AppTable` with `TeamBadge`, consistent with the tables
already in the app.

**Player detail page.** Route `/players/:id`. A header (avatar, shirt number,
position, power, team badge), a career summary card (appearances, goals, assists,
cards, average rating — totalled across every tournament and season), and an
honours card (trophies won with the player's team, seasons finished as top
scorer). Rows in `PlayersPage` and `TeamSquadCard` link here.

**History.** A new `Players` tab beside Champions / All Finals / Team Stats,
showing all-time goals, assists, appearances, and average rating.

**Deleted players.** Events store a `playerId`, not a name. If a player is deleted
after appearing in matches, the id no longer resolves; those lines render as
"Unknown Player" and drop out of rankings, exactly like an unfilled slot. The
stored events themselves are never rewritten.

## Incidental fixes in scope

- `Player.number?: number` (shirt number, 1-99) added to the model and to
  `PlayerFormModal`.
- `usePlayersStore.add` and `useTeamsStore.add` generate ids with `Date.now()`,
  which collides when several records are created in the same millisecond (bulk
  add, dataset import). Both switch to the existing `uid()` helper in
  `engine/utils.ts`.
- New i18n keys (~70) added to all ten locales.

## Testing

`engine/events/__tests__` covers:

- generated goal events per side sum exactly to the recorded score, including own
  goals and penalties
- a one-player squad receives roughly its slot's share of goals, never all of them
- unknown slots produce `playerId: null` and are excluded from aggregation
- ratings stay within [1.0, 10.0] across extreme inputs (10-0 wins, 0-10 losses)
- `buildLineup` always returns eleven slots and never repeats a player
- `ensureMatchStats` is idempotent and skips both `null` and populated results
- the migration stamp marks played results and generates nothing

Vitest already runs in `pnpm build`, so these gate the release.
