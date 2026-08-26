<script setup lang="ts">
import { Minus, Plus } from "@lucide/vue"
import { AppChip, AppIcon } from "@/components/ui"
import type { Team } from "@/modules/teams/types"

withDefaults(
  defineProps<{
    title: string
    teams: Team[]
    /** "remove" is the roster, "add" is the pool of teams not in it. */
    action: "add" | "remove"
    emptyText: string
    /** Blocks removal once the roster is at the minimum size. */
    actionDisabled?: boolean
    actionTitle?: string
  }>(),
  { actionDisabled: false }
)

defineEmits<{ act: [teamId: string] }>()
</script>

<template>
  <div class="section">
    <div class="section-header">
      <span class="section-title">{{ title }}</span>
      <AppChip>{{ teams.length }}</AppChip>
    </div>

    <div class="team-list">
      <TransitionGroup name="team-item" tag="div" class="team-list-inner">
        <div
          v-for="tm in teams"
          :key="tm.id"
          class="team-row"
          :class="{ 'team-row--pool': action === 'add' }"
        >
          <span class="dot" :style="{ background: tm.color }" />
          <span class="team-name">{{ tm.name }}</span>
          <button
            class="action-btn"
            :class="`action-btn--${action}`"
            :disabled="actionDisabled"
            :title="actionTitle"
            @click="$emit('act', tm.id)"
          >
            <AppIcon :icon="action === 'add' ? Plus : Minus" size="sm" />
          </button>
        </div>
        <div v-if="teams.length === 0" key="__empty" class="empty-inline">{{ emptyText }}</div>
      </TransitionGroup>
    </div>
  </div>
</template>

<style scoped>
.section-header {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  margin-bottom: var(--sp-2);
}

.section-title {
  font-size: var(--fs-xs);
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.team-list {
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  overflow: hidden;
}

.team-list-inner {
  position: relative;
  display: flex;
  flex-direction: column;
}

.team-row {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-3);
  background: var(--bg);
  border-bottom: 1px solid var(--border-light);
}
.team-row:last-child {
  border-bottom: none;
}
.team-row--pool {
  background: color-mix(in srgb, var(--surface) 60%, var(--bg));
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.team-name {
  flex: 1;
  font-size: var(--fs-base);
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border-radius: var(--radius);
  border: 1px solid var(--border-light);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  flex-shrink: 0;
  transition:
    background var(--dur-fast) var(--ease),
    border-color var(--dur-fast) var(--ease),
    color var(--dur-fast) var(--ease),
    opacity var(--dur-fast) var(--ease);
}
.action-btn--remove:hover:not(:disabled) {
  background: color-mix(in srgb, var(--danger) 12%, transparent);
  border-color: var(--danger);
  color: var(--danger);
}
.action-btn--add:hover:not(:disabled) {
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  border-color: var(--accent);
  color: var(--accent);
}
.action-btn:disabled {
  opacity: 0.25;
  cursor: not-allowed;
}

/* ── Row enter/leave/move ── */
.team-item-enter-active {
  transition:
    opacity var(--dur-fast) var(--ease),
    transform var(--dur-fast) var(--ease);
}
.team-item-leave-active {
  transition:
    opacity var(--dur-fast) var(--ease),
    transform var(--dur-fast) var(--ease);
  position: absolute;
  width: 100%;
}
.team-item-enter-from {
  opacity: 0;
  transform: translateY(-6px);
}
.team-item-leave-to {
  opacity: 0;
  transform: translateY(6px);
}
.team-item-move {
  transition: transform var(--dur) var(--ease);
}
</style>
