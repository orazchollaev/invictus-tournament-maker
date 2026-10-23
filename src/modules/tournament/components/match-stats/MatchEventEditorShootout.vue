<script setup lang="ts">
/** The shootout kick by kick: who stepped up and whether it went in. */
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { Plus, Trash2 } from "@lucide/vue"
import { AppButton, AppButtonGroup, AppSelect, AppToggle } from "@/components/ui"
import { shootoutTally } from "@/engine"
import { usePlayersStore } from "@/modules/players/store"
import type { Player } from "@/modules/players/types"
import type { Team } from "@/modules/teams/types"
import type { ShootoutKick } from "@/modules/tournament/types"
import { fromSelect, playerOptions, toSelect } from "./playerOptions"

type Side = "home" | "away"

const props = defineProps<{
  homeTeam: Team | null | undefined
  awayTeam: Team | null | undefined
  homeSquad: Player[]
  awaySquad: Player[]
}>()

const kicks = defineModel<ShootoutKick[]>({ required: true })

const { t } = useI18n()
const playersStore = usePlayersStore()

const sideOptions = computed(() => [
  { value: "home", label: props.homeTeam?.abbr || props.homeTeam?.name || t("matchStats.home") },
  { value: "away", label: props.awayTeam?.abbr || props.awayTeam?.name || t("matchStats.away") },
])

const nameOf = (id: string) => playersStore.byId(id)?.name
const unknown = computed(() => t("matchStats.unknownPlayer"))
const tally = computed(() => shootoutTally(kicks.value))

const rows = computed(() =>
  kicks.value.map((k, index) => ({
    k,
    index,
    players: playerOptions(
      k.side === "home" ? props.homeSquad : props.awaySquad,
      [k.playerId],
      nameOf,
      unknown.value
    ),
  }))
)

function patch(index: number, change: Partial<ShootoutKick>) {
  const next: ShootoutKick = { ...kicks.value[index], ...change }
  if (change.side && change.side !== kicks.value[index].side) next.playerId = null
  kicks.value = kicks.value.map((k, i) => (i === index ? next : k))
}

function remove(index: number) {
  kicks.value = kicks.value.filter((_, i) => i !== index).map((k, i) => ({ ...k, order: i + 1 }))
}

function add(side: Side) {
  kicks.value = [
    ...kicks.value,
    { order: kicks.value.length + 1, side, playerId: null, scored: true },
  ]
}
</script>

<template>
  <div class="me-root">
    <p class="me-hint">
      {{ t("matchEditor.shootoutTally", { home: tally.home, away: tally.away }) }}
    </p>

    <ol v-if="rows.length" class="me-list">
      <li
        v-for="row in rows"
        :key="row.index"
        class="me-row"
        :style="{ '--ev-color': row.k.scored ? 'var(--accent)' : 'var(--danger)' }"
      >
        <div class="me-line">
          <span class="me-clock">#{{ row.index + 1 }}</span>
          <AppButtonGroup
            size="xs"
            :options="sideOptions"
            :model-value="row.k.side"
            @update:model-value="patch(row.index, { side: $event as Side })"
          />
          <AppSelect
            class="me-grow"
            size="sm"
            searchable
            :options="row.players"
            :model-value="toSelect(row.k.playerId)"
            @update:model-value="patch(row.index, { playerId: fromSelect($event) })"
          />
          <AppToggle
            :model-value="row.k.scored"
            :aria-label="t('matchEditor.scored')"
            @update:model-value="patch(row.index, { scored: $event })"
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
      </li>
    </ol>
    <p v-else class="me-empty">{{ t("matchEditor.noKicks") }}</p>

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
