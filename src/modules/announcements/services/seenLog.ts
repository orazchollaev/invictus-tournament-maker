import { SEEN_KEY } from "../constants"
import type { SeenLog } from "../types"

/** Which announcements this device has shown, and when. */
export function readSeenLog(): SeenLog {
  try {
    const raw = JSON.parse(localStorage.getItem(SEEN_KEY) ?? "{}") as unknown
    if (typeof raw !== "object" || raw === null) return {}
    return Object.fromEntries(
      Object.entries(raw as Record<string, { last?: unknown; count?: unknown }>).filter(
        ([, e]) => typeof e?.last === "number" && typeof e?.count === "number"
      )
    ) as SeenLog
  } catch {
    return {}
  }
}

/** Returns false when storage is unavailable. */
export function writeSeenLog(log: SeenLog): boolean {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(log))
    return true
  } catch {
    return false
  }
}
