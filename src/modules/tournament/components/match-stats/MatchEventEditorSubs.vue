<script setup lang="ts">
/** Substitutions: who went off, who came on, when, and whether it was a knock. */
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { Plus, Trash2 } from "@lucide/vue"
import { AppButton, AppButtonGroup, AppNumberInput, AppSelect } from "@/components/ui"
import { maxMinute } from "@/engine"
import { usePlayersStore } from "@/modules/players/store"
import type { Player } from "@/modules/players/types"
import type { Team } from "@/modules/teams/types"
import type { Substitution } from "@/modules/tournament/types"
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

const subs = defineModel<Substitution[]>({ required: true })

const { t } = useI18n()
const playersStore = usePlayersStore()

const sideOptions = computed(() => [
  { value: "home", label: props.homeTeam?.abbr || props.homeTeam?.name || t("matchStats.home") },
  { value: "away", label: props.awayTeam?.abbr || props.awayTeam?.name || t("matchStats.away") },
])
const reasonOptions = computed(() => [
  { value: "tactical", label: t("matchEditor.tactical") },
  { value: "injury", label: t("matchEditor.injury") },
])

const squadOf = (side: Side) => (side === "home" ? props.homeSquad : props.awaySquad)
const nameOf = (id: string) => playersStore.byId(id)?.name
const unknown = computed(() => t("matchStats.unknownPlayer"))
const limit = computed(() => maxMinute(props.extraTime))

const rows = computed(() =>
  subs.value.map((s, index) => {
    const squad = squadOf(s.side)
    return {
      s,
      index,
      clock: formatMinute(s.minute, props.extraTime),
      off: playerOptions(squad, [s.outPlayerId], nameOf, unknown.value),
      on: playerOptions(squad, [s.inPlayerId], nameOf, unknown.value),
    }
  })
)

function patch(index: number, change: Partial<Substitution>) {
  const next: Substitution = { ...subs.value[index], ...change }
  if (change.side && change.side !== subs.value[index].side) {
    next.outPlayerId = null
    next.inPlayerId = null
  }
  if (next.reason !== "injury") delete next.injuryMatches
  else next.injuryMatches ??= 1
  const position = next.outPlayerId ? playersStore.byId(next.outPlayerId)?.position : undefined
  if (position) next.position = position
  subs.value = subs.value.map((s, i) => (i === index ? next : s))
}

function remove(index: number) {
  subs.value = subs.value.filter((_, i) => i !== index)
}

function add(side: Side) {
  const last = subs.value.at(-1)?.minute ?? 60
  subs.value = [
    ...subs.value,
    {
      minute: Math.min(limit.value, last),
      side,
      outPlayerId: null,
      inPlayerId: null,
      position: "MID",
      reason: "tactical",
    },
  ]
}
</script>

<template>
  <div class="me-root">
    <ol v-if="rows.length" class="me-list">
      <li v-for="row in rows" :key="row.index" class="me-row">
        <div class="me-line">
          <AppNumberInput
            :model-value="row.s.minute"
            editable
            :min="1"
            :max="limit"
            size="sm"
            value-width="xs"
            @update:model-value="patch(row.index, { minute: $event })"
          />
          <span class="me-clock">{{ row.clock }}'</span>
          <AppButtonGroup
            size="xs"
            :options="sideOptions"
            :model-value="row.s.side"
            @update:model-value="patch(row.index, { side: $event as Side })"
          />
          <AppButtonGroup
            size="xs"
            :options="reasonOptions"
            :model-value="row.s.reason ?? 'tactical'"
            @update:model-value="patch(row.index, { reason: $event as 'tactical' | 'injury' })"
          />
          <AppNumberInput
            v-if="row.s.reason === 'injury'"
            :model-value="row.s.injuryMatches ?? 1"
            editable
            :min="1"
            :max="15"
            size="sm"
            value-width="xs"
            @update:model-value="patch(row.index, { injuryMatches: $event })"
          />
          <span class="me-spacer" />
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
            :placeholder="t('matchEditor.playerOff')"
            :options="row.off"
            :model-value="toSelect(row.s.outPlayerId)"
            @update:model-value="patch(row.index, { outPlayerId: fromSelect($event) })"
          />
          <AppSelect
            class="me-grow"
            size="sm"
            searchable
            :placeholder="t('matchEditor.playerOn')"
            :options="row.on"
            :model-value="toSelect(row.s.inPlayerId)"
            @update:model-value="patch(row.index, { inPlayerId: fromSelect($event) })"
          />
        </div>
      </li>
    </ol>
    <p v-else class="me-empty">{{ t("matchEditor.noSubs") }}</p>

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
