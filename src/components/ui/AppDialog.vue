<script setup lang="ts">
import { onMounted, onUnmounted, watch } from "vue"
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  VisuallyHidden,
} from "reka-ui"
import { dialogState, resolveDialog } from "@/composables/useDialog"
import { useHaptic } from "@/composables/useHaptic"

const { tap: hapticTap, warning: hapticWarning } = useHaptic()

function confirm() {
  // Dangerous dialogs already buzzed the warning on open; the tap itself is just a commit.
  hapticTap()
  resolveDialog(true)
}

function cancel() {
  hapticTap()
  resolveDialog(false)
}

function onKeydown(e: KeyboardEvent) {
  if (!dialogState.visible) return
  if (e.key === "Enter") resolveDialog(true)
}

onMounted(() => window.addEventListener("keydown", onKeydown))
onUnmounted(() => window.removeEventListener("keydown", onKeydown))

/** The moment a destructive confirm appears, not just when it's tapped. */
watch(
  () => dialogState.visible,
  (visible) => {
    if (visible && dialogState.dangerous) hapticWarning()
  }
)
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
          <button v-if="dialogState.type === 'confirm'" class="dialog-cancel" @click="cancel">
            Cancel
          </button>
          <button
            :class="[
              'dialog-confirm',
              { 'dialog-confirm--danger': dialogState.type !== 'alert' && dialogState.dangerous },
            ]"
            @click="confirm"
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
  z-index: var(--z-toast);
  background: var(--scrim);
}

/* An alert: a narrow blurred card with the buttons welded to the bottom
   edge, split by hairlines and drawn as plain accent text rather than as
   filled buttons. */
.dialog-card {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: var(--z-toast);
  background: color-mix(in srgb, var(--surface) 96%, transparent);
  border: none;
  border-radius: 14px;
  padding: 19px 16px 0;
  width: 270px;
  max-width: 270px;
  text-align: center;
  box-shadow: var(--elev-3);
}

.dialog-msg {
  font-size: 13px;
  color: var(--text);
  line-height: 1.4;
  margin-bottom: 18px;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  margin: 0 -16px;
  border-top: 0.5px solid var(--border);
}
.dialog-actions > button {
  flex: 1;
  padding: 11px var(--sp-2);
  border: none;
  border-radius: 0;
  background: none;
  font-size: 17px;
  font-weight: 400;
  color: var(--accent);
}
.dialog-actions > button + button {
  border-left: 0.5px solid var(--border);
  font-weight: 600;
}
/* Qualified by the container so it outranks the plain button rule above. */
.dialog-actions > .dialog-confirm--danger {
  color: var(--danger);
}
.dialog-actions > button:hover {
  background: var(--bg-hover);
  box-shadow: none;
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
