<script setup lang="ts">
import { onMounted, onUnmounted } from "vue"
import { X } from "lucide-vue-next"

withDefaults(
  defineProps<{
    title?: string
    width?: string
    zIndex?: number
  }>(),
  {
    zIndex: 200,
  }
)

const emit = defineEmits<{ close: [] }>()

function onKey(e: KeyboardEvent) {
  if (e.key === "Escape") emit("close")
}

onMounted(() => {
  document.body.style.overflow = "hidden"
  document.addEventListener("keydown", onKey)
})

onUnmounted(() => {
  document.body.style.overflow = ""
  document.removeEventListener("keydown", onKey)
})
</script>

<template>
  <Transition name="modal" appear>
    <div class="modal-backdrop" :style="{ zIndex }" @click.self="emit('close')">
      <div class="modal" :style="width ? { width } : {}" role="dialog" aria-modal="true">
        <div class="modal-header">
          <span v-if="title" class="modal-title">{{ title }}</span>
          <button class="modal-close" aria-label="Close" @click="emit('close')">
            <X :size="14" />
          </button>
        </div>
        <div class="modal-body">
          <slot />
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(32, 33, 34, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal {
  background: var(--surface);
  border: 1px solid var(--border);
  width: 420px;
  max-width: calc(100vw - 32px);
  max-height: calc(100dvh - 48px);
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 14px;
  background: var(--bg);
  border-bottom: 1px solid var(--border-light);
  flex-shrink: 0;
}

.modal-title {
  font-family: var(--font);
  font-size: 16px;
}

.modal-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--text-muted);
  border-radius: 4px;
  cursor: pointer;
  margin-left: auto;
  flex-shrink: 0;
  transition:
    background 0.12s,
    color 0.12s;
}

.modal-close:hover {
  background: color-mix(in srgb, var(--border) 60%, transparent);
  color: var(--text);
}

.modal-body {
  padding: 14px;
  overflow-y: auto;
  flex: 1;
}

/* Enter animation */
.modal-enter-active {
  transition: opacity 0.15s ease;
}
.modal-enter-active .modal {
  transition: transform 0.15s ease;
}
.modal-enter-from {
  opacity: 0;
}
.modal-enter-from .modal {
  transform: scale(0.97) translateY(-8px);
}

@media (max-width: 480px) {
  .modal {
    max-width: calc(100vw - 16px);
  }
  .modal-body {
    padding: 12px;
  }
}
</style>
