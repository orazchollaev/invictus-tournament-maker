<script setup lang="ts">
/**
 * The manager tab: everything about the side the user is in charge of,
 * in one place — the fixture that is his to play, the tactics it is played
 * with, and the way out.
 *
 * Replaces the old top-of-page banner: that banner only had room for the
 * next fixture, so tactics lived on the settings page instead, a tap and a
 * page-load away from the match they applied to.
 */
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { Users } from "@lucide/vue"
import {
  AppButton,
  AppButtonGroup,
  AppCard,
  AppChip,
  AppEmptyState,
  AppField,
  AppSelect,
} from "@/components/ui"
import { TeamBadge } from "@/modules/teams/components"
import MatchScoreModal from "../match-stats/MatchScoreModal.vue"
import ManagerLineupPitch from "./ManagerLineupPitch.vue"
import ManagerLineupSlotSheet from "./ManagerLineupSlotSheet.vue"
import { useTournamentStore } from "@/modules/tournament/store"
import { useTeamsStore } from "@/modules/teams/store"
import { usePlayersStore } from "@/modules/players/store"
import {
  legOf,
  managedUnavailability,
  nextManagedFixture,
} from "@/modules/tournament/utils/managerFixtures"
import { managerStatus } from "@/modules/tournament/utils/managerStatus"
import { useEngineLabels } from "@/composables/useEngineLabels"
import {
  assignLineupSlot,
  clearLineupPlayer,
  emptyLineupSlots,
  lineupPlayerIds,
} from "@/modules/tournament/utils/managerLineup"
import {
  DEFAULT_FORMATION,
  FORMATION_LIST,
  FORMATIONS,
  MORALE_STEP,
  PLAY_STYLES,
  computeFatigueByPlayer,
  computeMoraleAdjustments,
  isFatigueFactorEnabled,
  isInjuryFatigueImpactEnabled,
  isMoraleFactorEnabled,
  playedMatches,
} from "@/engine"
import { useHaptic } from "@/composables/useHaptic"
import { useBannerAd } from "@/composables/useBannerAd"
import type { Formation, PlayStyle } from "@/modules/teams/types"
import type { PlayerPosition } from "@/modules/players/types"
import type { MatchEntry } from "@/engine"

const props = defineProps<{ tournamentId: string; active: boolean }>()

const { t } = useI18n()
const { engineLabel } = useEngineLabels()

const MANAGER_MODE_BANNER_ID = "ca-app-pub-5867331300737777/1358968605"
const adSlot = ref<HTMLElement | null>(null)
const scrolledToTop = ref(true)

// The native banner can't scroll with the page, so it is pinned over the
// slot only while the panel sits at the top, and hidden once it scrolls.
watch(adSlot, (slot, _, onCleanup) => {
  let scroller = slot?.parentElement ?? null
  while (scroller && !/(auto|scroll)/.test(getComputedStyle(scroller).overflowY)) {
    scroller = scroller.parentElement
  }
  if (!scroller) return
  const el = scroller
  const onScroll = () => (scrolledToTop.value = el.scrollTop <= 1)
  onScroll()
  el.addEventListener("scroll", onScroll, { passive: true })
  onCleanup(() => el.removeEventListener("scroll", onScroll))
})

const { enabled: hasBanner, preview: adPreview } = useBannerAd(MANAGER_MODE_BANNER_ID, {
  visible: () => props.active && scrolledToTop.value && !!adSlot.value,
  edge: "top",
  offset: () => `${adSlot.value?.getBoundingClientRect().top ?? 0}px`,
  hideUnderOverlays: true,
})
const store = useTournamentStore()
const teamsStore = useTeamsStore()
const playersStore = usePlayersStore()
const { selection: hapticSelection, success: hapticSuccess } = useHaptic()

const tournament = computed(() => store.tournaments.find((x) => x.id === props.tournamentId))
const manager = computed(() => tournament.value?.manager)
const managedTeam = computed(() =>
  teamsStore.teams.find((tm) => tm.id === tournament.value?.manager?.teamId)
)

// ─── Status ──────────────────────────────────────────────────────
const status = computed(() => (tournament.value ? managerStatus(tournament.value) : null))

type StatusChip = { label: string; variant: "neutral" | "accent" | "success" | "danger" | "gold" }

