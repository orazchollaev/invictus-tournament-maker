<script setup lang="ts">
import { ChevronLeft, ChevronRight, Zap } from "@lucide/vue"
import { AppIcon } from "@/components/ui"
import { useI18n } from "vue-i18n"

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

const { t } = useI18n()

defineEmits<{
  prev: []
  next: []
  select: [idx: number]
  "sim-matchday": []
}>()
</script>

<template>
  <div class="lv-md-nav">
    <button
      class="lv-nav-btn"
      :disabled="isFirst"
      :aria-label="t('common.back')"
      @click="$emit('prev')"
    >
      <AppIcon :icon="ChevronLeft" size="sm" />
    </button>

    <div class="lv-md-title-wrap">
      <span class="lv-md-title">
        {{ title }}
        <span v-if="done" class="lv-done-badge">✓</span>
      </span>
      <button
        v-if="!locked"
        class="lv-sim-md-btn"
        :disabled="done"
        :title="t('tournament.simulateMatchday')"
        @click="$emit('sim-matchday')"
      >
        <AppIcon :icon="Zap" size="xs" />
        <span>{{ t("common.simulate") }}</span>
      </button>
    </div>

    <button
      class="lv-nav-btn"
      :disabled="isLast"
      :aria-label="t('common.next')"
      @click="$emit('next')"
    >
      <AppIcon :icon="ChevronRight" size="sm" />
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
  margin-bottom: var(--sp-3);
}

.lv-nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: 1px solid var(--border-light);
  border-radius: 50%;
  background: var(--surface);
  color: var(--text-muted);
  cursor: pointer;
  flex-shrink: 0;
  transition:
    color 0.15s,
    border-color 0.15s,
    background 0.15s;
}
.lv-nav-btn:not(:disabled):hover {
  color: var(--accent);
  border-color: var(--accent);
}
.lv-nav-btn:disabled {
  opacity: 0.3;
  cursor: default;
}

.lv-md-title-wrap {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
}

.lv-md-title {
  font-size: var(--fs-sm);
  font-weight: 700;
  text-align: center;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lv-done-badge {
  font-size: var(--fs-xs);
  color: var(--accent);
  margin-left: 3px;
}

.lv-sim-md-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px var(--sp-2);
  font-size: var(--fs-xs);
  font-weight: 600;
  border: none;
  border-radius: var(--radius-full, 999px);
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 10%, transparent);
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s;
}
.lv-sim-md-btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--accent) 20%, transparent);
}
.lv-sim-md-btn:disabled {
  opacity: 0.4;
  cursor: default;
}

/* ─── Matchday pills ─── */
.lv-md-pills {
  display: flex;
  flex-wrap: nowrap;
  overflow-x: auto;
  gap: 4px;
  padding: 2px 2px var(--sp-1);
  margin-top: var(--sp-1);
  scrollbar-width: thin;
}

.lv-pill {
  min-width: 24px;
  height: 24px;
  padding: 0 4px;
  font-size: var(--fs-xs);
  font-weight: 600;
  border: 1px solid var(--border-light);
  border-radius: 7px;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  transition:
    color 0.15s,
    border-color 0.15s,
    background 0.15s,
    transform 0.1s;
}
.lv-pill:hover {
  color: var(--text);
  border-color: var(--border);
}
.lv-pill.done {
  color: var(--accent);
  border-color: color-mix(in srgb, var(--accent) 35%, transparent);
  background: color-mix(in srgb, var(--accent) 5%, var(--surface));
}
.lv-pill.active {
  border-color: var(--accent);
  background: var(--accent);
  color: var(--on-accent);
  font-weight: 700;
  transform: scale(1.08);
}

@media (max-width: 600px) {
  .lv-nav-btn {
    width: 34px;
    height: 34px;
  }
}

/* Painted at 30px at the ends of the nav row, with nothing beside them — the
   hit area can grow to a full tap target without stealing neighbouring taps. */
.lv-nav-btn {
  position: relative;
}
.lv-nav-btn::after {
  content: "";
  position: absolute;
  inset: 50% auto auto 50%;
  width: max(100%, var(--tap-min));
  height: max(100%, var(--tap-min));
  transform: translate(-50%, -50%);
}
</style>
