<script setup lang="ts">
/** A single trigger inside `AppTabs`. */
import { TabsTrigger } from "reka-ui"

defineProps<{
  value: string
  disabled?: boolean
}>()
</script>

<template>
  <TabsTrigger as="div" class="phase-tab" :value="value" :disabled="disabled">
    <slot />
  </TabsTrigger>
</template>

<style scoped></style>
