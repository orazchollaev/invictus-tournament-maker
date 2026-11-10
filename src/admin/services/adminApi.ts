/**
 * Firebase for the admin panel: Google sign-in and announcement writes.
 *
 * Writes go straight from the browser. firestore.rules lets only ADMIN_EMAIL
 * (with a verified address) write `announcements/*`, so the check below is a
 * courtesy that signs other accounts out early — the rule is what enforces it.
 *
 * The document shape matches scripts/announce.ts's toDocument, so the CLI and
 * the panel can edit the same announcements.
 */
import { initializeApp } from "firebase/app"
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as fbSignOut,
  type User,
} from "firebase/auth"
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from "firebase/firestore/lite"
import { FIREBASE_WEB_CONFIG } from "@/constants/firebase"
import { ANNOUNCEMENTS_COLLECTION } from "@/modules/announcements/constants"
import type { Announcement } from "@/modules/announcements/types"
import { parseAnnouncement } from "@/modules/announcements/utils/validate"
import { ADMIN_EMAIL } from "../constants"

const app = initializeApp(FIREBASE_WEB_CONFIG)
const auth = getAuth(app)
const db = getFirestore(app)

export function isAdmin(user: User | null): boolean {
  return !!user && user.emailVerified && user.email?.toLowerCase() === ADMIN_EMAIL
}

/** Calls back with the signed-in admin, or null. Any other account is signed out. */
export function watchAdmin(callback: (user: User | null, rejected: string | null) => void) {
  return onAuthStateChanged(auth, (user) => {
    if (!user || isAdmin(user)) return callback(user, null)
    const email = user.email
    void fbSignOut(auth)
    callback(null, email)
  })
}

export async function signIn(): Promise<void> {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ login_hint: ADMIN_EMAIL, prompt: "select_account" })
  await signInWithPopup(auth, provider)
}

export function signOut(): Promise<void> {
  return fbSignOut(auth)
}

export interface StoredAnnouncement {
  id: string
  /** null when the document does not pass the app's validator — the app skips it. */
  announcement: Announcement | null
  errors: string[]
  updatedAt: number | null
}

export async function listAnnouncements(): Promise<StoredAnnouncement[]> {
  const snap = await getDocs(collection(db, ANNOUNCEMENTS_COLLECTION))
  const rows = snap.docs.map((d): StoredAnnouncement => {
    const data = d.data()
    const result = parseAnnouncement(d.id, data)
    const updated = data.updatedAt
    return {
      id: d.id,
      announcement: result.ok ? result.announcement : null,
      errors: result.ok ? [] : result.errors,
      updatedAt: updated instanceof Timestamp ? updated.toMillis() : null,
    }
  })
  // Newest window first; broken documents at the top so they get noticed.
  return rows.sort(
    (a, b) => (b.announcement?.startAt ?? Infinity) - (a.announcement?.startAt ?? Infinity)
  )
}

export async function exists(id: string): Promise<boolean> {
  return (await getDoc(doc(db, ANNOUNCEMENTS_COLLECTION, id))).exists()
}

/** Creates or replaces. Only the validated fields are written, so a typo never reaches Firestore. */
export function saveAnnouncement(a: Announcement): Promise<void> {
  return setDoc(doc(db, ANNOUNCEMENTS_COLLECTION, a.id), {
    enabled: a.enabled,
    startAt: Timestamp.fromMillis(a.startAt),
    endAt: Timestamp.fromMillis(a.endAt),
    priority: a.priority,
    frequency: a.frequency,
    platforms: a.platforms,
    minVersion: a.minVersion,
    maxVersion: a.maxVersion,
    defaultLocale: a.defaultLocale,
    content: a.content,
    action: a.action,
    imageUrl: a.imageUrl,
    updatedAt: serverTimestamp(),
  })
}

export function setEnabled(id: string, enabled: boolean): Promise<void> {
  return updateDoc(doc(db, ANNOUNCEMENTS_COLLECTION, id), {
    enabled,
    updatedAt: serverTimestamp(),
  })
}

export function deleteAnnouncement(id: string): Promise<void> {
  return deleteDoc(doc(db, ANNOUNCEMENTS_COLLECTION, id))
}
