import { Capacitor } from "@capacitor/core"
import type { MarketUser } from "../types"

/** The market runs on the native Firebase SDKs, so it only exists in the Android app. */
export const isMarketAvailable = Capacitor.isNativePlatform() || import.meta.env.DEV

/** Desktop `pnpm dev` only: no native Firebase there, so a fake one (devMock.ts) stands in. */
export const USE_DEV_MOCK = import.meta.env.DEV && !Capacitor.isNativePlatform()

type FirebaseUser = { uid: string; displayName: string | null; email: string | null }

function toMarketUser(user: FirebaseUser | null): MarketUser | null {
  if (!user) return null
  return { uid: user.uid, name: user.displayName?.trim() || "Anonymous" }
}

async function auth() {
  const { FirebaseAuthentication } = await import("@capacitor-firebase/authentication")
  return FirebaseAuthentication
}

export async function getCurrentUser(): Promise<MarketUser | null> {
  if (!isMarketAvailable || USE_DEV_MOCK) return null
  const { user } = await (await auth()).getCurrentUser()
  return toMarketUser(user)
}

/** Resolves to null when the user dismisses the account picker. */
export async function signInWithGoogle(): Promise<MarketUser | null> {
  if (USE_DEV_MOCK) return (await import("./devMock")).DEV_USER
  const { user } = await (await auth()).signInWithGoogle()
  return toMarketUser(user)
}

export async function signOut(): Promise<void> {
  if (USE_DEV_MOCK) return
  await (await auth()).signOut()
}

/**
 * Deletes the Firebase account. Firebase refuses with `auth/requires-recent-login`
 * when the sign-in is old; the caller handles that by asking the user to sign in again.
 */
export async function deleteAccount(): Promise<void> {
  if (USE_DEV_MOCK) return
  await (await auth()).deleteUser()
}

/** Subscribes to sign-in changes; returns the unsubscribe function. */
export async function onAuthChange(cb: (user: MarketUser | null) => void): Promise<() => void> {
  if (USE_DEV_MOCK) return () => {}
  const plugin = await auth()
  const handle = await plugin.addListener("authStateChange", (event) => {
    cb(toMarketUser(event.user))
  })
  return () => void handle.remove()
}
