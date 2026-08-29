import { get, set, del } from "idb-keyval"
import type { IStorage } from "pinia-plugin-persistedstate-2"

export const idbStorage: IStorage = {
  async getItem(key: string) {
    try {
      const existing = await get(key)
      if (existing !== undefined) return existing

      const legacy = localStorage.getItem(key)
      if (legacy === null) return undefined
      try {
        await set(key, legacy)
        localStorage.removeItem(key)
      } catch {}
      return legacy
    } catch {
      return localStorage.getItem(key) ?? undefined
    }
  },
  // `value` is usually a plain string, but our own `idleSerialize` (see
  // main.ts) hands back a Promise instead — it defers the actual
  // `JSON.stringify` to idle time so a match save doesn't stall on
  // stringifying the whole tournament history. Awaiting a plain string is
  // a no-op, so this stays correct either way.
  async setItem(key: string, value: string | Promise<string>) {
    const resolved = await value
    try {
      await set(key, resolved)
    } catch {
      localStorage.setItem(key, resolved)
    }
  },
  async removeItem(key: string) {
    try {
      await del(key)
    } catch {
      // ignore
    }
    localStorage.removeItem(key)
  },
}
