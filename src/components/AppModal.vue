<script setup lang="ts">
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
</script>

<template>
  <div class="modal-backdrop" :style="{ zIndex }" @click.self="emit('close')">
    <div class="modal" :style="width ? { width } : {}">
      <div v-if="title" class="modal-header">{{ title }}</div>
      <div class="modal-body">
        <slot />
      </div>
    </div>
  </div>
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
}

@media (max-width: 480px) {
  .modal {
    max-width: calc(100vw - 16px);
  }
  .modal-body {
    padding: 12px;
  }
}
.modal-header {
  font-family: var(--font);
  font-size: 16px;
  border-bottom: 1px solid var(--border-light);
  padding: 10px 14px;
  background: var(--bg);
}
.modal-body {
  padding: 14px;
}
</style>