/** Stage first, then how the side is doing in it. */
const statusChips = computed<StatusChip[]>(() => {
  const s = status.value
  if (!s) return []
  if (s.kind === "champion")
    return [{ label: `🏆 ${t("manager.status.champion")}`, variant: "gold" }]
  if (s.kind === "table") {
    const chips: StatusChip[] = [
      { label: engineLabel(s.stage), variant: "neutral" },
      {
        label: t("manager.status.position", { n: s.position, total: s.total }),
        variant: "accent",
      },
    ]
    if (s.state === "qualified") chips.push({ label: t("manager.status.qualified"), variant: "success" })
    if (s.state === "out") chips.push({ label: t("manager.status.eliminated"), variant: "danger" })
    return chips
  }
  const stage = s.stage ? engineLabel(s.stage) : t("manager.status.thirdPlace")
  return [
    { label: stage, variant: "neutral" },
    s.state === "out"
      ? { label: t("manager.status.eliminated"), variant: "danger" }
      : { label: t("manager.status.inRound"), variant: "success" },
  ]
})

/**
 * With no fixture to hand over: still in it and waiting on a draw or on the
 * other half of the bracket, or genuinely done for the season.
 */
const emptyMessage = computed(() => {
  const s = status.value
  if (s?.kind === "table" && s.state === "qualified") return t("manager.panel.awaitingDraw")
  if (s?.kind === "knockout" && s.state === "alive") return t("manager.panel.awaitingOpponent")
  return t("manager.panel.allPlayed")
})

// ─── Next fixture ────────────────────────────────────────────────
const fixture = computed<MatchEntry | null>(() =>
  tournament.value ? nextManagedFixture(tournament.value) : null
)

/**
 * The fixture the open match modal is about, pinned when it opens. Saving
 * moves `fixture` on to the next match while the sheet is still animating
 * shut — bound to that, the modal would swap to a match nobody asked for.
 */
const playing = ref<MatchEntry | null>(null)
const shown = computed(() => playing.value ?? fixture.value)

const homeTeam = computed(() => teamsStore.teams.find((tm) => tm.id === shown.value?.homeId))
const awayTeam = computed(() => teamsStore.teams.find((tm) => tm.id === shown.value?.awayId))

const stageLabel = computed(() => {
  const src = shown.value?.source
  if (!src) return ""
  if (src.kind === "group") return engineLabel(src.groupName)
  if (src.kind === "league")
    return src.tierName
      ? `${src.tierName} · ${engineLabel(src.matchdayName)}`
      : engineLabel(src.matchdayName)
  if (src.kind === "third-place") return t("rounds.thirdPlace")
  return engineLabel(src.roundName)
})

/** A knockout tie has to produce a winner — except in the first leg of two. */
const requiresWinner = computed(() => {
  const entry = shown.value
  if (!entry) return false
  if (entry.source.kind !== "knockout" && entry.source.kind !== "third-place") return false
  return !entry.isDoubleLeg || legOf(entry) === 2
})

/** Leg 2 counts the first leg, flipped into this leg's home/away frame. */
const aggregateOffset = computed(() => {
  const entry = shown.value
  if (!entry || legOf(entry) !== 2) return null
  const leg1 = entry.match.result
  if (!leg1) return null
  return { home: leg1.away, away: leg1.home }
})

function save(home: number, away: number, penHome?: number, penAway?: number) {
  const entry = playing.value
  if (!entry) return
  store.setFixtureResult(props.tournamentId, entry, home, away, penHome, penAway)
}

function closeMatch() {
  playing.value = null
}

// ─── Tactics ─────────────────────────────────────────────────────
const formationOptions = computed(() => FORMATION_LIST.map((value) => ({ value, label: value })))
const styleOptions = computed(() =>
  PLAY_STYLES.map((value) => ({ value, label: t(`coach.styles.${value}`) }))
)

const formation = computed({
  get: () => manager.value?.formation ?? DEFAULT_FORMATION,
  set: (value: Formation) => store.setManagerTactics(props.tournamentId, { formation: value }),
})

const style = computed({
  get: () => manager.value?.style ?? "balanced",
  set: (value: PlayStyle) => store.setManagerTactics(props.tournamentId, { style: value }),
})

function standDown() {
  store.setManagerTeam(props.tournamentId, null)
}

// ─── Starting XI ─────────────────────────────────────────────────
const squad = computed(() => playersStore.byTeam(manager.value?.teamId ?? ""))
const playerById = computed(() => new Map(squad.value.map((p) => [p.id, p])))

