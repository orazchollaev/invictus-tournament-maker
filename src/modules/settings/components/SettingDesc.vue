<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue"
import { Info } from "@lucide/vue"

const open = ref(false)
const rootEl = ref<HTMLElement>()

function toggle() {
  open.value = !open.value
}

function onDocClick(e: MouseEvent) {
  if (!rootEl.value?.contains(e.target as Node)) {
    open.value = false
  }
}

onMounted(() => document.addEventListener("click", onDocClick))
onUnmounted(() => document.removeEventListener("click", onDocClick))
</script>

<template>
  <div class="setting-desc sd-desktop"><slot /></div>
  <div ref="rootEl" class="sd-mobile">
    <button class="sd-btn" type="button" @click="toggle">
      <Info :size="13" />
    </button>
    <div v-if="open" class="sd-popover">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.sd-desktop {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 2px;
  line-height: 1.4;
}

.sd-mobile {
  display: none;
  position: relative;
}

@media (max-width: 640px) {
  .sd-desktop {
    display: none;
  }
  .sd-mobile {
    display: flex;
    align-items: center;
  }
}

.sd-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border: none;
  background: none;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: 50%;
  transition:
    color 0.12s,
    background 0.12s;
}

.sd-btn:hover {
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 10%, transparent);
}

.sd-popover {
  position: absolute;
  right: 0;
  top: calc(100% + 4px);
  z-index: 200;
  width: 260px;
  max-width: calc(100vw - 32px);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 8px 10px;
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.5;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}
</style>
