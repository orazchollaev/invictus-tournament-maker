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
    await FirebaseAnalytics.setCollectionEnabled({ enabled: true })
  } catch {
    // best-effort: silently ignore if unavailable
  }
}

export async function logScreenView(screenName: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return

  try {
    const { FirebaseAnalytics } = await import("@capacitor-firebase/analytics")
    await FirebaseAnalytics.setScreenName({ screenName })
  } catch {
    // best-effort: silently ignore if unavailable
  }
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
