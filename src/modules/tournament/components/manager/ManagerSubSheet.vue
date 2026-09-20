<script setup lang="ts">
/**
 * A change: one man off, one on. Pick the shirt first, then who takes it —
 * the same order it happens on the touchline, and it keeps the bench list
 * short enough to read on a phone.
 */
import { computed, ref, shallowRef } from "vue"
import { useI18n } from "vue-i18n"
import { ArrowLeft } from "@lucide/vue"
import { AppButton, AppChip, AppEmptyState, AppSheet } from "@/components/ui"
import ManagerFatigueChip from "./ManagerFatigueChip.vue"
import type { LineupSlot } from "@/engine"
import type { Player } from "@/modules/players/types"
import { usePlayersStore } from "@/modules/players/store"

const props = defineProps<{
  pitch: LineupSlot[]
  bench: Player[]
  subsLeft: number
  /**
   * How tired each squad member is right now, 0-1 — live for whoever is on
   * the pitch, the fixed pre-match figure for anyone still on the bench (see
   * engine/liveMatch.ts's `liveFatigueByPlayer`).
   */
  fatigueByPlayer?: Map<string, number>
}>()
const emit = defineEmits<{ substitute: [outSlot: LineupSlot, inPlayer: Player]; close: [] }>()

const { t } = useI18n()
const players = usePlayersStore()
const sheet = ref<InstanceType<typeof AppSheet> | null>(null)

/**
 * A plain `ref` would wrap this in a reactive proxy the moment a slot is
 * assigned to it — and the engine's own `onPitch`/`applySubstitution` match
 * a slot by object identity (`===`) against the raw lineup array, so the
 * proxy would never be found there and every substitution would silently
 * fail. `shallowRef` keeps whatever is assigned exactly as it is.
 */
const outSlot = shallowRef<LineupSlot | null>(null)

/** The strongest replacements for the chosen shirt come first. */
const candidates = computed(() => {
  const slot = outSlot.value
  if (!slot) return []
  return [...props.bench].sort((a, b) => {
    const own = Number(b.position === slot.position) - Number(a.position === slot.position)
    return own !== 0 ? own : b.power - a.power
  })
})

function nameOf(playerId: string | null): string {
  if (!playerId) return t("manager.sub.unknownPlayer")
  return players.byId(playerId)?.name ?? t("manager.sub.unknownPlayer")
}

function choose(player: Player) {
  if (!outSlot.value) return
  emit("substitute", outSlot.value, player)
  sheet.value?.close()
}
</script>

<template>
  <AppSheet ref="sheet" :layer="30" :title="t('manager.sub.title')" @close="emit('close')">
    <div class="ms-body">
      <div class="ms-head">
        <AppButton v-if="outSlot" variant="text" size="xs" @click="outSlot = null">
          <ArrowLeft :size="14" />
          {{ t("manager.sub.back") }}
        </AppButton>
        <span class="ms-step">
          {{ outSlot ? t("manager.sub.pickIn") : t("manager.sub.pickOut") }}
        </span>
        <AppChip square size="xs">{{ t("manager.sub.left", { count: subsLeft }) }}</AppChip>
      </div>

      <AppEmptyState v-if="subsLeft <= 0" :title="t('manager.sub.noneLeft')" />

      <div v-else-if="!outSlot" class="ms-list">
        <button v-for="(slot, i) in pitch" :key="i" class="ms-row" @click="outSlot = slot">
          <AppChip square size="xs">{{ slot.position }}</AppChip>
          <span class="ms-name">{{ nameOf(slot.playerId) }}</span>
          <ManagerFatigueChip :fatigue="fatigueByPlayer?.get(slot.playerId ?? '')" />
          <AppChip square size="xs">{{ slot.power }}</AppChip>
        </button>
      </div>

      <div v-else-if="candidates.length" class="ms-list">
        <button
          v-for="player in candidates"
          :key="player.id"
          class="ms-row"
          @click="choose(player)"
        >
          <AppChip square size="xs">{{ player.position }}</AppChip>
          <span class="ms-name">{{ player.name }}</span>
          <ManagerFatigueChip :fatigue="fatigueByPlayer?.get(player.id)" />
          <AppChip square size="xs">{{ player.power }}</AppChip>
        </button>
      </div>

      <AppEmptyState v-else :title="t('manager.sub.emptyBench')" />
    </div>
  </AppSheet>
</template>

<style scoped>
.ms-body {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  min-width: 0;
  padding: var(--sp-3);
}

.ms-head {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}
.ms-step {
  flex: 1;
  font-size: var(--fs-sm);
  color: var(--text-muted);
}

.ms-list {
  display: flex;
  flex-direction: column;
  max-height: 52vh;
  overflow-y: auto;
}

.ms-row {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  width: 100%;
  padding: var(--sp-2) var(--sp-1);
  border: none;
  border-bottom: 1px solid var(--border-light);
  background: none;
  color: inherit;
  text-align: start;
  font-size: var(--fs-base);
  cursor: pointer;
  min-height: var(--tap-min);
}
.ms-row:last-child {
  border-bottom: none;
}
.ms-row:hover {
  background: var(--border-light);
}

.ms-name {
  flex: 1;
  min-width: 0;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
