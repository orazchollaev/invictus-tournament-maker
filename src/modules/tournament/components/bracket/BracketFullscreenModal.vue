<script setup lang="ts">
import { nextTick, onUnmounted, watch } from "vue"
import { X } from "@lucide/vue"
import { AppButton, AppIcon } from "@/components/ui"
import BracketZoomControls from "./BracketZoomControls.vue"
import BracketZoomHint from "./BracketZoomHint.vue"
import { useBracketViewport } from "../../composables/useBracketViewport"
import { useBracketZoomHint } from "../../composables/useBracketZoomHint"

const zoomHint = useBracketZoomHint()

defineProps<{ title: string }>()

const open = defineModel<boolean>("open", { required: true })

/** Its own viewport: the modal never inherits the inline panel's zoom or pan. */
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
  reset,
} = useBracketViewport({ maxFitZoom: 1.5 })

function close() {
  open.value = false
}

function onEsc(e: KeyboardEvent) {
  if (e.key === "Escape") close()
}

watch(open, (isOpen) => {
  if (isOpen) {
    reset()
    document.body.style.overflow = "hidden"
    document.addEventListener("keydown", onEsc)
    nextTick(fitScreen)
  } else {
    document.body.style.overflow = ""
    document.removeEventListener("keydown", onEsc)
  }
})

onUnmounted(() => {
  document.body.style.overflow = ""
  document.removeEventListener("keydown", onEsc)
})
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="full-bracket-backdrop" @click.self="close">
      <div class="full-bracket-modal">
        <div class="full-bracket-header">
          <span>{{ title }}</span>
          <div class="full-bracket-header-right">
            <BracketZoomControls
              :zoom="zoom"
              @zoom-in="zoomIn"
              @zoom-out="zoomOut"
              @fit="fitScreen"
            />
            <AppButton variant="outlined" size="xs" @click="close">
              <AppIcon :icon="X" size="sm" />
              Close
            </AppButton>
          </div>
        </div>

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

          <BracketZoomHint :show="zoomHint.show.value" @dismiss="zoomHint.dismiss" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped src="./bracket-viewport.css"></style>

<style scoped>
.full-bracket-backdrop {
  position: fixed;
  inset: 0;
  background: var(--scrim);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-overlay);
}

.full-bracket-modal {
  background: var(--surface);
  border: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
}

.full-bracket-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sp-3) var(--sp-4);
  padding-top: calc(var(--sp-3) + var(--safe-top));
  border-bottom: 1px solid var(--border-light);
  background: var(--bg);
  font-family: var(--font);
  font-size: var(--fs-md);
  flex-shrink: 0;
}

.full-bracket-header-right {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}

.full-bracket-body {
  flex: 1;
}

@media (max-width: 640px) {
  .full-bracket-modal {
    height: 100dvh;
  }
  .full-bracket-header-right :deep(.zoom-controls) {
    display: none;
  }
}
</style>
