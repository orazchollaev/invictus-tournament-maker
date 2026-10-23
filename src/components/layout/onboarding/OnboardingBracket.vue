<script setup lang="ts">
import { Trophy } from "@lucide/vue"

defineProps<{ active: boolean }>()

// [x, y, width, height] — four sides feed two semi-finals feed the final.
const FIRST = [12, 48, 84, 120].map((y) => [8, y, 56, 24])
const SECOND = [30, 102].map((y) => [102, y, 58, 24])
</script>

<template>
  <div class="bracket" :class="{ 'bracket--on': active }">
    <svg viewBox="0 0 260 150" class="bracket-svg" aria-hidden="true">
      <g class="lines">
        <path pathLength="1" d="M64 24 H83 V60 M64 60 H83 M83 42 H102" />
        <path pathLength="1" d="M64 96 H83 V132 M64 132 H83 M83 114 H102" />
        <path pathLength="1" d="M160 42 H178 V114 M160 114 H178 M178 78 H196" />
      </g>
      <g v-for="(round, r) in [FIRST, SECOND]" :key="r">
        <g
          v-for="([x, y, w, h], i) in round"
          :key="i"
          class="slot"
          :style="{ '--d': `${r * 0.45 + i * 0.09}s` }"
        >
          <rect :x="x" :y="y" :width="w" :height="h" rx="7" class="slot-box" />
          <circle :cx="x + 12" :cy="y + h / 2" r="5" class="slot-dot" />
          <rect :x="x + 22" :y="y + h / 2 - 2" :width="w - 32" height="4" rx="2" class="slot-bar" />
        </g>
      </g>
      <rect x="196" y="62" width="56" height="32" rx="9" class="final" />
    </svg>
    <Trophy :size="22" class="trophy" />
  </div>
</template>

<style scoped>
.bracket {
  position: relative;
  width: 100%;
  height: 100%;
}

.bracket-svg {
  width: 100%;
  height: 100%;
  overflow: visible;
}

.lines path {
  fill: none;
  stroke: var(--accent);
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
}

.slot {
  opacity: 0;
  transform-box: fill-box;
  transform-origin: center;
  transform: scale(0.85);
}
.slot-box {
  fill: var(--surface);
  stroke: var(--border);
  stroke-width: 1.5;
}
.slot-dot {
  fill: var(--accent);
  opacity: 0.8;
}
.slot-bar {
  fill: var(--border);
}

.final {
  fill: var(--gold-faint);
  stroke: var(--gold);
  stroke-width: 2;
  opacity: 0;
}

.trophy {
  position: absolute;
  left: 87.7%;
  top: 52%;
  translate: -50% -50%;
  color: var(--gold-text);
  opacity: 0;
  scale: 0.4;
}

.bracket--on .slot {
  animation: slot-in 0.4s var(--ease) var(--d) forwards;
}
.bracket--on .lines path {
  animation: draw 0.6s ease-out forwards;
}
.bracket--on .lines path:nth-child(1),
.bracket--on .lines path:nth-child(2) {
  animation-delay: 0.35s;
}
.bracket--on .lines path:nth-child(3) {
  animation-delay: 0.95s;
}
.bracket--on .final {
  animation: fade-in 0.4s ease 1.3s forwards;
}
.bracket--on .trophy {
  animation:
    pop 0.5s cubic-bezier(0.3, 1.5, 0.5, 1) 1.45s forwards,
    glow 2.4s ease-in-out 2s infinite;
}

@keyframes slot-in {
  to {
    opacity: 1;
    transform: scale(1);
  }
}
@keyframes draw {
  to {
    stroke-dashoffset: 0;
  }
}
@keyframes fade-in {
  to {
    opacity: 1;
  }
}
@keyframes pop {
  to {
    opacity: 1;
    scale: 1;
  }
}
@keyframes glow {
  50% {
    filter: drop-shadow(0 0 6px var(--gold-glow));
  }
}

@media (prefers-reduced-motion: reduce) {
  .bracket--on .slot,
  .bracket--on .lines path,
  .bracket--on .final,
  .bracket--on .trophy {
    animation-duration: 0.01s;
    animation-delay: 0s;
  }
}
</style>