const POSITION_ORDER: PlayerPosition[] = ["GK", "DEF", "MID", "FWD"]

const formationSlots = computed(() => FORMATIONS[formation.value])

/** One entry per formation slot — the pitch shows exactly this, nothing else. */
const slots = computed(() => manager.value?.lineup ?? emptyLineupSlots(formation.value))
const lineupIds = computed(() => lineupPlayerIds(slots.value))

/** Hurt or one match into a suspension — neither can be fielded right now. */
const unavailable = computed(() =>
  tournament.value
    ? managedUnavailability(tournament.value)
    : { injured: new Set<string>(), suspended: new Set<string>() }
)

function unavailabilityOf(playerId: string): "injured" | "suspended" | null {
  if (unavailable.value.injured.has(playerId)) return "injured"
  if (unavailable.value.suspended.has(playerId)) return "suspended"
  return null
}

const unavailableSlotIndexes = computed(() => {
  const set = new Set<number>()
  slots.value.forEach((slot, index) => {
    if (slot.playerId && unavailabilityOf(slot.playerId)) set.add(index)
  })
  return set
})

// ─── Fatigue & morale ──────────────────────────────────────────────
/** History read once per team, in `playedMatches` order, the shape every fatigue/morale call takes. */
const managedHistory = computed(() => {
  if (!tournament.value) return []
  return playedMatches(tournament.value).map((e) => ({
    homeId: e.homeId,
    awayId: e.awayId,
    result: e.result,
  }))
})

/**
 * Whether there is any fatigue to show at all — either setting that reads it
 * (see engine/fatigue.ts) turns the underlying numbers on; a manager who only
 * cares about the injury-risk side of fatigue still gets to see who's tired,
 * exactly as the live match drawer and sub sheet already do (see
 * MatchScoreModal's `fatigueByTeam`).
 */
const fatigueDisplayEnabled = computed(
  () => isFatigueFactorEnabled() || isInjuryFatigueImpactEnabled()
)

const fatigueByPlayer = computed(() => {
  if (!manager.value || !fatigueDisplayEnabled.value) return new Map<string, number>()
  return computeFatigueByPlayer(manager.value.teamId, managedHistory.value)
})

/** Raw 0-1 fatigue per formation slot, for the pitch's percentage badge. */
const fatigueSlotValues = computed(() => {
  const map = new Map<number, number>()
  slots.value.forEach((slot, index) => {
    if (!slot.playerId) return
    const fatigue = fatigueByPlayer.value.get(slot.playerId)
    if (fatigue !== undefined) map.set(index, fatigue)
  })
  return map
})

/** The team's own current streak, ±. Zero when off or nothing has been played. */
const moraleAdjustment = computed(() => {
  if (!manager.value || !isMoraleFactorEnabled()) return 0
  const teamId = manager.value.teamId
  return computeMoraleAdjustments([teamId], managedHistory.value).get(teamId) ?? 0
})

/**
 * A face for the team's current streak — how many `MORALE_STEP`s deep it is,
 * not just its sign, so a two-game run reads calmer than a five-game one.
 */
const moraleEmoji = computed(() => {
  const steps = Math.round(moraleAdjustment.value / MORALE_STEP)
  if (steps >= 3) return "🔥"
  if (steps >= 1) return "🙂"
  if (steps <= -3) return "🥶"
  if (steps <= -1) return "😟"
  return ""
})

/** A pick that becomes unavailable after the fact (a red card just rolled,
 * say) drops out of the lineup on its own rather than leaving a ghost slot
 * the "eleven picked" count still trusts. */
watch(
  unavailable,
  ({ injured, suspended }) => {
    if (!manager.value) return
    let next = slots.value
    for (const id of [...injured, ...suspended]) next = clearLineupPlayer(next, id)
    if (next !== slots.value) store.setManagerLineup(props.tournamentId, next)
  },
  { immediate: true }
)

function filledCount(position: PlayerPosition): number {
  return slots.value.filter((s) => s.position === position && s.playerId).length
}

/** Fit players actually left to pick from, for one position — hurt or
 * suspended ones don't count. */
function availableCount(position: PlayerPosition): number {
  return squad.value.filter((p) => p.position === position && !unavailabilityOf(p.id)).length
}

