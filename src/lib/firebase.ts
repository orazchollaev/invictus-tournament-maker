import { Capacitor } from "@capacitor/core"
import { FIREBASE_WEB_CONFIG } from "@/constants/firebase"

let ready: Promise<void> | null = null

/**
 * Starts the Firebase JS SDK on the web, once. Must run before any Firebase
 * plugin is touched there: the plugins' web code calls getAuth()/getFirestore()
 * as soon as it loads. Native apps configure themselves from google-services.json,
 * so this is a no-op on Android. Loaded lazily — the SDK only arrives with the market.
 */
export function ensureFirebase(): Promise<void> {
  if (Capacitor.isNativePlatform()) return Promise.resolve()
  ready ??= import("firebase/app").then(({ getApps, initializeApp }) => {
    if (!getApps().length) initializeApp(FIREBASE_WEB_CONFIG)
  })
  return ready
}
