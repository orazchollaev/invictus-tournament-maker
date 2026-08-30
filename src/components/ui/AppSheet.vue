<script setup lang="ts">
/**
 * Centred dialog on desktop, bottom sheet on phones — the family
 * `MatchScoreModal` and `LiveMatchModal` were each hand-rolling on raw
 * `DialogRoot`. `AppModal` is the other family: a drawer that slides in from
 * the side. Pick this one for anything transient the user acts on and
 * dismisses; pick `AppModal` for a panel they work inside.
 *
 * The shell only: backdrop, panel, header and the close-animation timing.
 * The body is yours — the slot lands directly in the panel so your own
 * layout element stays a flex child, not a wrapped one.
 *
 * Size and stacking are props rather than CSS custom properties because the
 * backdrop and the panel are siblings: a property set on one would never
 * reach the other.
 */
import { computed, ref } from "vue"
import { DialogRoot, DialogPortal, DialogOverlay, DialogContent, DialogTitle } from "reka-ui"
import { X } from "@lucide/vue"
import { useI18n } from "vue-i18n"

const props = withDefaults(
  defineProps<{
    title?: string
    subtitle?: string
    /** Set false when a stray tap outside must not throw away work in progress. */
    dismissOnOutsideClick?: boolean
    /** Steps above --z-modal. Raise it for a sheet opened from another sheet. */
    layer?: number
    /** Backdrop opacity. */
    dim?: number
    width?: string
    maxHeight?: string
    /** Height cap once the panel has become a bottom sheet. */
    maxHeightMobile?: string
  }>(),
  { dismissOnOutsideClick: true, layer: 10, dim: 0.5 }
)

const emit = defineEmits<{ close: [] }>()

defineOptions({ inheritAttrs: false })

const { t } = useI18n()
const closing = ref(false)

const backdropStyle = computed(() => ({
  zIndex: "calc(var(--z-modal) + " + props.layer + ")",
  background: "rgba(32, 33, 34, " + props.dim + ")",
}))

const panelStyle = computed(() => ({
  zIndex: "calc(var(--z-modal) + " + (props.layer + 1) + ")",
  "--sheet-width": props.width,
  "--sheet-max-height": props.maxHeight,
  "--sheet-max-height-mobile": props.maxHeightMobile,
}))

/**
 * Runs the exit animation, then reports. Callers that need to know *why* it
 * closed park that intent before calling this and read it back in `@close`.
 */
function close() {
  if (closing.value) return
  closing.value = true
  setTimeout(() => emit("close"), 180)
}

defineExpose({ close })
</script>

<template>
  <DialogRoot :open="true" @update:open="(v) => !v && close()">
    <DialogPortal>
      <DialogOverlay class="sheet-backdrop" :class="{ closing }" :style="backdropStyle" />
      <DialogContent
        class="sheet"
        :class="{ closing }"
        :aria-describedby="undefined"
        v-bind="$attrs"
        :style="panelStyle"
        @escape-key-down="close"
        @pointer-down-outside="(e: Event) => (dismissOnOutsideClick ? close() : e.preventDefault())"
      >
        <div class="sheet-header">
          <DialogTitle as-child>
            <slot name="title">
              <span class="sheet-title">
                {{ title }}
                <span v-if="subtitle" class="sheet-subtitle">{{ subtitle }}</span>
              </span>
            </slot>
          </DialogTitle>
          <button class="sheet-close" :aria-label="t('common.close')" @click="close">
            <X :size="14" />
          </button>
        </div>

        <slot />

        <slot name="footer" />
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
@keyframes sheet-backdrop-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
@keyframes sheet-backdrop-out {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}
@keyframes sheet-dialog-in {
  from {
    opacity: 0;
    transform: translate(-50%, -46%);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%);
  }
}
@keyframes sheet-dialog-out {
  from {
    opacity: 1;
    transform: translate(-50%, -50%);
  }
  to {
    opacity: 0;
    transform: translate(-50%, -46%);
  }
}
@keyframes sheet-slide-in {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}
@keyframes sheet-slide-out {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(100%);
  }
}

.sheet-backdrop {
  position: fixed;
  inset: 0;
  animation: sheet-backdrop-in 0.16s ease both;
}
.sheet-backdrop.closing {
  animation: sheet-backdrop-out 0.18s ease both;
}

.sheet {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: var(--sheet-width, min(400px, calc(100vw - 2 * var(--sp-4))));
  max-height: var(--sheet-max-height, none);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: sheet-dialog-in 0.18s var(--ease) both;
}
.sheet.closing {
  animation: sheet-dialog-out 0.18s var(--ease) both;
}

.sheet-header {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-3);
  background: var(--bg);
  border-bottom: 1px solid var(--border-light);
  flex-shrink: 0;
}

.sheet-title {
  font-family: var(--font-ui);
  font-size: var(--fs-sm);
  font-weight: 600;
  display: flex;
  align-items: baseline;
  gap: var(--sp-2);
}

.sheet-subtitle {
  font-size: var(--fs-xs);
  font-weight: 600;
  color: var(--text-muted);
}

.sheet-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  margin-inline-start: auto;
  border: none;
  background: transparent;
  color: var(--text-muted);
  border-radius: var(--radius);
  cursor: pointer;
  flex-shrink: 0;
  transition:
    background 0.12s,
    color 0.12s;
}
.sheet-close:hover {
  background: color-mix(in srgb, var(--border) 60%, transparent);
  color: var(--text);
}

@media (max-width: 600px) {
  .sheet {
    top: auto;
    bottom: 0;
    inset-inline-start: 0;
    transform: none;
    width: 100vw;
    max-width: 100vw;
    max-height: var(--sheet-max-height-mobile, none);
    border: none;
    border-top: 1px solid var(--border);
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    animation: sheet-slide-in 0.22s cubic-bezier(0.22, 1, 0.36, 1) both;
  }
  .sheet.closing {
    animation: sheet-slide-out 0.18s cubic-bezier(0.4, 0, 1, 1) both;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sheet,
  .sheet.closing,
  .sheet-backdrop,
  .sheet-backdrop.closing {
    animation: none;
  }
}
</style>
