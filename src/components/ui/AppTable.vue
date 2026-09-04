<script setup lang="ts">
/**
 * Data table shell: horizontal scroll container + the canonical
 * `.data-table` look. Column widths stay with the caller — pass
 * `<colgroup>` or per-cell classes through the default slot.
 */
withDefaults(
  defineProps<{
    stickyHead?: boolean
    dense?: boolean
    flush?: boolean
  }>(),
  {
    flush: true,
    dense: true,
  }
)
</script>

<template>
  <div class="table-scroll">
    <table
      class="table"
      :class="{ 'table--dense': dense, 'table--sticky': stickyHead, 'table--flush': flush }"
    >
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
  /* The global `th, td` reset (assets/style/elements.css) puts a border on
     all four sides — clear it here, then re-add only the one this table
     actually wants, so no stray vertical rule survives between columns. */
  border: none;
  border-bottom: 1px solid var(--border-light);
  white-space: nowrap;
}

.table :deep(td) {
  padding: var(--sp-3) var(--sp-4);
  border: none;
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

.table--flush.table--dense :deep(td) {
  padding-block: var(--sp-1);
}

/* ── Design languages ────────────────────────────────────────────
   iOS reads a table as a grouped list: a quiet sentence-case header with
   no fill, 0.5px separators between rows, and tabular figures so the
   numeric columns line up the way a system list does. */
[data-design="ios"] .table {
  font-variant-numeric: tabular-nums;
}
[data-design="ios"] .table :deep(th) {
  text-transform: none;
  letter-spacing: 0;
  font-weight: 400;
  font-size: var(--fs-sm);
  color: var(--text-muted);
  padding-bottom: var(--sp-2);
  border-bottom: 0.5px solid var(--border);
}
[data-design="ios"] .table :deep(td) {
  border-bottom: 0.5px solid var(--border-light);
}
[data-design="ios"] .table :deep(tbody tr:hover) {
  background: transparent;
}
[data-design="ios"] .table :deep(tbody tr:active) {
  background: var(--bg-hover);
}
[data-design="ios"] .table--sticky :deep(thead th) {
  background: var(--surface);
}

/* M3 keeps the rows open and marks structure with tone instead of rules:
   a tinted header, no separators, and a tonal row under the pointer. */
[data-design="android"] .table :deep(th) {
  text-transform: none;
  letter-spacing: 0.01em;
  font-weight: 600;
  font-size: var(--fs-sm);
  color: var(--text);
  background: var(--surface-2);
  padding-block: var(--sp-3);
  border-bottom-color: transparent;
}
[data-design="android"] .table--sticky :deep(thead th) {
  background: var(--surface-2);
}
[data-design="android"] .table :deep(td) {
  padding-block: 14px;
  border-bottom-color: color-mix(in srgb, var(--border-light) 60%, transparent);
}
[data-design="android"] .table :deep(tbody tr:hover),
[data-design="android"] .table :deep(tbody tr:active) {
  background: color-mix(in srgb, var(--accent) 8%, transparent);
}
[data-design="android"] .table--dense :deep(td) {
  padding-block: var(--sp-3);
}

/* Flush: no ruled lines anywhere, whichever platform theme is active —
   wins over the design-language border rules above since it's declared
   after them. Rows are flat tinted blocks, not bordered/rounded cards —
   no radius at all, just a hairline gap so it reads as "list", not "grid".
   Background lives on the <tr>, not the <td>, so a caller's own per-row
   tint (champion row, qualify/wildcard zones, …) still shows through — an
   opaque td background would paint over it. */
.table--flush {
  border-collapse: collapse;
}
.table--flush :deep(th) {
  border: none !important;
  padding-block: var(--sp-1) !important;
  font-size: var(--fs-xs) !important;
  font-weight: 500 !important;
  letter-spacing: 0 !important;
  text-transform: none !important;
  color: var(--text-muted) !important;
  background: transparent !important;
  opacity: 0.8;
}
.table--flush :deep(td) {
  border: none !important;
  border-radius: 0 !important;
}
.table--flush :deep(tbody tr) {
  background: var(--surface-2);
  transition: background var(--dur-fast) var(--ease);
}
.table--flush :deep(tbody tr:hover) {
  background: color-mix(in srgb, var(--accent) 7%, var(--surface-2));
}

@media (max-width: 600px) {
  .table :deep(th),
  .table :deep(td) {
    padding: var(--sp-2) var(--sp-3);
    font-size: var(--fs-sm);
  }
}
</style>
