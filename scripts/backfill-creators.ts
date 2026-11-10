/**
 * Rebuilds the market's `creators/{uid}` totals from the datasets themselves.
 *
 *   pnpm market:backfill            preview, writes nothing
 *   pnpm market:backfill --write    write the totals
 *
 * Run once before the creators list goes live (every dataset published before
 * it has no creator document yet), and again whenever the counts look off —
 * it is idempotent. `downloads` becomes the sum of each creator's current
 * datasets' counters, `datasets` how many they have up.
 *
 * Credentials: same as `pnpm announce` — --key <path>,
 * GOOGLE_APPLICATION_CREDENTIALS, or .secrets/firebase-admin.json.
 */
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { cert, initializeApp } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"

const ROOT = resolve(import.meta.dirname, "..")
const args = process.argv.slice(2)
const write = args.includes("--write")
const flag = args.indexOf("--key")
const keyPath =
  (flag >= 0 ? args[flag + 1] : undefined) ??
  process.env.GOOGLE_APPLICATION_CREDENTIALS ??
  resolve(ROOT, ".secrets/firebase-admin.json")

if (!existsSync(keyPath)) {
  console.error(`No service-account key at ${keyPath}. See scripts/announce.ts for how to get one.`)
  process.exit(1)
}

initializeApp({ credential: cert(JSON.parse(readFileSync(keyPath, "utf8"))) })
const db = getFirestore()

interface Totals {
  name: string
  newest: number
  datasets: number
  downloads: number
}

const snap = await db.collection("datasets").get()
const byUid = new Map<string, Totals>()
for (const doc of snap.docs) {
  const d = doc.data()
  if (typeof d.authorUid !== "string") continue
  const created = d.createdAt?.toMillis?.() ?? 0
  const t = byUid.get(d.authorUid) ?? { name: "", newest: -1, datasets: 0, downloads: 0 }
  t.datasets++
  t.downloads += Number(d.downloads) || 0
  // The name on their most recent dataset, as the app would write it.
  if (created >= t.newest) {
    t.newest = created
    t.name = String(d.authorName ?? "").slice(0, 60) || "Anonymous"
  }
  byUid.set(d.authorUid, t)
}

const rows = [...byUid.entries()].sort((a, b) => b[1].downloads - a[1].downloads)
console.log(`${snap.size} datasets by ${rows.length} creators\n`)
for (const [uid, t] of rows) {
  console.log(
    `${String(t.downloads).padStart(7)} downloads  ${String(t.datasets).padStart(3)} datasets  ${t.name}  (${uid})`
  )
}

if (!write) {
  console.log("\nPreview only. Run with --write to save.")
  process.exit(0)
}

// Creators whose datasets are all gone keep their document, zeroed, so the
// app's list (which hides empty ones) and any later backfill agree.
const existing = await db.collection("creators").get()
for (const doc of existing.docs) {
  if (!byUid.has(doc.id))
    byUid.set(doc.id, {
      name: doc.data().name ?? "Anonymous",
      newest: 0,
      datasets: 0,
      downloads: 0,
    })
}

const entries = [...byUid.entries()]
for (let i = 0; i < entries.length; i += 400) {
  const batch = db.batch()
  for (const [uid, t] of entries.slice(i, i + 400)) {
    batch.set(
      db.collection("creators").doc(uid),
      { name: t.name, datasets: t.datasets, downloads: t.downloads },
      { merge: true }
    )
  }
  await batch.commit()
}
console.log(`\n✔ Wrote ${entries.length} creator documents.`)
