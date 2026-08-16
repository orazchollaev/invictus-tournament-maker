<script setup lang="ts">
/**
 * Data table shell: horizontal scroll container + the canonical
 * `.data-table` look. Column widths stay with the caller — pass
 * `<colgroup>` or per-cell classes through the default slot.
 */
withDefaults(
  defineProps<{
    /** Keep the header row visible while the body scrolls. */
    stickyHead?: boolean
    /** Tighter cells for dense standings/bracket tables. */
    dense?: boolean
  }>(),
  {}
)
</script>

<template>
  <div class="table-scroll">
    <table class="table" :class="{ 'table--dense': dense, 'table--sticky': stickyHead }">
      <slot />
    </table>
  </div>
</template>

<style scoped>
.table-scroll {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--fs-base);
}

.table :deep(th) {
  text-align: start;
  font-family: var(--font-ui);
  font-size: var(--fs-xs);
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-muted);
  padding: var(--sp-3) var(--sp-4) var(--sp-2);
  border-bottom: 1px solid var(--border-light);
  white-space: nowrap;
}

.table :deep(td) {
  padding: var(--sp-3) var(--sp-4);
  border-bottom: 1px solid var(--border-light);
  vertical-align: middle;
}

.table :deep(tbody tr:last-child td) {
  border-bottom: none;
}

.table--sticky :deep(thead th) {
  position: sticky;
  top: 0;
  z-index: var(--z-sticky);
  background: var(--bg);
}

.table--dense :deep(th),
.table--dense :deep(td) {
  padding: var(--sp-2) var(--sp-3);
  font-size: var(--fs-sm);
}

@media (max-width: 600px) {
  .table :deep(th),
  .table :deep(td) {
    padding: var(--sp-2) var(--sp-3);
    font-size: var(--fs-sm);
  }
}
</style>
