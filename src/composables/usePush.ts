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

    PushNotifications.addListener("registration", (token) => {
      // Needed once to send a test push from the Firebase Console.
      console.log("FCM token:", token.value)
    })

    PushNotifications.addListener("registrationError", (err) => {
      console.warn("push registration error:", err)
    })

    PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      // Fired when the user taps a notification. Hook navigation here later.
      console.log("push tapped:", action.notification.data)
    })
  } catch {
    // best-effort: silently ignore if unavailable
  }
}
