<script setup lang="ts">
import { VueDraggable } from "vue-draggable-plus"
import TeamChip from "./TeamChip.vue"
import type { DrawItem } from "./types"

const props = withDefaults(
  defineProps<{
    modelValue: string[]
    capacity: number
    resolve: (id: string) => DrawItem
    armedId?: string | null
    placeholder?: string
    removable?: boolean
    disabled?: boolean
  }>(),
  { armedId: null, placeholder: "", removable: false, disabled: false }
)

const emit = defineEmits<{
  "update:modelValue": [string[]]
  arm: [string]
  remove: [string]
  assign: []
}>()

function onMove(evt: { from: EventTarget | null; to: EventTarget | null }) {
  if (evt.from === evt.to) return true
  return props.capacity === Infinity || props.modelValue.length < props.capacity
}

function onContainerClick() {
  if (!props.armedId) return
  if (props.modelValue.length >= props.capacity) return
  emit("assign")
}
</script>

<template>
  <div
    class="dl-wrap"
    :class="{ 'dl-wrap--full': modelValue.length >= capacity, 'dl-wrap--armable': armedId }"
  >
    <VueDraggable
      :model-value="modelValue"
      class="dl-list"
      :group="{ name: 'draw' }"
      :animation="150"
      :delay="120"
      :delay-on-touch-only="true"
      :disabled="disabled"
      :move="onMove"
      ghost-class="dl-ghost"
      @update:model-value="emit('update:modelValue', $event as string[])"
      @click.self="onContainerClick"
    >
      <TeamChip
        v-for="id in modelValue"
        :key="id"
        :item="resolve(id)"
        :armed="id === armedId"
        :removable="removable"
        @click="emit('arm', id)"
        @remove="emit('remove', id)"
      />
    </VueDraggable>
    <span v-if="!modelValue.length && placeholder" class="dl-placeholder">{{ placeholder }}</span>
  </div>
</template>

<style scoped>
.dl-wrap {
  position: relative;
  min-height: 30px;
}
.dl-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-height: 30px;
  padding: 3px;
  border: 1px dashed var(--border-light);
  border-radius: var(--radius);
  transition: border-color 0.15s;
}
.dl-wrap--full .dl-list {
  border-style: solid;
}
.dl-wrap--armable .dl-list {
  border-color: var(--accent);
  cursor: pointer;
}
.dl-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: var(--text-muted);
  pointer-events: none;
  text-align: center;
  padding: 0 4px;
}
.dl-ghost {
  opacity: 0.45;
  border-style: dashed;
  border-color: var(--accent);
}
</style>
