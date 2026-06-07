<script setup lang="ts">
import { onMounted, onUnmounted } from "vue"
import { dialogState, resolveDialog } from "@/composables/useDialog"

function onKeydown(e: KeyboardEvent) {
  if (!dialogState.visible) return
  if (e.key === "Escape") resolveDialog(false)
  if (e.key === "Enter") resolveDialog(true)
}

onMounted(() => window.addEventListener("keydown", onKeydown))
onUnmounted(() => window.removeEventListener("keydown", onKeydown))
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog-fade">
      <div v-if="dialogState.visible" class="dialog-backdrop" @click.self="resolveDialog(false)">
        <Transition name="dialog-scale" appear>
          <div v-if="dialogState.visible" class="dialog-card" role="dialog" aria-modal="true">
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
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(2px);
}

.dialog-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 24px 24px 20px;
  min-width: 280px;
  max-width: 420px;
  width: 100%;
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
.dialog-fade-enter-active,
.dialog-fade-leave-active {
  transition: opacity 0.18s ease;
}
.dialog-fade-enter-from,
.dialog-fade-leave-to {
  opacity: 0;
}

.dialog-scale-enter-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s cubic-bezier(0.34, 1.4, 0.64, 1);
}
.dialog-scale-leave-active {
  transition:
    opacity 0.14s ease,
    transform 0.14s ease;
}
.dialog-scale-enter-from {
  opacity: 0;
  transform: scale(0.9);
}
.dialog-scale-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
