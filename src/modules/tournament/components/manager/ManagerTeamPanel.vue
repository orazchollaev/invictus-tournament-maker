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
import { ClipboardList, Users } from "@lucide/vue"
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
import { useTournamentStore } from "@/modules/tournament/store"
import { useTeamsStore } from "@/modules/teams/store"
import { usePlayersStore } from "@/modules/players/store"
import {
  legOf,
  managedUnavailability,
  nextManagedFixture,
} from "@/modules/tournament/utils/managerFixtures"
import { FORMATION_LIST, FORMATIONS, PLAY_STYLES } from "@/engine"
import { useHaptic } from "@/composables/useHaptic"
import type { Formation, PlayStyle } from "@/modules/teams/types"
import type { Player, PlayerPosition } from "@/modules/players/types"
import type { MatchEntry } from "@/engine"

const props = defineProps<{ tournamentId: string }>()

const { t } = useI18n()
const store = useTournamentStore()
const teamsStore = useTeamsStore()
const playersStore = usePlayersStore()
const { selection: hapticSelection, success: hapticSuccess } = useHaptic()

const tournament = computed(() => store.tournaments.find((x) => x.id === props.tournamentId))
const manager = computed(() => tournament.value?.manager)
const managedTeam = computed(() =>
  teamsStore.teams.find((tm) => tm.id === tournament.value?.manager?.teamId)
)

// ─── Next fixture ────────────────────────────────────────────────
const fixture = computed<MatchEntry | null>(() =>
  tournament.value ? nextManagedFixture(tournament.value) : null
)

const homeTeam = computed(() => teamsStore.teams.find((tm) => tm.id === fixture.value?.homeId))
const awayTeam = computed(() => teamsStore.teams.find((tm) => tm.id === fixture.value?.awayId))

const stageLabel = computed(() => {
  const src = fixture.value?.source
  if (!src) return ""
  if (src.kind === "group") return src.groupName
  if (src.kind === "league")
    return src.tierName ? `${src.tierName} · ${src.matchdayName}` : src.matchdayName
  if (src.kind === "third-place") return t("rounds.thirdPlace")
  return src.roundName
})

/** A knockout tie has to produce a winner — except in the first leg of two. */
const requiresWinner = computed(() => {
  const entry = fixture.value
  if (!entry) return false
  if (entry.source.kind !== "knockout" && entry.source.kind !== "third-place") return false
  return !entry.isDoubleLeg || legOf(entry) === 2
})

/** Leg 2 counts the first leg, flipped into this leg's home/away frame. */
const aggregateOffset = computed(() => {
  const entry = fixture.value
  if (!entry || legOf(entry) !== 2) return null
  const leg1 = entry.match.result
  if (!leg1) return null
  return { home: leg1.away, away: leg1.home }
})

const open = ref(false)

function save(home: number, away: number, penHome?: number, penAway?: number) {
  const entry = fixture.value
  if (!entry) return
  store.setFixtureResult(props.tournamentId, entry, home, away, penHome, penAway)
}

// ─── Tactics ─────────────────────────────────────────────────────
const formationOptions = computed(() => FORMATION_LIST.map((value) => ({ value, label: value })))
const styleOptions = computed(() =>
  PLAY_STYLES.map((value) => ({ value, label: t(`coach.styles.${value}`) }))
)

