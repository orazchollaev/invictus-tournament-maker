import { Capacitor } from "@capacitor/core"

// Broadcast announcements only. No backend: notifications are sent manually
// from the Firebase Console (Messaging → target "All users"). This composable
// just registers the device with FCM and wires up tap handling.
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
      // Fired when the user taps a notification. Hook navigation here later.
      if (import.meta.env.DEV) console.log("push tapped:", action.notification.data)
    })
  } catch {
    // best-effort: silently ignore if unavailable
  }
}
