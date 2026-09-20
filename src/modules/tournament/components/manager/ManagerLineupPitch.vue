<script setup lang="ts">
/**
 * The formation card itself, read top to bottom the way it plays. Every
 * shirt is one formation slot: tapping it — filled or empty — is the only
 * way to set a starting XI now, so what you see here is exactly what
 * `manager.lineup` holds, never a separate list that can drift from it.
 */
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { PlayerAvatar } from "@/modules/players/components"
import type { Player, PlayerPosition } from "@/modules/players/types"
import type { ManagerLineupSlot } from "@/modules/tournament/types"
import { fatigueLevel, staminaPercent } from "@/modules/tournament/utils/managerFatigue"

const props = defineProps<{
  slots: ManagerLineupSlot[]
  playerById: Map<string, Player>
  /** Shirt colour — the managed side's own team colour. */
  teamColor: string
  /** Slots whose occupant is hurt or serving a ban — flagged, not hidden. */
  unavailableSlotIndexes?: Set<number>
  /** How tired each slot's occupant is, 0-1 (see engine/fatigue.ts). */
  fatigueSlotValues?: Map<number, number>
}>()

const emit = defineEmits<{ tapSlot: [index: number] }>()

const { t } = useI18n()

function slotFatigueLevel(index: number) {
  return fatigueLevel(props.fatigueSlotValues?.get(index))
}

function slotStaminaPercent(index: number): number {
  return staminaPercent(props.fatigueSlotValues?.get(index))
}

/** A coloured ring around the shirt, not a number on top of it — the jersey
 *  number underneath stays legible, and the exact percentage lives in the
 *  label below instead of overlapping the avatar. */
function shirtStaminaClass(index: number): string | undefined {
  const level = slotFatigueLevel(index)
  return level ? `pitch-shirt--stamina-${level}` : undefined
}

/** Attack-to-goalkeeper, the way a formation card reads top to bottom. */
const ROWS: PlayerPosition[] = ["FWD", "MID", "DEF", "GK"]

const rows = computed(() => {
  const byPosition = new Map<PlayerPosition, number[]>()
  props.slots.forEach((slot, index) => {
    const list = byPosition.get(slot.position) ?? []
    list.push(index)
    byPosition.set(slot.position, list)
  })
  return ROWS.map((position) => ({ position, indexes: byPosition.get(position) ?? [] }))
})

function playerAt(index: number): Player | null {
  const id = props.slots[index]?.playerId
  return id ? (props.playerById.get(id) ?? null) : null
}

/** First name only — a full name wraps or clips at shirt width. */
function shortName(name: string): string {
  return name.trim().split(/\s+/).pop() ?? name
}
</script>

