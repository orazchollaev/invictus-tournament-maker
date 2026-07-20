<script setup lang="ts">
import { onMounted, onUnmounted } from "vue"
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  VisuallyHidden,
} from "reka-ui"
import { dialogState, resolveDialog } from "@/composables/useDialog"

function onKeydown(e: KeyboardEvent) {
  if (!dialogState.visible) return
  if (e.key === "Enter") resolveDialog(true)
}

onMounted(() => window.addEventListener("keydown", onKeydown))
onUnmounted(() => window.removeEventListener("keydown", onKeydown))
</script>

<template>
  <DialogRoot :open="dialogState.visible" @update:open="(v) => !v && resolveDialog(false)">
    <DialogPortal>
      <DialogOverlay class="dialog-backdrop" />
      <DialogContent class="dialog-card" :aria-describedby="undefined">
        <VisuallyHidden as-child>
          <DialogTitle>{{ dialogState.type === "alert" ? "Alert" : "Confirm" }}</DialogTitle>
        </VisuallyHidden>
        <p class="dialog-msg">{{ dialogState.message }}</p>
        <div class="dialog-actions">
          <button
            v-if="dialogState.type === 'confirm'"
            class="dialog-cancel"
            @click="resolveDialog(false)"
          >
            Cancel
          </button>
          <button
            :class="[
              'dialog-confirm',
              dialogState.type === 'alert'
                ? 'primary'
                : dialogState.dangerous
                  ? 'danger-solid'
                  : 'primary',
            ]"
            @click="resolveDialog(true)"
          >
            {{ dialogState.confirmLabel }}
          </button>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
.dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9000;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(2px);
}

.dialog-card {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 9000;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 24px 24px 20px;
  min-width: 280px;
  max-width: 420px;
  width: calc(100% - 40px);
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.28),
    0 2px 8px rgba(0, 0, 0, 0.12);
}

.dialog-msg {
  font-size: 14px;
  color: var(--text);
  line-height: 1.6;
  margin-bottom: 20px;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.dialog-cancel {
  background: var(--surface);
  border-color: var(--border);
  color: var(--text-muted);
}
.dialog-cancel:hover {
  border-color: var(--border);
  color: var(--text);
  background: var(--border-light);
}

.dialog-confirm.primary {
  background: var(--accent);
  background-image: linear-gradient(to bottom, transparent, rgba(0, 0, 0, 0.08));
  color: #fff;
  border-color: var(--accent-hover);
}
.dialog-confirm.primary:hover {
  background: var(--accent-hover);
}

.dialog-confirm.danger-solid {
  background: var(--danger);
  background-image: linear-gradient(to bottom, transparent, rgba(0, 0, 0, 0.1));
  color: #fff;
  border-color: var(--danger);
}
.dialog-confirm.danger-solid:hover {
  filter: brightness(0.9);
}

/* ── Transitions ─────────────────────────────────────────── */
@keyframes dialog-fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
@keyframes dialog-fade-out {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}

.dialog-backdrop[data-state="open"] {
  animation: dialog-fade-in 0.18s ease both;
}
.dialog-backdrop[data-state="closed"] {
  animation: dialog-fade-out 0.18s ease both;
}

@keyframes dialog-scale-in {
  from {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}
@keyframes dialog-scale-out {
  from {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
  to {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.95);
  }
}

.dialog-card[data-state="open"] {
  animation: dialog-scale-in 0.18s cubic-bezier(0.34, 1.4, 0.64, 1) both;
}
.dialog-card[data-state="closed"] {
  animation: dialog-scale-out 0.14s ease both;
}
</style>
