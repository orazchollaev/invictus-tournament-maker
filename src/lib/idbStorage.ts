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
  async setItem(key: string, value: string) {
    try {
      await set(key, value)
    } catch {
      localStorage.setItem(key, value)
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
