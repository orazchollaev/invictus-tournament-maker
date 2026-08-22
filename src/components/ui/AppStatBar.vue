<script setup lang="ts">
/**
 * Two-sided comparison bar: one label, two values, one track split
 * between them. Used for the match comparison rows (possession, shots,
 * corners) and anywhere else two teams need weighing against each other.
 *
 * The track fills from the outside in, so the meeting point *is* the
 * ratio — the reader compares positions, not lengths.
 */
import { computed } from "vue"

const props = withDefaults(
  defineProps<{
    label: string
    home: number
    away: number
    /** Appended to both values, e.g. "%". */
    unit?: string
    homeColor?: string
    awayColor?: string
  }>(),
  { unit: "" }
)

const homeShare = computed(() => {
  const total = props.home + props.away
  if (total <= 0) return 50
  return (props.home / total) * 100
})

const leads = computed<"home" | "away" | "level">(() => {
  if (props.home === props.away) return "level"
  return props.home > props.away ? "home" : "away"
})
</script>

<template>
  <div class="stat-bar">
    <div class="stat-head">
      <span class="stat-value" :class="{ 'stat-value--lead': leads === 'home' }">
        {{ home }}{{ unit }}
      </span>
      <span class="stat-label">{{ label }}</span>
      <span class="stat-value" :class="{ 'stat-value--lead': leads === 'away' }">
        {{ away }}{{ unit }}
      </span>
    </div>
    <div class="stat-track">
      <span
        class="stat-fill stat-fill--home"
        :style="{ width: `${homeShare}%`, '--fill': homeColor ?? 'var(--accent)' }"
      />
      <span
        class="stat-fill stat-fill--away"
        :style="{ width: `${100 - homeShare}%`, '--fill': awayColor ?? 'var(--text-muted)' }"
      />
    </div>
  </div>
</template>

<style scoped>
.stat-bar {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
}

.stat-head {
  display: grid;
  grid-template-columns: 3rem 1fr 3rem;
  align-items: baseline;
  gap: var(--sp-2);
}

.stat-value {
  font-family: var(--font-mono);
  font-size: var(--fs-md);
  font-weight: 600;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}
.stat-value:last-child {
  text-align: end;
}
.stat-value--lead {
  color: var(--text);
}

.stat-label {
  text-align: center;
  font-family: var(--font-ui);
  font-size: var(--fs-xs);
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.stat-track {
  display: flex;
  gap: 2px;
  height: 6px;
}

.stat-fill {
  background: var(--fill);
  transition: width var(--dur) var(--ease);
}
.stat-fill--home {
  border-radius: var(--radius-pill) 0 0 var(--radius-pill);
}
.stat-fill--away {
  border-radius: 0 var(--radius-pill) var(--radius-pill) 0;
  opacity: 0.75;
}

@media (prefers-reduced-motion: reduce) {
  .stat-fill {
    transition: none;
  }
}
</style>
