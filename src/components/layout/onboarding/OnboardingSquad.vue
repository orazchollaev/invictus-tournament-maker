<script setup lang="ts">
import { Plus } from "@lucide/vue"
import { FlagCircle } from "@/modules/teams/components"

defineProps<{ active: boolean }>()

const FLAGS = ["br", "de", "tr", "ar", "fr", "jp", "es"]
</script>

<template>
  <div class="squad" :class="{ 'squad--on': active }">
    <span
      v-for="(code, i) in FLAGS"
      :key="code"
      class="chip"
      :style="{ '--i': i, '--float': `${3 + (i % 3) * 0.6}s` }"
    >
      <FlagCircle :code="code" :size="56" />
    </span>
    <span class="chip chip--add" :style="{ '--i': FLAGS.length, '--float': '3.4s' }">
      <Plus :size="24" />
    </span>
  </div>
</template>

<style scoped>
.squad {
  display: grid;
  grid-template-columns: repeat(4, 56px);
  justify-content: center;
  align-content: center;
  gap: var(--sp-4);
  height: 100%;
}

.chip {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  opacity: 0;
  scale: 0.3;
  box-shadow: 0 4px 14px color-mix(in srgb, var(--text) 16%, transparent);
}
/* Stagger the rows so the grid reads as a cluster, not a table. */
.chip:nth-child(even) {
  translate: 0 10px;
}

.chip--add {
  border: 2px dashed var(--accent);
  color: var(--accent);
  background: var(--accent-subtle);
  box-shadow: none;
}

.squad--on .chip {
  animation:
    pop 0.5s cubic-bezier(0.3, 1.5, 0.5, 1) calc(var(--i) * 0.08s) forwards,
    float var(--float) ease-in-out calc(0.8s + var(--i) * 0.1s) infinite;
}

@keyframes pop {
  to {
    opacity: 1;
    scale: 1;
  }
}
@keyframes float {
  50% {
    transform: translateY(-5px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .squad--on .chip {
    animation: pop 0.01s forwards;
  }
}
</style>
