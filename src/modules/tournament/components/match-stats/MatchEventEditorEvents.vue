<script setup lang="ts">
/**
 * Goals, own goals, penalties, missed penalties and cards: one row per event,
 * minute first. Every row names the side the event counts for — for an own
 * goal that is the side that *gains* the goal, so the player picker flips to
 * the other squad.
 */
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { Plus, Trash2 } from "@lucide/vue"
import { AppButton, AppButtonGroup, AppNumberInput, AppSelect } from "@/components/ui"
import { maxMinute, type DraftEvent } from "@/engine"
import { usePlayersStore } from "@/modules/players/store"
import type { Player } from "@/modules/players/types"
import type { Team } from "@/modules/teams/types"
import { EVENT_META } from "./eventMeta"
import { formatMinute } from "./matchTime"
import { fromSelect, playerOptions, toSelect } from "./playerOptions"

type Side = "home" | "away"

const props = defineProps<{
  homeTeam: Team | null | undefined
  awayTeam: Team | null | undefined
  homeSquad: Player[]
  awaySquad: Player[]
  extraTime: boolean
}>()

const events = defineModel<DraftEvent[]>({ required: true })

const { t } = useI18n()
const playersStore = usePlayersStore()

const TYPES: DraftEvent["type"][] = ["goal", "penGoal", "ownGoal", "penMiss", "yellow", "red"]

const typeOptions = computed(() =>
  TYPES.map((value) => ({ value, label: t(EVENT_META[value].labelKey) }))
)
const sideOptions = computed(() => [
  { value: "home", label: props.homeTeam?.abbr || props.homeTeam?.name || t("matchStats.home") },
  { value: "away", label: props.awayTeam?.abbr || props.awayTeam?.name || t("matchStats.away") },
])

const squadOf = (side: Side) => (side === "home" ? props.homeSquad : props.awaySquad)
const other = (side: Side): Side => (side === "home" ? "away" : "home")
/** An own goal is put through his own net, so the scorer comes from the opposite squad. */
const scorerSide = (e: DraftEvent): Side => (e.type === "ownGoal" ? other(e.side) : e.side)

const nameOf = (id: string) => playersStore.byId(id)?.name
const unknown = computed(() => t("matchStats.unknownPlayer"))
const limit = computed(() => maxMinute(props.extraTime))

const rows = computed(() =>
  events.value.map((e, index) => ({
    e,
    index,
    meta: EVENT_META[e.type],
    clock: formatMinute(e.minute, props.extraTime),
    players: playerOptions(squadOf(scorerSide(e)), [e.playerId], nameOf, unknown.value),
    assists: playerOptions(squadOf(e.side), [e.assistId], nameOf, unknown.value),
  }))
)

function patch(index: number, change: Partial<DraftEvent>) {
  const next: DraftEvent = { ...events.value[index], ...change }
  const scorers = new Set(squadOf(scorerSide(next)).map((p) => p.id))
  if (next.playerId && !scorers.has(next.playerId)) next.playerId = null
  if (next.type !== "goal") delete next.assistId
  else if (next.assistId && !squadOf(next.side).some((p) => p.id === next.assistId)) {
    next.assistId = null
  }
  events.value = events.value.map((e, i) => (i === index ? next : e))
}

function remove(index: number) {
  events.value = events.value.filter((_, i) => i !== index)
}

function add(side: Side) {
  const last = events.value.at(-1)?.minute ?? 0
  events.value = [
    ...events.value,
    { minute: Math.min(limit.value, Math.max(1, last)), type: "goal", side, playerId: null },
  ]
}
</script>

<template>
  <div class="me-root">
    <ol v-if="rows.length" class="me-list">
      <li
        v-for="row in rows"
        :key="row.index"
        class="me-row"
        :style="{ '--ev-color': row.meta.color }"
      >
        <div class="me-line">
          <AppNumberInput
            :model-value="row.e.minute"
            editable
            :min="1"
            :max="limit"
            size="sm"
            value-width="xs"
            @update:model-value="patch(row.index, { minute: $event })"
          />
          <span class="me-clock">{{ row.clock }}'</span>
          <AppSelect
            class="me-grow"
            size="sm"
            :options="typeOptions"
            :model-value="row.e.type"
            @update:model-value="patch(row.index, { type: $event })"
          />
          <AppButtonGroup
            size="xs"
            :options="sideOptions"
            :model-value="row.e.side"
            @update:model-value="patch(row.index, { side: $event as Side })"
          />
          <AppButton
            variant="text"
            size="xs"
            icon-only
            :aria-label="t('matchEditor.remove')"
            @click="remove(row.index)"
          >
            <Trash2 :size="14" />
          </AppButton>
        </div>
        <div class="me-line">
          <AppSelect
            class="me-grow"
            size="sm"
            searchable
            :options="row.players"
            :model-value="toSelect(row.e.playerId)"
            @update:model-value="patch(row.index, { playerId: fromSelect($event) })"
          />
          <AppSelect
            v-if="row.e.type === 'goal'"
            class="me-grow"
            size="sm"
            searchable
            :placeholder="t('matchEditor.assist')"
            :options="row.assists"
            :model-value="toSelect(row.e.assistId)"
            @update:model-value="patch(row.index, { assistId: fromSelect($event) })"
          />
        </div>
      </li>
    </ol>
    <p v-else class="me-empty">{{ t("matchStats.noEvents") }}</p>

    <div class="me-add">
      <AppButton size="sm" @click="add('home')">
        <Plus :size="14" />
        {{ sideOptions[0].label }}
      </AppButton>
      <AppButton size="sm" @click="add('away')">
        <Plus :size="14" />
        {{ sideOptions[1].label }}
      </AppButton>
    </div>
  </div>
</template>

<style scoped src="./match-stats.css"></style>
