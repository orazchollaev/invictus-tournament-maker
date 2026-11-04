// modules/tournament/store/draft.ts
//
// Store actions run the engine against a plain copy of the tournament, not the
// reactive one. Every property read through a Vue proxy goes through its get
// trap (and every array method through Vue's instrumented version), and the
// engine reads a lot: standings are rebuilt from every match after each result,
// form adjustments walk the whole fixture list. Measured on a 60-team
// double-round league, "Simulate All" took 54 ms on plain objects and 3.2 s on
// the reactive ones — the difference between a tap and a frozen, white screen
// on a weak phone.
//
// So an action takes a draft (`clonePlain`), mutates it at plain-object speed,
// and `patchInto` writes back only what changed, through the proxy, so Vue still
// sees each change and nothing that stayed the same is touched. Nested objects
// that survive keep their identity, which keeps component props stable.

type Plain = Record<PropertyKey, unknown>

function isContainer(v: unknown): v is Plain | unknown[] {
  return typeof v === "object" && v !== null
}

/**
 * Deep copy of JSON-shaped data (objects, arrays, primitives). Hand-rolled
 * rather than `structuredClone`: that needs Chromium 98, and older Android
 * WebViews are still in use; and unlike a JSON round trip it keeps `undefined`
 * fields, so the patch below does not read them as deletions.
 */
export function clonePlain<T>(value: T): T {
  if (!isContainer(value)) return value
  if (Array.isArray(value)) {
    const out = new Array(value.length)
    for (let i = 0; i < value.length; i++) out[i] = clonePlain(value[i])
    return out as T
  }
  const out: Plain = {}
  for (const key in value) out[key] = clonePlain((value as Plain)[key])
  return out as T
}

/**
 * Make `target` (a reactive proxy) match `next`, where `base` is the raw object
 * behind `target`. Comparison reads `base`, which is plain and fast; only the
 * differences are written, and those go through `target` so they trigger.
 * Returns whether anything changed.
 */
export function patchInto(target: object, base: object, next: object): boolean {
  return patchNode(() => target, base, next)
}

/**
 * The reactive side is reached lazily: walking down through the proxy costs a
 * get trap (and a proxy) per object, and almost every object in a big
 * tournament is unchanged, so the walk itself only ever reads the raw side.
 * Only a branch that actually holds a difference resolves its proxy.
 */
type Lazy = () => object

function child(parent: Lazy, key: PropertyKey): Lazy {
  let resolved: object | undefined
  return () => (resolved ??= (parent() as Plain)[key] as object)
}

function patchNode(target: Lazy, base: object, next: object): boolean {
  if (Array.isArray(base) && Array.isArray(next)) return patchArray(target, base, next)
  return patchObject(target, base as Plain, next as Plain)
}

function patchArray(target: Lazy, base: unknown[], next: unknown[]): boolean {
  let changed = false
  const shared = Math.min(base.length, next.length)
  for (let i = 0; i < shared; i++) {
    if (patchSlot(target, base as unknown as Plain, i, next[i])) changed = true
  }
  if (next.length > base.length) {
    const list = target() as unknown[]
    for (let i = base.length; i < next.length; i++) list.push(next[i])
    changed = true
  } else if (next.length < base.length) {
    ;(target() as unknown[]).length = next.length
    changed = true
  }
  return changed
}

function patchObject(target: Lazy, base: Plain, next: Plain): boolean {
  let changed = false
  for (const key in base) {
    if (!(key in next)) {
      delete (target() as Plain)[key]
      changed = true
    }
  }
  for (const key in next) {
    if (!(key in base)) {
      ;(target() as Plain)[key] = next[key]
      changed = true
    } else if (patchSlot(target, base, key, next[key])) {
      changed = true
    }
  }
  return changed
}

function patchSlot(target: Lazy, base: Plain, key: PropertyKey, value: unknown): boolean {
  const old = base[key]
  if (old === value) return false
  if (isContainer(old) && isContainer(value) && Array.isArray(old) === Array.isArray(value)) {
    // The child proxy, once resolved, makes writes below it trigger too.
    return patchNode(child(target, key), old, value)
  }
  ;(target() as Plain)[key] = value
  return true
}
