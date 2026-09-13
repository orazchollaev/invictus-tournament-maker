<script setup lang="ts">
/**
 * A small formation card: eleven slots laid out the way they'll actually
 * stand on the pitch, filled in as the user picks below. Tapping a filled
 * shirt drops that player; tapping an empty one jumps to the position that
 * needs filling — the same two actions the checkbox list offers, just read
 * at a glance instead of counted row by row.
 */
import type { Player, PlayerPosition } from "@/modules/players/types"

const props = defineProps<{
  slots: Record<PlayerPosition, number>
  squadByPosition: Map<PlayerPosition, Player[]>
  lineupIds: string[]
}>()

const emit = defineEmits<{ focus: [position: PlayerPosition]; remove: [player: Player] }>()

/** Attack-to-goalkeeper, the way a formation card reads top to bottom. */
const ROWS: PlayerPosition[] = ["FWD", "MID", "DEF", "GK"]

function pickedFor(position: PlayerPosition): Player[] {
  const lineup = props.lineupIds
  return (props.squadByPosition.get(position) ?? [])
    .filter((p) => lineup.includes(p.id))
    .sort((a, b) => lineup.indexOf(a.id) - lineup.indexOf(b.id))
}

function emptyCount(position: PlayerPosition): number {
  const total = props.slots[position] ?? 0
  return Math.max(0, total - pickedFor(position).length)
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  const letters = parts.length > 1 ? [parts[0][0], parts[parts.length - 1][0]] : [parts[0]?.[0]]
  return letters.filter(Boolean).join("").toUpperCase()
}
</script>

<template>
  <div class="pitch">
    <div class="pitch-stripes" aria-hidden="true" />
    <div class="pitch-circle" aria-hidden="true" />
    <div v-for="position in ROWS" :key="position" class="pitch-row">
      <button
        v-for="player in pickedFor(position)"
        :key="player.id"
        type="button"
        class="pitch-shirt pitch-shirt--filled"
        :title="player.name"
        @click="emit('remove', player)"
      >
        <span class="pitch-shirt-initials">{{ initials(player.name) }}</span>
      </button>
      <button
        v-for="n in emptyCount(position)"
        :key="`${position}-${n}`"
        type="button"
        class="pitch-shirt pitch-shirt--empty"
        @click="emit('focus', position)"
      >
        +
      </button>
    </div>
  </div>
</template>

<style scoped>
.pitch {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: var(--sp-2);
  padding: var(--sp-4) var(--sp-2);
  border-radius: var(--radius-lg);
  background: linear-gradient(180deg, #1f7a3f, #14602f);
  overflow: hidden;
}
.pitch-stripes {
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.05) 0,
    rgba(255, 255, 255, 0.05) 10%,
    transparent 10%,
    transparent 20%
  );
}
.pitch-circle {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 76px;
  height: 76px;
  border: 2px solid rgba(255, 255, 255, 0.28);
  border-radius: 50%;
  transform: translate(-50%, -50%);
}

.pitch-row {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-3);
  flex-wrap: wrap;
}

.pitch-shirt {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  cursor: pointer;
  transition:
    transform var(--dur-fast) var(--ease),
    background var(--dur-fast) var(--ease);
}
.pitch-shirt:active {
  transform: scale(0.92);
}
.pitch-shirt--empty {
  border: 2px dashed rgba(255, 255, 255, 0.55);
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.75);
  font-size: var(--fs-base);
  font-weight: 700;
}
.pitch-shirt--empty:hover {
  background: rgba(255, 255, 255, 0.16);
}
.pitch-shirt--filled {
  border: 2px solid rgba(255, 255, 255, 0.85);
  background: var(--accent);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
}
.pitch-shirt--filled:hover {
  filter: brightness(1.08);
}
.pitch-shirt-initials {
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  font-weight: 700;
  color: var(--on-accent);
}

@media (prefers-reduced-motion: reduce) {
  .pitch-shirt {
    transition: none;
  }
}
</style>
