<script setup lang="ts">
import { useI18n } from "vue-i18n"
import { ref, onMounted, onUnmounted } from "vue"
import { Info } from "@lucide/vue"

const { t } = useI18n()

const open = ref(false)
const btn = ref<HTMLElement>()
const pos = ref({ top: 0, right: 0 })

const GAP = 6
const EDGE = 12

function toggle() {
  open.value = !open.value
  if (!open.value) return

  const r = btn.value?.getBoundingClientRect()
  if (!r) return
  pos.value = {
    top: r.bottom + GAP,
    right: Math.max(EDGE, window.innerWidth - r.right),
  }
}

function close() {
  open.value = false
}

function onDocClick(e: MouseEvent) {
  if (!btn.value?.contains(e.target as Node)) close()
}

onMounted(() => {
  document.addEventListener("click", onDocClick)
  window.addEventListener("scroll", close, true)
  window.addEventListener("resize", close)
})

onUnmounted(() => {
  document.removeEventListener("click", onDocClick)
  window.removeEventListener("scroll", close, true)
  window.removeEventListener("resize", close)
})
</script>

<template>
  <p class="sd-desktop"><slot /></p>

  <button
    ref="btn"
    type="button"
    class="sd-btn"
    :aria-label="t('common.info')"
    :aria-expanded="open"
    @click.stop="toggle"
  >
    <Info :size="14" />
  </button>

  <Teleport to="body">
    <div
      v-if="open"
      class="sd-popover"
      :style="{ top: `${pos.top}px`, right: `${pos.right}px` }"
      @click.stop
    >
      <slot />
    </div>
  </Teleport>
</template>

<style scoped>
.sd-desktop {
  margin: 2px 0 0;
  font-size: var(--fs-sm);
  color: var(--text-muted);
  line-height: 1.4;
}

/* The trigger replaces the text only on narrow screens. */
.sd-btn {
  display: none;
}

@media (max-width: 600px) {
  .sd-desktop {
    display: none;
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
    flex-shrink: 0;
    transition:
      color var(--dur-fast) var(--ease),
      background var(--dur-fast) var(--ease);
  }
  .sd-btn:hover,
  .sd-btn[aria-expanded="true"] {
    color: var(--accent);
    background: var(--accent-subtle);
  }
}

.sd-popover {
  position: fixed;
  z-index: var(--z-dropdown);
  width: 260px;
  max-width: calc(100vw - var(--sp-5));
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: var(--sp-2) var(--sp-3);
  font-size: var(--fs-sm);
  color: var(--text-muted);
  line-height: 1.5;
  box-shadow: var(--elev-2);
}

/* ── Design languages ────────────────────────────────────────────
   The same popover shell the menus use. */
[data-design="ios"] .sd-popover {
  border-color: transparent;
  border-radius: 14px;
  background: color-mix(in srgb, var(--surface) 86%, transparent);
  backdrop-filter: saturate(180%) blur(24px);
  -webkit-backdrop-filter: saturate(180%) blur(24px);
  box-shadow: var(--elev-3);
}

[data-design="android"] .sd-popover {
  border-color: transparent;
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  box-shadow: var(--elev-2);
}

/* The info dot is 20px by design — grow only what the finger hits. */
.sd-btn {
  position: relative;
}
.sd-btn::after {
  content: "";
  position: absolute;
  inset: 50% auto auto 50%;
  width: max(100%, var(--tap-min));
  height: max(100%, var(--tap-min));
  transform: translate(-50%, -50%);
}
</style>
