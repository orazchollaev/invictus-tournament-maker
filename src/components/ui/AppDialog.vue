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
              dialogState.type === 'alert'
                ? 'primary'
                : dialogState.dangerous
                  ? 'danger-solid'
                  : 'primary',
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
  z-index: 9000;
  background: var(--scrim);
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

/* ── Design languages ────────────────────────────────────────────
   iOS renders an alert as a narrow blurred card with the buttons welded
   to the bottom edge, split by hairlines and drawn as plain accent text
   rather than as filled buttons. */
[data-design="ios"] .dialog-card {
  width: 270px;
  min-width: 0;
  max-width: 270px;
  padding: 19px 16px 0;
  border: none;
  border-radius: 14px;
  text-align: center;
  background: color-mix(in srgb, var(--surface) 82%, transparent);
  backdrop-filter: saturate(180%) blur(24px);
  -webkit-backdrop-filter: saturate(180%) blur(24px);
}
[data-design="ios"] .dialog-msg {
  font-size: 13px;
  line-height: 1.4;
  margin-bottom: 18px;
}
[data-design="ios"] .dialog-actions {
  gap: 0;
  margin: 0 -16px;
  border-top: 0.5px solid var(--border);
}
[data-design="ios"] .dialog-actions > button {
  flex: 1;
  padding: 11px var(--sp-2);
  border: none;
  border-radius: 0;
  background: none;
  background-image: none;
  font-size: 17px;
  font-weight: 400;
  color: var(--accent);
}
[data-design="ios"] .dialog-actions > button + button {
  border-left: 0.5px solid var(--border);
  font-weight: 600;
}
[data-design="ios"] .dialog-confirm.danger-solid {
  color: var(--danger);
}
[data-design="ios"] .dialog-actions > button:hover {
  background: var(--bg-hover);
  filter: none;
}

/* M3 dialogs are large-cornered tonal sheets whose actions are text
   buttons sitting bottom-right. */
[data-design="android"] .dialog-card {
  border: none;
  border-radius: 28px;
  padding: 24px;
  background: var(--surface-2);
}
[data-design="android"] .dialog-msg {
  font-size: var(--fs-base);
  margin-bottom: 24px;
}
[data-design="android"] .dialog-actions {
  gap: var(--sp-2);
}
[data-design="android"] .dialog-actions > button {
  border: none;
  border-radius: var(--radius-pill);
  padding: 10px var(--sp-3);
  min-width: 72px;
  background: none;
  background-image: none;
  font-weight: 500;
  color: var(--accent);
}
[data-design="android"] .dialog-confirm.danger-solid {
  color: var(--danger);
}
[data-design="android"] .dialog-actions > button:hover {
  background: var(--bg-hover);
  filter: none;
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
