<script setup lang="ts">
import { onMounted, onUnmounted } from "vue"
import { useI18n } from "vue-i18n"

const { t } = useI18n()

defineProps<{ show: boolean }>()
const emit = defineEmits<{ dismiss: [] }>()

let timer = 0
onMounted(() => {
  timer = window.setTimeout(() => emit("dismiss"), 3500)
})
onUnmounted(() => clearTimeout(timer))
</script>

<template>
  <Transition name="hint-fade">
    <div v-if="show" class="zoom-hint" role="status">
      <span class="pinch-icon" aria-hidden="true">
        <span class="finger finger-a" />
        <span class="finger finger-b" />
      </span>
      <span>{{ t("bracket.zoomHint") }}</span>
    </div>
  </Transition>
</template>

<style scoped>
.zoom-hint {
  position: absolute;
  left: 50%;
  bottom: var(--sp-4);
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-3);
  background: var(--scrim-strong);
  color: #fff;
  border-radius: var(--radius-pill);
  font-size: var(--fs-sm);
  font-family: var(--font);
  pointer-events: none;
  z-index: 5;
  white-space: nowrap;
  box-shadow: var(--shadow-md);
}

.pinch-icon {
  position: relative;
  width: 22px;
  height: 22px;
  flex-shrink: 0;
}

.finger {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #fff;
  animation: pinch 1.6s ease-in-out infinite;
}

.finger-a {
  animation-name: pinch-a;
}
.finger-b {
  animation-name: pinch-b;
}

@keyframes pinch-a {
  0%,
  100% {
    transform: translate(-9px, -9px);
  }
  50% {
    transform: translate(-2px, -2px);
  }
}

@keyframes pinch-b {
  0%,
  100% {
    transform: translate(3px, 3px);
  }
  50% {
    transform: translate(-4px, -4px);
  }
}

.hint-fade-enter-active,
.hint-fade-leave-active {
  transition:
    opacity var(--dur-2) var(--ease),
    transform var(--dur-2) var(--ease);
}
.hint-fade-enter-from,
.hint-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(6px);
}

@media (prefers-reduced-motion: reduce) {
  .finger {
    animation: none;
  }
}
</style>
