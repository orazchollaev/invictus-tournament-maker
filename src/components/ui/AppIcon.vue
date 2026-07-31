<script setup lang="ts">
/**
 * Lucide wrapper with a fixed size scale. The codebase previously used
 * 17 distinct `:size` values; these five are the only ones allowed.
 */
import type { Component } from "vue"

withDefaults(
  defineProps<{
    icon: Component
    size?: "xs" | "sm" | "md" | "lg" | "xl"
  }>(),
  { size: "sm" }
)

const SIZES = { xs: 12, sm: 14, md: 16, lg: 20, xl: 24 } as const
</script>

<template>
  <component :is="icon" :size="SIZES[size]" class="icon" />
</template>

<style scoped>
.icon {
  flex-shrink: 0;
}
</style>
