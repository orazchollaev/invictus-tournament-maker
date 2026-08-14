<script setup lang="ts">
import { ChevronLeft, ChevronRight, Zap } from "@lucide/vue"
import { AppIcon } from "@/components/ui"

defineProps<{
  title: string
  isFirst: boolean
  isLast: boolean
  done: boolean
  /** One flag per matchday, for the pill strip. */
  doneFlags: boolean[]
  activeIdx: number
  locked?: boolean
}>()

defineEmits<{
  prev: []
  next: []
  select: [idx: number]
  "sim-matchday": []
}>()
</script>

<template>
  <div class="lv-md-nav">
    <button class="lv-nav-btn" :disabled="isFirst" @click="$emit('prev')">
      <AppIcon :icon="ChevronLeft" size="sm" />
    </button>
    <span class="lv-md-title">
      {{ title }}
      <span v-if="done" class="lv-done-badge">✓</span>
    </span>
    <button class="lv-nav-btn" :disabled="isLast" @click="$emit('next')">
      <AppIcon :icon="ChevronRight" size="sm" />
    </button>
    <button
      v-if="!done && !locked"
      class="lv-sim-md-btn"
      title="Simulate matchday"
      @click="$emit('sim-matchday')"
    >
      <AppIcon :icon="Zap" size="xs" />
    </button>
  </div>

  <slot />

  <div class="lv-md-pills">
    <button
      v-for="(isDone, idx) in doneFlags"
      :key="idx"
      class="lv-pill"
      :class="{ active: idx === activeIdx, done: isDone }"
      @click="$emit('select', idx)"
    >
      {{ idx + 1 }}
    </button>
  </div>
</template>

<style scoped>
.lv-md-nav {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  margin-bottom: var(--sp-2);
}

.lv-nav-btn {
  display: flex;
  align-items: center;
  padding: 2px var(--sp-1);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  flex-shrink: 0;
}
.lv-nav-btn:not(:disabled):hover {
  color: var(--text);
  border-color: var(--border);
}
.lv-nav-btn:disabled {
  opacity: 0.4;
  cursor: default;
}

.lv-md-title {
  font-size: var(--fs-sm);
  font-weight: 700;
  flex: 1;
  text-align: center;
}

.lv-done-badge {
  font-size: var(--fs-xs);
  color: var(--accent);
  margin-left: 3px;
}

.lv-sim-md-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 3px var(--sp-2);
  border: 1px solid color-mix(in srgb, var(--accent) 35%, transparent);
  border-radius: var(--radius);
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 8%, var(--surface));
  cursor: pointer;
}
.lv-sim-md-btn:hover {
  background: color-mix(in srgb, var(--accent) 16%, var(--surface));
}

/* ─── Matchday pills ─── */
.lv-md-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  padding-bottom: 2px;
}

.lv-pill {
  min-width: 22px;
  height: 22px;
  padding: 0 3px;
  font-size: var(--fs-xs);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  align-items: center;
}
.lv-pill.done {
  color: var(--accent);
  border-color: color-mix(in srgb, var(--accent) 35%, transparent);
  background: color-mix(in srgb, var(--accent) 5%, var(--surface));
}
.lv-pill.active {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 14%, var(--surface));
  color: var(--accent);
  font-weight: 700;
}

@media (max-width: 600px) {
  .lv-nav-btn {
    padding: var(--sp-2) var(--sp-3);
  }
}
</style>
