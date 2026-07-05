<script setup lang="ts">
import { X } from "@lucide/vue"
import TeamBadge from "@/modules/teams/components/TeamBadge.vue"
import type { DrawItem } from "./types"

withDefaults(
  defineProps<{
    item: DrawItem
    size?: number
    removable?: boolean
    armed?: boolean
  }>(),
  { size: 13, removable: false, armed: false }
)

defineEmits<{ remove: []; click: [] }>()
</script>

<template>
  <div class="dc-chip" :class="{ 'dc-chip--armed': armed }" @click="$emit('click')">
    <TeamBadge :team="item.team" :size="size" class="dc-name" />
    <span v-if="item.subLabel" class="dc-sub">{{ item.subLabel }}</span>
    <button v-if="removable" class="dc-remove" type="button" @click.stop="$emit('remove')">
      <X :size="11" />
    </button>
  </div>
</template>

<style scoped>
.dc-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  cursor: grab;
  touch-action: manipulation;
  user-select: none;
}
.dc-chip:active {
  cursor: grabbing;
}
.dc-chip--armed {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent);
}
.dc-name {
  font-size: 12px;
  min-width: 0;
}
.dc-sub {
  font-size: 10px;
  color: var(--text-muted);
  flex-shrink: 0;
  white-space: nowrap;
}
.dc-remove {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  padding: 0;
  color: var(--text-muted);
  background: transparent;
  border: none;
}
.dc-remove:hover {
  color: var(--text);
}
</style>
