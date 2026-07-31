<script setup lang="ts">
import { ref } from "vue"
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogClose,
  VisuallyHidden,
} from "reka-ui"
import { X } from "@lucide/vue"

withDefaults(
  defineProps<{
    title?: string
    width?: string
    zIndex?: number
    flush?: boolean
  }>(),
  {
    zIndex: 200,
    flush: false,
  }
)

const emit = defineEmits<{ close: [] }>()
const closing = ref(false)

function close() {
  if (closing.value) return
  closing.value = true
  setTimeout(() => emit("close"), 220)
}

defineExpose({ close })
</script>

<template>
  <DialogRoot :open="true" @update:open="(v) => !v && close()">
    <DialogPortal>
      <DialogOverlay class="drawer-backdrop" :class="{ closing }" :style="{ zIndex }" />
      <DialogContent
        class="drawer"
        :class="{ closing }"
        :style="{ zIndex, ...(width ? { width } : {}) }"
        :aria-describedby="undefined"
        @escape-key-down="close"
        @pointer-down-outside="close"
      >
        <div class="drawer-header">
          <slot name="title">
            <DialogTitle v-if="title" as-child>
              <span class="drawer-title">{{ title }}</span>
            </DialogTitle>
            <VisuallyHidden v-else as-child>
              <DialogTitle>{{ title }}</DialogTitle>
            </VisuallyHidden>
          </slot>
          <DialogClose class="drawer-close" aria-label="Close">
            <X :size="14" />
          </DialogClose>
        </div>

        <div class="drawer-body" :class="{ 'drawer-body--flush': flush }">
          <slot />
        </div>

        <div v-if="$slots.footer" class="drawer-footer">
          <slot name="footer" />
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
@keyframes backdrop-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes backdrop-out {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}

@keyframes drawer-in {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}

@keyframes drawer-out {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(100%);
  }
}

.drawer-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(32, 33, 34, 0.5);
  animation: backdrop-in 0.18s ease both;
}

.drawer-backdrop.closing {
  animation: backdrop-out 0.22s ease both;
}

.drawer {
  position: fixed;
  top: 0;
  right: 0;
  background: var(--surface);
  border-left: 1px solid var(--border);
  box-shadow: var(--shadow-lg);
  width: 420px;
  max-width: 100vw;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding-top: env(safe-area-inset-top);
  animation: drawer-in 0.25s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.drawer.closing {
  animation: drawer-out 0.22s cubic-bezier(0.4, 0, 1, 1) both;
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 14px;
  background: var(--bg);
  border-bottom: 1px solid var(--border-light);
  flex-shrink: 0;
}

.drawer-title {
  font-family: var(--font);
  font-size: 15px;
  font-weight: 600;
}

.drawer-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--text-muted);
  border-radius: var(--radius);
  cursor: pointer;
  margin-left: auto;
  flex-shrink: 0;
  transition:
    background 0.12s,
    color 0.12s;
}

.drawer-close:hover {
  background: color-mix(in srgb, var(--border) 60%, transparent);
  color: var(--text);
}

.drawer-body {
  padding: 14px;
  overflow-y: auto;
  flex: 1;
}

.drawer-body--flush {
  padding: 0;
}

.drawer-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-top: 1px solid var(--border-light);
  background: var(--bg);
  flex-shrink: 0;
}

@media (max-width: 640px) {
  .drawer {
    width: 100vw;
    max-width: 100vw;
  }
  .drawer-body {
    padding: 12px;
  }
}
</style>
