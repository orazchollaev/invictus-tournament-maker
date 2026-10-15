<script setup lang="ts">
export interface CrestOption {
  value: string
  /** Image to show — a rendered crest — or nothing for a text-only tile. */
  src?: string
  label: string
}

defineProps<{
  options: CrestOption[]
  modelValue: string | null
}>()

defineEmits<{ "update:modelValue": [value: string] }>()
</script>

<template>
  <div class="grid" role="radiogroup">
    <button
      v-for="opt in options"
      :key="opt.value"
      type="button"
      role="radio"
      class="tile"
      :class="{ 'tile--active': opt.value === modelValue }"
      :aria-checked="opt.value === modelValue"
      :aria-label="opt.label"
      :title="opt.label"
      @click="$emit('update:modelValue', opt.value)"
    >
      <img v-if="opt.src" :src="opt.src" alt="" class="tile-img" loading="lazy" />
      <span v-else class="tile-text">{{ opt.label }}</span>
    </button>
  </div>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(64px, 1fr));
  gap: var(--sp-2);
}

.tile {
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  padding: 4px;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--surface);
  color: var(--text);
  cursor: pointer;
  transition:
    border-color var(--dur-fast) var(--ease),
    background var(--dur-fast) var(--ease),
    transform var(--dur-fast) var(--ease);
}
.tile:hover {
  border-color: var(--accent);
}
.tile:active {
  transform: scale(0.94);
}
.tile--active {
  border-color: var(--accent);
  background: var(--accent-subtle);
  box-shadow: 0 0 0 1px var(--accent);
}

.tile-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.tile-text {
  font-size: var(--fs-sm);
  font-weight: 600;
  text-align: center;
  line-height: 1.2;
}

@media (prefers-reduced-motion: reduce) {
  .tile {
    transition: none;
  }
}
</style>
