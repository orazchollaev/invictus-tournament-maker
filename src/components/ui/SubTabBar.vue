<script setup lang="ts">
/**
 * Canonical in-panel division switcher — Groups/Wildcards, Bracket/Fixtures
 * and league tiers all pick from a small set of views inside one tab panel.
 * Thin semantic wrapper over BtnGroup so all three read as the same widget
 * instead of three separately hand-rolled BtnGroup blocks.
 */
import type { Component } from "vue"
import BtnGroup from "./BtnGroup.vue"

withDefaults(
  defineProps<{
    options: { value: string; label: string; icon?: Component; disabled?: boolean }[]
    modelValue: string
    size?: "xs" | "sm"
  }>(),
  { size: "xs" }
)

defineEmits<{ "update:modelValue": [value: string] }>()
</script>

<template>
  <BtnGroup
    class="sub-tab-bar"
    :options="options"
    :model-value="modelValue"
    :size="size"
    @update:model-value="(v) => $emit('update:modelValue', v)"
  />
</template>
