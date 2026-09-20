<script setup lang="ts">
/**
 * Fill one pitch slot. A shirt's own position comes first, strongest first;
 * anyone else fit enough to cover it (the same penalty `buildLineup` charges
 * at kickoff) follows below, clearly marked — never hidden, since a thin
 * squad may have nobody else.
 */
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import { AppButton, AppChip, AppEmptyState, AppSearchInput, AppSheet } from "@/components/ui"
import ManagerFatigueChip from "./ManagerFatigueChip.vue"
import type { Player, PlayerPosition } from "@/modules/players/types"

const props = defineProps<{
  position: PlayerPosition
  /** Eligible players: unavailable and slotted-elsewhere ones already excluded. */
  squad: Player[]
  currentPlayerId: string | null
  /** How tired each candidate is, 0-1 (see engine/fatigue.ts). */
  fatigueByPlayer?: Map<string, number>
}>()
const emit = defineEmits<{ select: [playerId: string]; clear: []; close: [] }>()

const { t } = useI18n()
const sheet = ref<InstanceType<typeof AppSheet> | null>(null)
const search = ref("")

const candidates = computed(() => {
  const q = search.value.trim().toLowerCase()
  const list = q ? props.squad.filter((p) => p.name.toLowerCase().includes(q)) : props.squad
  return [...list].sort((a, b) => {
    const own = Number(b.position === props.position) - Number(a.position === props.position)
    return own !== 0 ? own : b.power - a.power
  })
})

function choose(player: Player) {
  emit("select", player.id)
  sheet.value?.close()
}

function clear() {
  emit("clear")
  sheet.value?.close()
}
</script>

<template>
  <AppSheet ref="sheet" :layer="30" :title="t('manager.lineup.pickTitle')" @close="emit('close')">
    <div class="ls-body">
      <div class="ls-head">
        <AppChip square size="xs">{{ t(`players.positions.${position}`) }}</AppChip>
        <AppButton v-if="currentPlayerId" variant="text" size="xs" @click="clear">
          {{ t("manager.lineup.clear") }}
        </AppButton>
      </div>

      <AppSearchInput
        v-model="search"
        size="sm"
        :placeholder="t('manager.lineup.searchPlaceholder')"
      />

      <div v-if="candidates.length" class="ls-list">
        <button
          v-for="player in candidates"
          :key="player.id"
          class="ls-row"
          :class="{ 'ls-row--current': player.id === currentPlayerId }"
          @click="choose(player)"
        >
          <AppChip square size="xs">{{ player.position }}</AppChip>
          <span class="ls-name">{{ player.name }}</span>
          <AppChip v-if="player.position !== position" square size="xs" variant="danger">
            {{ t("manager.lineup.outOfPosition") }}
          </AppChip>
          <ManagerFatigueChip :fatigue="fatigueByPlayer?.get(player.id)" />
          <AppChip square size="xs">{{ player.power }}</AppChip>
        </button>
      </div>
      <AppEmptyState v-else :title="t('manager.lineup.noneForPosition')" />
    </div>
  </AppSheet>
</template>

<style scoped>
.ls-body {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  min-width: 0;
  padding: var(--sp-3);
}

.ls-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-2);
}

.ls-list {
  display: flex;
  flex-direction: column;
  max-height: 52vh;
  overflow-y: auto;
}

.ls-row {
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
.ls-row:last-child {
  border-bottom: none;
}
.ls-row:hover {
  background: var(--border-light);
}
.ls-row--current {
  color: var(--accent);
}

.ls-name {
  flex: 1;
  min-width: 0;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