const formation = computed({
  get: () => manager.value?.formation ?? "4-4-2",
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
/** Best power first — the squad the user is choosing from, not the pitch. */
const squad = computed(() =>
  [...playersStore.byTeam(manager.value?.teamId ?? "")].sort((a, b) => b.power - a.power)
)

const POSITION_ORDER: PlayerPosition[] = ["GK", "DEF", "MID", "FWD"]

/**
 * Grouped by the job the current formation actually needs, not just
 * dumped in one long list — a pick only ever fills a slot in the player's
 * own position (that's how the engine seats them too), so showing them
 * any other way left it unclear what a checkbox was even choosing.
 */
const squadByPosition = computed(() => {
  const groups = new Map<PlayerPosition, Player[]>()
  for (const position of POSITION_ORDER) groups.set(position, [])
  for (const player of squad.value) groups.get(player.position)?.push(player)
  return groups
})

const formationSlots = computed(() => FORMATIONS[formation.value])

const lineup = computed(() => manager.value?.lineup ?? [])
const lineupSet = computed(() => new Set(lineup.value))

/** Hurt or one match into a suspension — neither can be fielded right now. */
const unavailable = computed(() =>
  tournament.value
    ? managedUnavailability(tournament.value)
    : { injured: new Set(), suspended: new Set() }
)

function unavailabilityOf(playerId: string): "injured" | "suspended" | null {
  if (unavailable.value.injured.has(playerId)) return "injured"
  if (unavailable.value.suspended.has(playerId)) return "suspended"
  return null
}

/** A pick that becomes unavailable after the fact (a red card just rolled,
 * say) drops out of the lineup on its own rather than leaving a ghost slot
 * the "eleven picked" count still trusts. */
watch(
  unavailable,
  ({ injured, suspended }) => {
    if (!manager.value) return
    const next = lineup.value.filter((id) => !injured.has(id) && !suspended.has(id))
    if (next.length !== lineup.value.length) store.setManagerLineup(props.tournamentId, next)
  },
  { immediate: true }
)

function pickedCount(position: PlayerPosition): number {
  return (squadByPosition.value.get(position) ?? []).filter((p) => lineupSet.value.has(p.id)).length
}

const totalSlots = computed(() =>
  Object.values(formationSlots.value).reduce((sum, n) => sum + n, 0)
)
/** Whole squad picked, nobody left to auto-fill — the only state the match is allowed to start from. */
const lineupReady = computed(() => lineup.value.length >= totalSlots.value)

function toggleLineup(player: Player) {
  if (unavailabilityOf(player.id)) return
  const current = [...lineup.value]
  const idx = current.indexOf(player.id)
  if (idx >= 0) {
    current.splice(idx, 1)
    hapticSelection()
  } else {
    if (pickedCount(player.position) >= (formationSlots.value[player.position] ?? 0)) return
    current.push(player.id)
    if (current.length >= totalSlots.value) hapticSuccess()
    else hapticSelection()
  }
  store.setManagerLineup(props.tournamentId, current)
}

function removeFromLineup(player: Player) {
  toggleLineup(player)
}

const groupRefs = ref<Partial<Record<PlayerPosition, HTMLElement | null>>>({})
function focusPosition(position: PlayerPosition) {
  groupRefs.value[position]?.scrollIntoView({ behavior: "smooth", block: "center" })
}

function open11() {
  if (!lineupReady.value) return
  open.value = true
}
</script>

<template>
  <div v-if="manager && managedTeam" class="mp">
    <AppCard variant="outlined" padding="md" class="mp-fixture-card">
      <template #title>
        <ClipboardList :size="15" class="mp-icon" />
        {{ t("manager.banner.title", { team: managedTeam.name }) }}
      </template>

      <template v-if="fixture">
        <AppChip square size="xs" class="mp-stage">{{ stageLabel }}</AppChip>

        <div class="mp-fixture-row">
          <div class="mp-side">
            <TeamBadge :team="homeTeam" :size="28" reverse />
          </div>
          <span class="mp-vs">{{ t("common.vs") }}</span>
          <div class="mp-side mp-side--away">
            <TeamBadge :team="awayTeam" :size="28" />
          </div>
        </div>

        <AppButton variant="filled" block :disabled="!lineupReady" @click="open11">
          {{ t("manager.banner.play") }}
        </AppButton>
        <p v-if="!lineupReady" class="mp-fixture-hint">
          {{ t("manager.lineup.incomplete", { n: totalSlots - lineup.length }) }}
        </p>
      </template>

      <AppEmptyState v-else :title="t('manager.panel.allPlayed')" />
    </AppCard>

    <AppCard padding="md">
      <template #title>{{ t("manager.settings.title") }}</template>

      <div class="mp-tactics">
        <AppField layout="stack" :label="t('coach.form.formation')">
          <AppSelect v-model="formation" :options="formationOptions" />
        </AppField>

        <AppField
          layout="stack"
          :label="t('coach.form.style')"
          :hint="t(`coach.styleHints.${style}`)"
        >
          <AppButtonGroup v-model="style" :options="styleOptions" block />
        </AppField>

        <div class="mp-actions">
          <AppButton variant="danger" size="xs" @click="standDown">
            {{ t("manager.settings.standDown") }}
          </AppButton>
        </div>
      </div>
    </AppCard>

    <AppCard padding="md">
      <template #title>
        <Users :size="15" class="mp-icon" />
        {{ t("manager.lineup.title") }}
      </template>
      <template #actions>
        <AppChip size="xs" square :variant="lineupReady ? 'accent' : undefined">
          {{ t("manager.lineup.count", { n: lineup.length }) }}
        </AppChip>
      </template>

      <p class="mp-lineup-hint">{{ t("manager.lineup.hint") }}</p>

      <AppEmptyState v-if="!squad.length" :title="t('manager.lineup.noSquad')" />
      <template v-else>
        <ManagerLineupPitch
          class="mp-pitch"
          :slots="formationSlots"
          :squad-by-position="squadByPosition"
          :lineup-ids="lineup"
          @focus="focusPosition"
          @remove="removeFromLineup"
        />

        <div class="mp-lineup-groups">
          <div
            v-for="position in POSITION_ORDER"
            :key="position"
            :ref="(el) => (groupRefs[position] = el as HTMLElement | null)"
            class="mp-lineup-group"
          >
            <div class="mp-lineup-group-head">
              <span>{{ t(`players.positions.${position}`) }}</span>
              <span class="mp-lineup-group-count">
                {{ pickedCount(position) }}/{{ formationSlots[position] }}
              </span>
            </div>

            <p v-if="!squadByPosition.get(position)?.length" class="mp-lineup-empty">
              {{ t("manager.lineup.noneForPosition") }}
            </p>
            <div v-else class="mp-lineup-list">
              <label
                v-for="player in squadByPosition.get(position)"
                :key="player.id"
                class="mp-lineup-row"
                :class="{
                  'mp-lineup-row--picked': lineupSet.has(player.id),
                  'mp-lineup-row--unavailable': !!unavailabilityOf(player.id),
                }"
              >
                <input
                  type="checkbox"
                  :checked="lineupSet.has(player.id)"
                  :disabled="
                    !!unavailabilityOf(player.id) ||
                    (!lineupSet.has(player.id) && pickedCount(position) >= formationSlots[position])
                  "
                  @change="toggleLineup(player)"
                />
                <span class="mp-lineup-name">{{ player.name }}</span>
                <AppChip v-if="unavailabilityOf(player.id)" square size="xs" variant="danger">
                  {{ t(`manager.lineup.${unavailabilityOf(player.id)}`) }}
                </AppChip>
                <AppChip square size="xs">{{ player.power }}</AppChip>
              </label>
            </div>
          </div>
        </div>
      </template>
    </AppCard>

    <MatchScoreModal
      v-if="open && fixture"
      :home-team="homeTeam"
      :away-team="awayTeam"
      :result="fixture.result"
      :requires-winner="requiresWinner"
      :subtitle="stageLabel"
      :match-id="fixture.match.id"
      :leg="legOf(fixture)"
      :aggregate-offset="aggregateOffset"
      @save="save"
      @close="open = false"
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

.mp-fixture-card {
  border-color: color-mix(in srgb, var(--accent) 40%, var(--border));
}

.mp-icon {
  color: var(--accent);
}

.mp-stage {
  margin-bottom: var(--sp-3);
}

.mp-fixture-row {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-2) 0 var(--sp-4);
}

