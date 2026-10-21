/** One editable category line in the team form. `key` is empty until picked. */
export interface CategoryRow {
  id: number
  key: string
  value: string
}

let nextRowId = 0

export function newCategoryRow(key = "", value = ""): CategoryRow {
  return { id: nextRowId++, key, value }
}

export function categoriesToRows(categories: Record<string, string> | undefined): CategoryRow[] {
  return Object.entries(categories ?? {}).map(([k, v]) => newCategoryRow(k, v))
}

/** A row with a key must carry a value; a row with neither is just dropped. */
export function categoryRowsValid(rows: CategoryRow[]): boolean {
  return rows.every((r) => !r.key || r.value.trim())
}

export function rowsToCategories(rows: CategoryRow[]): Record<string, string> | undefined {
  const out: Record<string, string> = {}
  for (const r of rows) {
    const value = r.value.trim()
    if (r.key && value) out[r.key] = value
  }
  return Object.keys(out).length ? out : undefined
}
