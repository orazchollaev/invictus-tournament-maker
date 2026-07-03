<script setup lang="ts">
import { computed } from "vue"
import type { Team } from "@/modules/teams/types"
import type { DrawStep } from "@/engine"
import { useTeamLookup } from "@/composables/useTeamLookup"
import TeamBadge from "@/modules/teams/components/TeamBadge.vue"

const props = defineProps<{
  revealed: DrawStep[]
  current: DrawStep | null
  sequence: DrawStep[]
  teams: Team[]
}>()

const { teamById } = useTeamLookup(() => props.teams)

// Full board skeleton, built once from the whole sequence so the layout never
// reflows: every slot and every row exists from the start; teams only fill in.
const slots = computed(() => {
  const order: string[] = []
  const map = new Map<string, DrawStep[]>()
  for (const step of props.sequence) {
    if (!map.has(step.targetLabel)) {
      map.set(step.targetLabel, [])
      order.push(step.targetLabel)
    }
    map.get(step.targetLabel)!.push(step)
  }
  return order.map((label) => ({ label, steps: map.get(label)! }))
})

const revealedIds = computed(() => new Set(props.revealed.map((r) => r.teamId)))
function isRevealed(step: DrawStep) {
  return revealedIds.value.has(step.teamId)
}
</script>

<template>
  <div class="ds-wrap">
    <!-- Folded-paper reveal -->
    <div class="ds-stage">
      <Transition name="ds-capsule" appear :duration="{ enter: 760, leave: 260 }">
        <div v-if="current" :key="current.teamId" class="ds-capsule">
          <div class="ds-paper">
            <TeamBadge :team="teamById(current.teamId)" :size="24" class="ds-paper-face" />
          </div>
          <div class="ds-target">{{ current.targetLabel }}</div>
        </div>
      </Transition>
    </div>

    <!-- Fixed board skeleton -->
    <div class="ds-board">
      <div v-for="slot in slots" :key="slot.label" class="ds-slot">
        <div class="ds-slot-label">{{ slot.label }}</div>
        <div class="ds-slot-rows">
          <div v-for="(step, i) in slot.steps" :key="i" class="ds-row">
            <Transition name="ds-pop">
              <TeamBadge
                v-if="isRevealed(step)"
                :team="teamById(step.teamId)"
                :size="12"
                class="ds-slot-team"
              />
              <span v-else class="ds-row-empty" />
            </Transition>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ds-wrap {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* ── Folded-paper stage ── */
.ds-stage {
  height: 104px;
  display: flex;
  align-items: center;
  justify-content: center;
  perspective: 900px;
}
.ds-capsule {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  transform-style: preserve-3d;
}
.ds-paper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 150px;
  padding: 12px 22px;
  transform-style: preserve-3d;
  background: linear-gradient(to bottom, #ffffff 0%, #f3f4f8 49%, #e7e9f0 51%, #f6f7fa 100%);
  color: #1a2234;
  border: 1px solid #c2c7d4;
  border-radius: 3px;
  box-shadow:
    0 8px 22px rgba(0, 0, 0, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.7);
  transform-origin: top center;
}
.ds-paper-face {
  gap: 9px;
}
.ds-paper-face :deep(.name) {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.01em;
  white-space: nowrap;
}
.ds-target {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--accent);
}

/* The paper drops in folded (edge-on at the top crease) then unfolds flat. */
@keyframes ds-unfold {
  0% {
    opacity: 0;
    transform: translateY(-16px) rotateX(-88deg);
  }
  40% {
    opacity: 1;
    transform: translateY(0) rotateX(-88deg);
  }
  75% {
    transform: rotateX(12deg);
  }
  100% {
    transform: rotateX(0deg);
  }
}
/* Name + dot stay hidden until the paper is mostly open, then pop in. */
@keyframes ds-name-in {
  0%,
  55% {
    opacity: 0;
    transform: scale(0.8);
  }
  80% {
    opacity: 1;
    transform: scale(1.08);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}
.ds-capsule-enter-active .ds-paper {
  animation: ds-unfold 0.66s cubic-bezier(0.34, 1.1, 0.64, 1) both;
}
.ds-capsule-enter-active .ds-paper-face {
  animation: ds-name-in 0.66s ease both;
}
.ds-capsule-leave-active .ds-paper {
  transition:
    opacity 0.24s ease,
    transform 0.24s ease;
}
.ds-capsule-leave-to .ds-paper {
  opacity: 0;
  transform: translateY(12px) scale(0.9);
}

/* ── Fixed board ── */
.ds-board {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 8px;
  height: 46vh;
  overflow-y: auto;
  align-content: start;
}
.ds-slot {
  border: 1px solid var(--border-light);
  background: var(--bg);
  border-radius: var(--radius);
}
.ds-slot-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
  padding: 5px 8px;
  border-bottom: 1px solid var(--border-light);
  border-left: 3px solid var(--accent);
}
.ds-slot-rows {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 6px;
}
.ds-row {
  position: relative;
  height: 20px;
}
.ds-row-empty {
  display: block;
  height: 100%;
  border-radius: 3px;
  background: repeating-linear-gradient(
    -45deg,
    transparent,
    transparent 4px,
    color-mix(in srgb, var(--border-light) 55%, transparent) 4px,
    color-mix(in srgb, var(--border-light) 55%, transparent) 5px
  );
  opacity: 0.5;
}
.ds-slot-team {
  position: absolute;
  inset: 0;
  gap: 6px;
}

/* team drops into its (already-sized) slot — no layout shift */
.ds-pop-enter-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}
.ds-pop-enter-from {
  opacity: 0;
  transform: translateY(-7px) scale(0.92);
}

@media (max-width: 640px) {
  .ds-board {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    height: 60vh;
  }
}
</style>
