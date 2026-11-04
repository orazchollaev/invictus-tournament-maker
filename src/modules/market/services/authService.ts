import { Capacitor } from "@capacitor/core"
import { FirebaseAuthentication } from "@capacitor-firebase/authentication"
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

// Imported statically and used directly, never handed through a promise: a
// Capacitor plugin is a Proxy that answers every property — `then` included —
// with a native call, so returning it from an async function makes the promise
// treat it as a thenable and wait forever for a native `then` that never resolves.

export async function getCurrentUser(): Promise<MarketUser | null> {
  if (!isMarketAvailable || USE_DEV_MOCK) return null
  const { user } = await FirebaseAuthentication.getCurrentUser()
  return toMarketUser(user)
}

/** Resolves to null when the user dismisses the account picker. */
export async function signInWithGoogle(): Promise<MarketUser | null> {
  if (USE_DEV_MOCK) return (await import("./devMock")).DEV_USER
  const { user } = await FirebaseAuthentication.signInWithGoogle()
  return toMarketUser(user)
}

export async function signOut(): Promise<void> {
  if (USE_DEV_MOCK) return
  await FirebaseAuthentication.signOut()
}

/**
 * Deletes the Firebase account. Firebase refuses with `auth/requires-recent-login`
 * when the sign-in is old; the caller handles that by asking the user to sign in again.
 */
export async function deleteAccount(): Promise<void> {
  if (USE_DEV_MOCK) return
  await FirebaseAuthentication.deleteUser()
}

/** Subscribes to sign-in changes; returns the unsubscribe function. */
export async function onAuthChange(cb: (user: MarketUser | null) => void): Promise<() => void> {
  if (USE_DEV_MOCK) return () => {}
  const handle = await FirebaseAuthentication.addListener("authStateChange", (event) => {
    cb(toMarketUser(event.user))
  })
  return () => void handle.remove()
}