<template>
  <div class="pitch">
    <div class="pitch-stripes" aria-hidden="true" />
    <div class="pitch-halfway" aria-hidden="true" />
    <div class="pitch-circle" aria-hidden="true" />
    <div class="pitch-box pitch-box--penalty" aria-hidden="true" />
    <div class="pitch-box pitch-box--goal" aria-hidden="true" />
    <div v-for="row in rows" :key="row.position" class="pitch-row">
      <button
        v-for="index in row.indexes"
        :key="index"
        type="button"
        class="pitch-slot"
        :class="{ 'pitch-slot--unavailable': unavailableSlotIndexes?.has(index) }"
        :title="playerAt(index)?.name"
        @click="emit('tapSlot', index)"
      >
        <span class="pitch-shirt-wrap">
          <PlayerAvatar
            v-if="playerAt(index)"
            class="pitch-shirt"
            :class="shirtStaminaClass(index)"
            :name="playerAt(index)!.name"
            :number="playerAt(index)!.number ?? null"
            :color="teamColor"
            :size="36"
          />
          <span v-else class="pitch-shirt pitch-shirt--empty">+</span>
        </span>
        <span class="pitch-slot-label">
          <span class="pitch-slot-name">
            {{ playerAt(index) ? shortName(playerAt(index)!.name) : "" }}
          </span>
          <span v-if="playerAt(index)" class="pitch-slot-stats">
            <span class="pitch-slot-power" :title="t('players.form.power')">
              {{ playerAt(index)!.power }}
            </span>
            <span v-if="slotFatigueLevel(index)" class="pitch-slot-dot" aria-hidden="true">·</span>
            <span
              v-if="slotFatigueLevel(index)"
              class="pitch-slot-stamina"
              :class="`pitch-slot-stamina--${slotFatigueLevel(index)}`"
              :title="t(`manager.lineup.fatigue.${slotFatigueLevel(index)}`)"
            >
              {{ slotStaminaPercent(index) }}%
            </span>
          </span>
        </span>
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
  gap: var(--sp-3);
  padding: var(--sp-4) var(--sp-2);
  border: 2px solid rgba(255, 255, 255, 0.35);
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
.pitch-halfway {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 2px;
  background: rgba(255, 255, 255, 0.35);
  transform: translateY(-50%);
}
.pitch-circle {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 76px;
  height: 76px;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-radius: 50%;
  transform: translate(-50%, -50%);
}
.pitch-box {
  position: absolute;
  left: 50%;
  bottom: 0;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-bottom: none;
  transform: translateX(-50%);
}
.pitch-box--penalty {
  width: 62%;
  height: 15%;
}
.pitch-box--goal {
  width: 30%;
  height: 6%;
}

.pitch-row {
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: var(--sp-2);
  flex-wrap: wrap;
}

.pitch-slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  width: 56px;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
}
.pitch-slot:active .pitch-shirt {
  transform: scale(0.92);
}

.pitch-shirt-wrap {
  position: relative;
  display: inline-flex;
}

.pitch-shirt {
  border-radius: var(--radius-full, 999px);
  transition:
    transform var(--dur-fast) var(--ease),
    filter var(--dur-fast) var(--ease),
    box-shadow var(--dur-fast) var(--ease);
}
.pitch-slot:hover .pitch-shirt {
  filter: brightness(1.1);
}
.pitch-shirt--empty {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px dashed rgba(255, 255, 255, 0.55);
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.75);
  font-size: var(--fs-base);
  font-weight: 700;
}

/* Stamina reads as a coloured ring around the shirt, not a number on top of
   it — the jersey number underneath stays legible, and the exact percentage
   lives in the label below instead. */
.pitch-shirt--stamina-fresh {
  box-shadow: 0 0 0 2px var(--success);
}
.pitch-shirt--stamina-tired {
  box-shadow: 0 0 0 2px var(--warning);
}
.pitch-shirt--stamina-exhausted {
  box-shadow: 0 0 0 2px var(--danger);
}
/* Hurt or suspended always wins over a stamina ring — a bigger problem than
   being tired, and the two rings would otherwise be indistinguishable. */
.pitch-slot--unavailable .pitch-shirt {
  box-shadow: 0 0 0 2px var(--danger);
}

.pitch-slot-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 100%;
  line-height: 1.25;
}

.pitch-slot-name {
  max-width: 100%;
  font-size: 10px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.92);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.55);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Power and stamina, side by side under the name — each set off by its own
   colour rather than a label, so neither is mistaken for the other or for
   the name above them. */
.pitch-slot-stats {
  display: flex;
  align-items: center;
  gap: 3px;
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 700;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.55);
}
.pitch-slot-power {
  color: rgba(255, 224, 130, 0.95);
}
.pitch-slot-dot {
  color: rgba(255, 255, 255, 0.4);
  font-weight: 400;
}
.pitch-slot-stamina--fresh {
  color: var(--success);
}
.pitch-slot-stamina--tired {
  color: var(--warning);
}
.pitch-slot-stamina--exhausted {
  color: var(--danger);
}

@media (prefers-reduced-motion: reduce) {
  .pitch-shirt {
    transition: none;
  }
}
</style>
