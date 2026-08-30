<script setup lang="ts">
/**
 * One column of elbow connectors between two bracket rounds. Both halves of
 * the double-sided layout draw the same thing at a different x, so the svg
 * lives here rather than twice in the parent.
 */
import type { ConnectorSegment } from "./bracketUtils"

defineProps<{
  /** One entry per connector, each holding its two strands. */
  connectors: ConnectorSegment[][]
  left: number
  top: number
  width: number
  height: number
  /** Only worth paying for while hover-highlight is on. */
  transition?: string
}>()
</script>

<template>
  <svg
    :style="{
      position: 'absolute',
      top: top + 'px',
      left: left + 'px',
      width: width + 'px',
      height: height + 'px',
      display: 'block',
    }"
    overflow="visible"
  >
    <template v-for="(segs, pi) in connectors" :key="pi">
      <path
        v-for="(seg, si) in segs"
        :key="si"
        :d="seg.d"
        fill="none"
        :stroke-width="seg.w"
        :style="{ stroke: seg.stroke, strokeOpacity: seg.opacity, transition }"
      />
    </template>
  </svg>
</template>
