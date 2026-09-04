<script setup lang="ts">
import { Shuffle } from "@lucide/vue"
import { useI18n } from "vue-i18n"

defineProps<{
  title: string
  isFirst: boolean
  isLast: boolean
  done: boolean
  /** One flag per matchday, for the jump strip. */
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

const { t } = useI18n()
</script>

<template>
  <div class="lv-md-nav">
    <span class="lv-md-title">
      {{ title }}
      <span v-if="done" class="lv-done-badge">✓</span>
    </span>
    <div class="lv-md-btns">
      <button
        v-if="!locked"
        class="btn-xs"
        :disabled="done"
        :title="t('tournament.simulateMatchday')"
        @click="$emit('sim-matchday')"
      >
        <Shuffle :size="11" />
      </button>
      <button class="btn-xs" :disabled="isFirst" :aria-label="t('common.back')" @click="$emit('prev')">
        ‹
      </button>
      <button class="btn-xs" :disabled="isLast" :aria-label="t('common.next')" @click="$emit('next')">
        ›
      </button>
    </div>
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
  justify-content: space-between;
  gap: var(--sp-2);
  padding: var(--sp-1) 0;
  border-bottom: 1px solid var(--border-light);
  margin-bottom: var(--sp-1);
}

.lv-md-title {
  font-size: var(--fs-xs);
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lv-done-badge {
  color: var(--accent);
  margin-left: 3px;
}

.lv-md-btns {
  display: flex;
  gap: 3px;
  flex-shrink: 0;
}

/* ─── Matchday jump strip ─── */
.lv-md-pills {
  display: flex;
  flex-wrap: nowrap;
  overflow-x: auto;
  gap: 3px;
  padding: 2px 2px var(--sp-1);
  margin-top: var(--sp-1);
  scrollbar-width: thin;
}

.lv-pill {
  min-width: 20px;
  height: 20px;
  padding: 0 3px;
  font-size: 10px;
  font-weight: 600;
  border: none;
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  color: var(--text-muted);
  cursor: pointer;
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  transition:
    color var(--dur-fast) var(--ease),
    background var(--dur-fast) var(--ease);
}
.lv-pill:hover {
  color: var(--text);
}
.lv-pill.done {
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 10%, var(--surface-2));
}
.lv-pill.active {
  background: var(--accent);
  color: var(--on-accent);
  font-weight: 700;
}
</style>
