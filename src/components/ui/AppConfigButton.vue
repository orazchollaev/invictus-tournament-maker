<script setup lang="ts">
/**
 * Full-width button that opens a phase configuration modal (Group / Knockout
 * / League Configuration). Shows the section label plus a live one-line
 * summary of the values currently selected, so the user doesn't have to open
 * the modal to see what's configured. Styled to match the format-card
 * picker above it (`.ctp-format-card` in create-tournament.css) — same
 * border weight, radius and hover lift, just laid out as a row.
 */
import { ChevronRight, Lock, type LucideIcon } from "@lucide/vue"

withDefaults(
  defineProps<{
    icon: LucideIcon
    label: string
    summary?: string
    locked?: boolean
  }>(),
  {
    locked: false,
  }
)

defineEmits<{ click: [] }>()
</script>

<template>
  <button type="button" class="config-btn" @click="$emit('click')">
    <span class="config-btn-icon">
      <component :is="icon" :size="18" />
    </span>

    <span class="config-btn-text">
      <span class="config-btn-label">
        {{ label }}
        <Lock v-if="locked" :size="10" class="config-btn-lock" />
      </span>
      <span v-if="summary" class="config-btn-summary">{{ summary }}</span>
    </span>

    <ChevronRight :size="16" class="config-btn-chevron" />
  </button>
</template>

<style scoped>
.config-btn {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  width: 100%;
  box-sizing: border-box;
  padding: var(--sp-2);
  background: var(--bg);
  border: 2px solid var(--border-light);
  border-radius: var(--radius-lg);
  cursor: pointer;
  text-align: left;
  font-family: var(--font-ui);
  transition:
    border-color var(--dur-fast),
    box-shadow var(--dur),
    background var(--dur-fast);
}

.config-btn:hover {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 6%, var(--bg));
  box-shadow: var(--shadow-sm);
}

.config-btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  border-radius: var(--radius);
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  color: var(--accent);
}

.config-btn-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.config-btn-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
  color: var(--text);
}

.config-btn-lock {
  color: var(--text-muted);
}

.config-btn-summary {
  font-size: 11px;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.config-btn-chevron {
  flex-shrink: 0;
  color: var(--text-muted);
}
</style>
