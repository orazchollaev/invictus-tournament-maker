<script setup lang="ts">
import { computed } from "vue"

const props = withDefaults(
  defineProps<{
    label: string
    a: number
    b: number
    /** Appended to both values, e.g. "%". */
    suffix?: string
    colorA: string
    colorB: string
  }>(),
  { suffix: "" }
)

// Both zero reads as an even split rather than an empty bar.
const shareA = computed(() => {
  const total = props.a + props.b
  return total > 0 ? (props.a / total) * 100 : 50
})
const leader = computed(() => (props.a === props.b ? null : props.a > props.b ? "a" : "b"))
</script>

<template>
  <div class="stat-row">
    <span class="value" :class="{ 'value--lead': leader === 'a' }">{{ a }}{{ suffix }}</span>
    <div class="middle">
      <span class="label">{{ label }}</span>
      <div class="bar">
        <span class="bar-a" :style="{ width: shareA + '%', background: colorA }" />
        <span class="bar-b" :style="{ background: colorB }" />
      </div>
    </div>
    <span class="value value--end" :class="{ 'value--lead': leader === 'b' }">
      {{ b }}{{ suffix }}
    </span>
  </div>
</template>

<style scoped>
.stat-row {
  display: grid;
  grid-template-columns: 56px 1fr 56px;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-2) var(--sp-3);
}

.value {
  font-family: var(--font);
  font-size: var(--fs-lg);
  color: var(--text-muted);
}
.value--end {
  text-align: end;
}
.value--lead {
  color: var(--text);
}

.middle {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
  min-width: 0;
}

.label {
  text-align: center;
  font-size: var(--fs-xs);
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.bar {
  display: flex;
  height: 6px;
  border-radius: 3px;
  overflow: hidden;
  background: var(--border-light);
  gap: 2px;
}
.bar-a {
  transition: width 0.3s ease;
}
.bar-b {
  flex: 1;
}
</style>