/** What a full XI needs from this position, capped by what the squad can
 * actually supply — a position the squad is short of is never "incomplete",
 * it is just short, and the match's own engine covers the gap. */
function neededCount(position: PlayerPosition): number {
  return Math.min(formationSlots.value[position] ?? 0, availableCount(position))
}

/** How many more can still usefully be picked — zero once every position has
 * either filled its slots or the manager has run out of fit players in it. */
const missingCount = computed(() =>
  POSITION_ORDER.reduce(
    (sum, position) => sum + Math.max(0, neededCount(position) - filledCount(position)),
    0
  )
)
const lineupReady = computed(() => missingCount.value === 0)

watch(lineupReady, (ready, wasReady) => {
  if (ready && !wasReady) hapticSuccess()
})

// ─── Slot picker ───────────────────────────────────────────────────
const activeSlotIndex = ref<number | null>(null)
const activeSlot = computed(() =>
  activeSlotIndex.value !== null ? slots.value[activeSlotIndex.value] : null
)

/** Everyone fit to fill the active slot: not hurt/suspended, and not
 *  already standing in a different one. */
const activeSlotCandidates = computed(() => {
  if (!activeSlot.value) return []
  const current = activeSlot.value.playerId
  return squad.value.filter(
    (p) => !unavailabilityOf(p.id) && (p.id === current || !lineupIds.value.has(p.id))
  )
})

function openSlot(index: number) {
  activeSlotIndex.value = index
}

function closeSlot() {
  activeSlotIndex.value = null
}

function assignSlot(playerId: string) {
  if (activeSlotIndex.value === null) return
  const next = assignLineupSlot(slots.value, activeSlotIndex.value, playerId)
  store.setManagerLineup(props.tournamentId, next)
  hapticSelection()
}

function clearSlot() {
  if (activeSlotIndex.value === null) return
  const next = assignLineupSlot(slots.value, activeSlotIndex.value, null)
  store.setManagerLineup(props.tournamentId, next)
  hapticSelection()
}

function open11() {
  if (!lineupReady.value || !fixture.value) return
  playing.value = fixture.value
}
</script>

<template>
  <div v-if="manager && managedTeam" class="mp">
    <section class="mp-hero" :style="{ '--team': managedTeam.color }">
      <div class="mp-hero-head">
        <TeamBadge :team="managedTeam" :size="30" class="mp-hero-team" />
        <AppChip
          v-if="moraleAdjustment !== 0"
          square
          :variant="moraleAdjustment > 0 ? 'success' : 'danger'"
        >
          {{ moraleEmoji }} {{ t("manager.morale.label") }}
        </AppChip>
      </div>

      <div v-if="statusChips.length" class="mp-status">
        <AppChip
          v-for="chip in statusChips"
          :key="chip.label"
          square
          size="sm"
          :variant="chip.variant"
        >
          {{ chip.label }}
        </AppChip>
      </div>

      <div class="mp-next">
        <template v-if="fixture">
          <div class="mp-next-label">
            {{ t("manager.panel.nextMatch") }}
            <span class="mp-next-stage">· {{ stageLabel }}</span>
          </div>
          <div class="mp-fixture-row">
            <TeamBadge :team="homeTeam" :size="24" reverse class="mp-side" />
            <span class="mp-vs">{{ t("common.vs") }}</span>
            <TeamBadge :team="awayTeam" :size="24" class="mp-side" />
          </div>
          <AppButton variant="filled" block :disabled="!lineupReady" @click="open11">
            {{ t("manager.banner.play") }}
          </AppButton>
          <p v-if="!lineupReady" class="mp-fixture-hint">
            {{ t("manager.lineup.incomplete", { n: missingCount }) }}
          </p>
        </template>
        <p v-else class="mp-empty">{{ emptyMessage }}</p>
      </div>
    </section>

    <!-- Space the native banner is pinned over; a red preview in dev. -->
    <div
      v-if="hasBanner || adPreview"
      ref="adSlot"
      class="mp-ad-slot"
      :class="{ 'mp-ad-slot--preview': adPreview }"
    />

    <AppCard padding="md">
      <template #title>{{ t("manager.panel.tactics") }}</template>
      <div class="mp-tactics">
        <AppField layout="stack" :label="t('coach.form.formation')">
          <AppSelect v-model="formation" :options="formationOptions" />
        </AppField>
        <AppField layout="stack" :label="t('coach.form.style')">
          <AppButtonGroup v-model="style" :options="styleOptions" block />
        </AppField>
      </div>
    </AppCard>

    <AppCard padding="md">
      <template #title>
        <Users :size="15" class="mp-icon" />
        {{ t("manager.lineup.title") }}
      </template>
      <template #actions>
        <AppChip size="xs" square :variant="lineupReady ? 'accent' : undefined">
          {{ t("manager.lineup.count", { n: lineupIds.size }) }}
        </AppChip>
      </template>

      <p class="mp-lineup-hint">{{ t("manager.lineup.hint") }}</p>

      <AppEmptyState v-if="!squad.length" :title="t('manager.lineup.noSquad')" />
      <ManagerLineupPitch
        v-else
        class="mp-pitch"
        :slots="slots"
        :player-by-id="playerById"
        :team-color="managedTeam.color"
        :unavailable-slot-indexes="unavailableSlotIndexes"
        :fatigue-slot-values="fatigueSlotValues"
        @tap-slot="openSlot"
      />
    </AppCard>

    <ManagerLineupSlotSheet
      v-if="activeSlot"
      :position="activeSlot.position"
      :squad="activeSlotCandidates"
      :current-player-id="activeSlot.playerId"
      :fatigue-by-player="fatigueByPlayer"
      @select="assignSlot"
      @clear="clearSlot"
      @close="closeSlot"
    />

    <div class="mp-footer">
      <AppButton variant="text" size="xs" class="mp-stand-down" @click="standDown">
        {{ t("manager.settings.standDown") }}
      </AppButton>
    </div>

    <MatchScoreModal
      v-if="playing"
      :home-team="homeTeam"
      :away-team="awayTeam"
      :result="playing.result"
      :requires-winner="requiresWinner"
      :subtitle="stageLabel"
      :match-id="playing.match.id"
      :leg="legOf(playing)"
      :aggregate-offset="aggregateOffset"
      @save="save"
      @close="closeMatch"
    />
  </div>