.mp-side {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  min-width: 0;
}
.mp-side--away {
  justify-content: flex-start;
}

.mp-vs {
  font-size: var(--fs-xs);
  color: var(--text-muted);
  flex-shrink: 0;
}

.mp-tactics {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

.mp-actions {
  display: flex;
  justify-content: flex-end;
}

.mp-fixture-hint {
  margin: var(--sp-2) 0 0;
  text-align: center;
  font-size: var(--fs-xs);
  color: var(--text-muted);
}

.mp-lineup-hint {
  margin: 0 0 var(--sp-2);
  font-size: var(--fs-sm);
  color: var(--text-muted);
}

.mp-pitch {
  margin-bottom: var(--sp-3);
}

.mp-lineup-groups {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  max-height: 50vh;
  overflow-y: auto;
}

.mp-lineup-group-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--sp-1) var(--sp-1);
  font-size: var(--fs-xs);
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
  border-bottom: 1px solid var(--border-light);
}
.mp-lineup-group-count {
  font-family: var(--font-mono);
  color: var(--accent);
}

.mp-lineup-empty {
  margin: 0;
  padding: var(--sp-2) var(--sp-1);
  font-size: var(--fs-sm);
  color: var(--text-muted);
}

.mp-lineup-list {
  display: flex;
  flex-direction: column;
}

.mp-lineup-row {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-1);
  border-bottom: 1px solid var(--border-light);
  cursor: pointer;
  min-height: var(--tap-min);
}
.mp-lineup-row:last-child {
  border-bottom: none;
}
.mp-lineup-row:hover {
  background: var(--border-light);
}
.mp-lineup-row--picked {
  color: var(--accent);
}
.mp-lineup-row--unavailable {
  cursor: default;
  opacity: 0.55;
}
.mp-lineup-row--unavailable .mp-lineup-name {
  text-decoration: line-through;
}

.mp-lineup-name {
  flex: 1;
  min-width: 0;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 600px) {
  .mp-fixture-row {
    gap: var(--sp-3);
  }
}
</style>
