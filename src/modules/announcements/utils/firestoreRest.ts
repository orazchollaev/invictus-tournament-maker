/**
 * Decoding for the Firestore REST API, whose values arrive wrapped by type:
 * `{ stringValue: "x" }`, `{ mapValue: { fields: { … } } }`. Announcements are
 * read over plain REST rather than through the Firebase SDK so that checking
 * for one at launch costs a single small request, not the SDK download on web.
 */

export interface RestValue {
  nullValue?: null
  booleanValue?: boolean
  integerValue?: string
  doubleValue?: number
  timestampValue?: string
  stringValue?: string
  arrayValue?: { values?: RestValue[] }
  mapValue?: { fields?: Record<string, RestValue> }
}

export interface RunQueryRow {
  document?: { name: string; fields?: Record<string, RestValue> }
  /** Present on every row, even when nothing matched — the server's clock. */
  readTime?: string
}

export function decodeValue(v: RestValue): unknown {
  if ("stringValue" in v) return v.stringValue
  if ("booleanValue" in v) return v.booleanValue
  if ("integerValue" in v) return Number(v.integerValue)
  if ("doubleValue" in v) return v.doubleValue
  // An ISO string ending in "Z": validate.ts reads it as a zoned date.
  if ("timestampValue" in v) return v.timestampValue
  if ("arrayValue" in v) return (v.arrayValue?.values ?? []).map(decodeValue)
  if ("mapValue" in v) return decodeFields(v.mapValue?.fields ?? {})
  return null
}

export function decodeFields(fields: Record<string, RestValue>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, decodeValue(v)]))
}

/** "projects/p/databases/(default)/documents/announcements/abc" → "abc" */
export function documentId(name: string): string {
  return name.slice(name.lastIndexOf("/") + 1)
}
