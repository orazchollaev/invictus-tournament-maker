<script setup lang="ts">
import type { Component } from "vue"
import { AppIcon } from "@/components/ui"

defineProps<{ icon: Component; label: string; description: string }>()
</script>

<template>
  <button class="option" type="button">
    <span class="option-icon">
      <AppIcon :icon="icon" size="lg" />
    </span>
    <span class="option-text">
      <span class="option-label">{{ label }}</span>
      <span class="option-desc">{{ description }}</span>
    </span>
  </button>
</template>

<style scoped>
.option {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  padding: var(--sp-4);
  background: var(--bg);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  cursor: pointer;
  text-align: left;
  width: 100%;
  transition:
    border-color var(--dur-fast) var(--ease),
    background var(--dur-fast) var(--ease);
}
.option:hover {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 6%, var(--bg));
}
.option:hover .option-icon {
  color: var(--accent);
}

.option-icon {
  color: var(--text-muted);
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--border) 50%, transparent);
  border-radius: var(--radius);
  transition: color var(--dur-fast) var(--ease);
}

.option-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.option-label {
  font-size: var(--fs-base);
  font-weight: 600;
  color: var(--text);
}

.option-desc {
  font-size: var(--fs-sm);
  color: var(--text-muted);
  line-height: 1.4;
}
</style>
