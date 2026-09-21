import { Capacitor } from "@capacitor/core"

// Firebase Analytics wrapper. Native-only (web build no-ops). Best-effort:
// analytics must never break the app, so every call swallows its own errors.
//
// Install counts don't need a custom event — the SDK auto-logs "first_open"
// once collection is enabled, and Firebase Console surfaces it as "New users".

export async function initAnalytics(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return

  try {
    const { FirebaseAnalytics } = await import("@capacitor-firebase/analytics")
    await FirebaseAnalytics.setEnabled({ enabled: true })
  } catch {
    // best-effort: silently ignore if unavailable
  }
}

export async function logScreenView(screenName: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return

  try {
    const { FirebaseAnalytics } = await import("@capacitor-firebase/analytics")
    await FirebaseAnalytics.setCurrentScreen({ screenName })
  } catch {
    // best-effort: silently ignore if unavailable
  }
}

/**
 * A crash that got past every local `catch`, reported so it is visible as
 * something other than a user's bug report.
 *
 * Deliberately lossy: Analytics caps an event parameter's length, and a stack
 * is the part worth keeping under that cap. `where` says which net caught it
 * (render, promise, window), because the same message means different things
 * from each.
 */
export async function logError(where: string, error: unknown): Promise<void> {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
  const stack = error instanceof Error ? (error.stack ?? "") : ""
  if (import.meta.env.DEV) console.error(`[${where}]`, error)
  await logEvent("app_error", { where, message: message.slice(0, 100), stack: stack.slice(0, 300) })
}

export async function logEvent(name: string, params?: Record<string, unknown>): Promise<void> {
  if (!Capacitor.isNativePlatform()) return

  try {
    const { FirebaseAnalytics } = await import("@capacitor-firebase/analytics")
    await FirebaseAnalytics.logEvent({ name, params })
  } catch {
    // best-effort: silently ignore if unavailable
  }
}
