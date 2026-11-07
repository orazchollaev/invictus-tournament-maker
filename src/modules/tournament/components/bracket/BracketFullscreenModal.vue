<script setup lang="ts">
/**
 * The bracket at full size, in the app's side drawer — as wide as the screen
 * allows — with its own pan/zoom viewport (it never inherits the inline
 * panel's zoom or pan).
 */
import { nextTick, watch } from "vue"
import { AppModal } from "@/components/ui"
import BracketZoomControls from "./BracketZoomControls.vue"
import BracketZoomHint from "./BracketZoomHint.vue"
import { useBracketViewport } from "@/modules/tournament/composables/useBracketViewport"
import { useBracketZoomHint } from "@/modules/tournament/composables/useBracketZoomHint"

defineProps<{ title: string }>()

const open = defineModel<boolean>("open", { required: true })

const zoomHint = useBracketZoomHint()

const {
  wrapperRef,
  innerRef,
  zoom,
  isDragging,
  isZooming,
  transform,
  layerStyle,
  onMouseDown,
  onWheel,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  zoomIn,
  zoomOut,
  fitScreen,
  fitInitial,
  reset,
} = useBracketViewport({ maxFitZoom: 1.5 })

// The viewport only exists while the drawer is open; fit it once it is there.
watch(wrapperRef, (el) => {
  if (!el) return
  reset()
  nextTick(fitInitial)
})
</script>

<template>
  <AppModal v-if="open" :title="title" width="min(1200px, 100vw)" flush @close="open = false">
    <div
      :ref="(el) => (wrapperRef = el as HTMLElement | null)"
      class="bracket-viewport full-bracket-body"
      :class="{ dragging: isDragging }"
      @mousedown="onMouseDown"
      @wheel.prevent="onWheel"
      @touchstart.passive="
        (e) => {
          zoomHint.dismiss()
          onTouchStart(e)
        }
      "
      @touchmove.prevent="onTouchMove"
      @touchend="onTouchEnd"
    >
      <div
        :ref="(el) => (innerRef = el as HTMLElement | null)"
        class="bracket-pan-layer"
        :class="{ zooming: isZooming, dragging: isDragging }"
        :style="{ transform, ...layerStyle }"
      >
        <slot />
      </div>

      <div class="full-bracket-controls">
        <BracketZoomControls :zoom="zoom" @zoom-in="zoomIn" @zoom-out="zoomOut" @fit="fitScreen" />
      </div>

      <BracketZoomHint :show="zoomHint.show.value" @dismiss="zoomHint.dismiss" />
    </div>
  </AppModal>
</template>

<style scoped src="./bracket-viewport.css"></style>

<style scoped>
.full-bracket-body {
  height: 100%;
  background: var(--bg);
}

/* Floats over the bracket rather than taking a header row of its own. */
.full-bracket-controls {
  position: absolute;
  top: var(--sp-2);
  inset-inline-end: var(--sp-2);
  z-index: 1;
}

/* Pinch zooms on a phone; the buttons would only cover the bracket. */
@media (max-width: 600px) {
  .full-bracket-controls {
    display: none;
  }
}
</style>
