import { Capacitor } from "@capacitor/core"
import { FirebaseAuthentication } from "@capacitor-firebase/authentication"
import { ensureFirebase, webAuthReady } from "@/lib/firebase"
import type { MarketUser } from "../types"

/** Android (native SDKs) and the web build (JS SDK). iOS has no Firebase config. */
export const isMarketAvailable = Capacitor.getPlatform() !== "ios"

/**
 * Desktop `pnpm dev` uses an in-memory fake (devMock.ts) so development never
 * writes to the live market. `pnpm build && pnpm preview`, or VITE_MARKET_LIVE=1,
 * talks to the real Firebase instead.
 */
export const USE_DEV_MOCK =
  import.meta.env.DEV && !Capacitor.isNativePlatform() && !import.meta.env.VITE_MARKET_LIVE

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
  await webAuthReady()
  const { user } = await FirebaseAuthentication.getCurrentUser()
  return toMarketUser(user)
}

/** Resolves to null when the user dismisses the account picker. */
export async function signInWithGoogle(): Promise<MarketUser | null> {
  if (USE_DEV_MOCK) return (await import("./devMock")).DEV_USER
  await ensureFirebase()
  const { user } = await FirebaseAuthentication.signInWithGoogle()
  return toMarketUser(user)
}

export async function signOut(): Promise<void> {
  if (USE_DEV_MOCK) return
  await ensureFirebase()
  await FirebaseAuthentication.signOut()
}

/**
 * Deletes the Firebase account. Firebase refuses with `auth/requires-recent-login`
 * when the sign-in is old; the caller handles that by asking the user to sign in again.
 */
export async function deleteAccount(): Promise<void> {
  if (USE_DEV_MOCK) return
  await ensureFirebase()
  await FirebaseAuthentication.deleteUser()
}

/** Subscribes to sign-in changes; returns the unsubscribe function. */
export async function onAuthChange(cb: (user: MarketUser | null) => void): Promise<() => void> {
  if (USE_DEV_MOCK) return () => {}
  await ensureFirebase()
  const handle = await FirebaseAuthentication.addListener("authStateChange", (event) => {
    cb(toMarketUser(event.user))
  })
  return () => void handle.remove()
}