</template>

<style scoped>
.mp {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  padding-bottom: var(--sp-3);
}

.mp-ad-slot {
  flex-shrink: 0;
  align-self: center;
  width: 320px;
  max-width: 100%;
  height: 50px;
}

.mp-ad-slot--preview {
  background: var(--danger);
}

/* ── Hero: who you are, where you stand, what's next ── */
.mp-hero {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  padding: var(--sp-4);
  border: 1px solid color-mix(in srgb, var(--team, var(--accent)) 35%, var(--border-light));
  border-radius: var(--radius-lg);
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--team, var(--accent)) 14%, transparent),
      transparent 60%
    ),
    var(--surface);
  box-shadow: var(--elev-1);
}

.mp-hero-head {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}

.mp-hero-team {
  min-width: 0;
}
.mp-hero-team :deep(.name) {
  font-size: var(--fs-lg);
}

.mp-status {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
}

.mp-next {
  padding-top: var(--sp-3);
  border-top: 1px solid var(--border-light);
}

.mp-next-label {
  font-size: var(--fs-xs);
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.mp-next-stage {
  font-weight: 500;
  letter-spacing: normal;
  text-transform: none;
}

.mp-fixture-row {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-3) 0;
}

.mp-side {
  min-width: 0;
}

.mp-vs {
  font-size: var(--fs-xs);
  color: var(--text-muted);
}

.mp-fixture-hint,
.mp-empty {
  margin: var(--sp-2) 0 0;
  text-align: center;
  font-size: var(--fs-xs);
  color: var(--text-muted);
}

/* ── Tactics ── */
.mp-tactics {
  display: grid;
  grid-template-columns: minmax(120px, 1fr) 2fr;
  gap: var(--sp-3);
  align-items: start;
}

/* ── Lineup ── */
.mp-icon {
  color: var(--accent);
}

.mp-lineup-hint {
  margin: 0 0 var(--sp-2);
  font-size: var(--fs-sm);
  color: var(--text-muted);
}

.mp-pitch {
  margin-bottom: var(--sp-1);
}

.mp-footer {
  display: flex;
  justify-content: center;
}
.mp-stand-down {
  color: var(--danger);
}

@media (max-width: 600px) {
  .mp-hero {
    padding: var(--sp-3);
  }
  .mp-tactics {
    grid-template-columns: 1fr;
  }
}
</style>
