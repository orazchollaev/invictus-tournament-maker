<script setup lang="ts">
import { onMounted, onUnmounted } from "vue"
import { X } from "lucide-vue-next"

withDefaults(
  defineProps<{
    title?: string
    width?: string
    zIndex?: number
    flush?: boolean
    top?: boolean
  }>(),
  {
    zIndex: 200,
    flush: false,
    top: false,
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
  <div
    class="modal-backdrop"
    :class="{ 'modal-backdrop--top': top }"
    :style="{ zIndex }"
    @click.self="emit('close')"
  >
    <div
      class="modal"
      :class="{ 'modal--top': top }"
      :style="width ? { width } : {}"
      role="dialog"
      aria-modal="true"
    >
      <div class="modal-header">
        <slot name="title">
          <span v-if="title" class="modal-title">{{ title }}</span>
        </slot>

        <button class="modal-close" aria-label="Close" @click="emit('close')">
          <X :size="14" />
        </button>
      </div>

      <div class="modal-body" :class="{ 'modal-body--flush': flush }">
        <slot />
      </div>

      <div v-if="$slots.footer" class="modal-footer">
        <slot name="footer" />
      </div>
    </div>
  </div>
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

@keyframes modal-in {
  from {
    opacity: 0;
    transform: scale(0.94) translateY(-12px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(32, 33, 34, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: backdrop-in 0.18s ease both;
}

.modal-backdrop--top {
  align-items: flex-start;
  padding: 40px 16px 24px;
  overflow-y: auto;
}

.modal {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  width: 420px;
  max-width: calc(100vw - 32px);
  max-height: calc(100dvh - 48px);
  display: flex;
  flex-direction: column;
  animation: modal-in 0.22s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.modal--top {
  max-height: none;
  flex-shrink: 0;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 14px;
  background: var(--bg);
  border-bottom: 1px solid var(--border-light);
  border-radius: 8px 8px 0 0;
  flex-shrink: 0;
}

.modal-title {
  font-family: var(--font);
  font-size: 15px;
  font-weight: 600;
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

.modal-body--flush {
  padding: 0;
  overflow-y: visible;
}

.modal-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-top: 1px solid var(--border-light);
  background: var(--bg);
  border-radius: 0 0 8px 8px;
  flex-shrink: 0;
}

@media (max-width: 560px) {
  .modal-backdrop--top {
    padding: 0;
  }

  .modal--top {
    max-width: 100%;
    min-height: 100dvh;
    border-radius: 0;
  }

  .modal--top .modal-header {
    border-radius: 0;
  }

  .modal--top .modal-footer {
    border-radius: 0;
  }
}

@media (max-width: 480px) {
  .modal {
    max-width: calc(100vw - 16px);
    border-radius: 6px;
  }

  .modal-body {
    padding: 12px;
  }
}
</style>
