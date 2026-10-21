import { Capacitor } from "@capacitor/core"

// Broadcast announcements only. No backend: notifications are sent manually
// from the Firebase Console (Messaging → target "All users"). This composable
// registers the device with FCM and wires up tap handling.
//
// Custom data key "link" (Firebase Console → Additional options → Custom data)
// opens that URL when the notification is tapped, e.g. the Play Store page for
// an update announcement.

// Only web and Play Store links are followed; a broadcast payload must not be
// able to launch arbitrary intent schemes.
function safeLink(value: unknown): string | null {
  if (typeof value !== "string") return null
  const url = value.trim()
  return /^(https?:\/\/|market:\/\/)/i.test(url) ? url : null
}

function openLink(url: string): void {
  // Capacitor's WebView hands URLs outside the app to the system (browser /
  // Play Store) and leaves the app page in place.
  window.location.assign(url)
}

export async function initPush(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return

  try {
    const { PushNotifications } = await import("@capacitor/push-notifications")

    let perm = await PushNotifications.checkPermissions()
    if (perm.receive === "prompt" || perm.receive === "prompt-with-rationale") {
      perm = await PushNotifications.requestPermissions()
    }
    if (perm.receive !== "granted") return

    await PushNotifications.register()

    // A device's FCM token identifies that install, and a notification payload
    // is whatever was broadcast to it — neither belongs in a release build's
    // log, which anyone with the device attached can read. Kept for the one
    // thing they are actually needed for: sending a test push from the
    // Firebase Console against a development build.
    PushNotifications.addListener("registration", (token) => {
      if (import.meta.env.DEV) console.log("FCM token:", token.value)
    })

    PushNotifications.addListener("registrationError", (err) => {
      if (import.meta.env.DEV) console.warn("push registration error:", err)
    })

    PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      const link = safeLink(action.notification.data?.link)
      if (link) openLink(link)
    })
  } catch {
    // best-effort: silently ignore if unavailable
  }
}
