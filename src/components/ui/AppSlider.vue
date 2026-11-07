<script setup lang="ts">
import { computed } from "vue"
import { SliderRange, SliderRoot, SliderThumb, SliderTrack } from "reka-ui"

/**
 * Single-thumb slider. The filled part of the track is drawn in `color`
 * (a team's or player's own colour on the power forms), falling back to the
 * accent.
 */
const props = withDefaults(
  defineProps<{
    min: number
    max: number
    step?: number
    color?: string
    ariaLabel?: string
    disabled?: boolean
  }>(),
  { step: 1 }
)

const model = defineModel<number>({ required: true })

const value = computed(() => [model.value])

function onUpdate(next: number[] | undefined) {
  if (next?.length) model.value = next[0]
}
</script>

<template>
  <SliderRoot
    class="slider"
    :model-value="value"
    :min="min"
    :max="max"
    :step="step"
    :disabled="disabled"
    :style="props.color ? { '--slider-color': props.color } : undefined"
    @update:model-value="onUpdate"
  >
    <SliderTrack class="slider-track">
      <SliderRange class="slider-range" />
    </SliderTrack>
    <SliderThumb class="slider-thumb" :aria-label="ariaLabel" />
  </SliderRoot>
</template>

<style scoped>
.slider {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  height: 26px;
  cursor: pointer;
  touch-action: none;
  user-select: none;
}
.slider[data-disabled] {
  opacity: 0.5;
  cursor: not-allowed;
}

.slider-track {
  position: relative;
  flex-grow: 1;
  height: 4px;
  border-radius: var(--radius-pill);
  background: var(--border);
}

.slider-range {
  position: absolute;
  height: 100%;
  border-radius: var(--radius-pill);
  background: var(--slider-color, var(--accent));
}

.slider-thumb {
  display: block;
  width: 26px;
  height: 26px;
  border-radius: var(--radius-pill);
  background: #ffffff;
  box-shadow:
    0 1px 1px rgba(0, 0, 0, 0.14),
    0 3px 8px rgba(0, 0, 0, 0.16);
}
.slider-thumb:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}
</style>
