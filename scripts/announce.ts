/**
 * Publishes in-app announcements to Firestore. See announcements/README.md.
 *
 *   pnpm announce check   <file.json>...   validate and preview, touches nothing
 *   pnpm announce publish <file.json>      validate, then create or replace
 *   pnpm announce list                     every announcement and its status
 *   pnpm announce disable <id>             hide it now (cached up to an hour on devices)
 *   pnpm announce enable  <id>
 *   pnpm announce delete  <id>
 *
 * Credentials (everything but `check`): a service-account key from Firebase
 * console → Project settings → Service accounts, found via --key <path>,
 * GOOGLE_APPLICATION_CREDENTIALS, or .secrets/firebase-admin.json (gitignored).
 */
import { existsSync, readdirSync, readFileSync } from "node:fs"
import { basename, resolve } from "node:path"
import { cert, initializeApp } from "firebase-admin/app"
import { FieldValue, getFirestore, Timestamp, type Firestore } from "firebase-admin/firestore"
import type { Announcement } from "../src/modules/announcements/types.ts"
import { ID_PATTERN, parseAnnouncement } from "../src/modules/announcements/utils/validate.ts"

const COLLECTION = "announcements"
const DEFAULT_KEY = ".secrets/firebase-admin.json"
const ROOT = resolve(import.meta.dirname, "..")

const LOCALES = readdirSync(resolve(ROOT, "src/i18n/locales"))
  .filter((f) => f.endsWith(".ts"))
  .map((f) => f.slice(0, -3))
  .sort()

const color = (code: number) => (s: string) =>
  process.stdout.isTTY ? `\x1b[${code}m${s}\x1b[0m` : s
const red = color(31)
const green = color(32)
const yellow = color(33)
const dim = color(2)
const bold = color(1)

function fail(message: string): never {
  console.error(red(`✖ ${message}`))
  process.exit(1)
}

function formatDate(ms: number): string {
  const local = new Date(ms).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })
  return `${local} ${dim(`(${new Date(ms).toISOString().slice(0, 16)}Z)`)}`
}

function status(a: Pick<Announcement, "enabled" | "startAt" | "endAt">, now = Date.now()) {
  if (!a.enabled) return dim("disabled")
  if (now < a.startAt) return yellow("scheduled")
  if (now >= a.endAt) return dim("ended")
  return green("LIVE")
}

/** Reads and validates one announcement file. The id is its "id" key, else the file name. */
function load(file: string): { announcement?: Announcement; errors: string[] } {
  let raw: Record<string, unknown>
  try {
    raw = JSON.parse(readFileSync(file, "utf8"))
  } catch (error) {
    return { errors: [`cannot read ${file}: ${(error as Error).message}`] }
  }
  const { id = basename(file, ".json"), $schema: _schema, ...rest } = raw
  const result = parseAnnouncement(String(id), rest, { strict: true, knownLocales: LOCALES })
  return result.ok ? { announcement: result.announcement, errors: [] } : { errors: result.errors }
}

function preview(a: Announcement) {
  const missing = LOCALES.filter((l) => !a.content[l])
  console.log(`${bold(a.id)}  ${status(a)}`)
  console.log(`  window     ${formatDate(a.startAt)}  →  ${formatDate(a.endAt)}`)
  console.log(`  shows      ${a.frequency}, priority ${a.priority}`)
  console.log(
    `  audience   ${a.platforms?.join(", ") ?? "all platforms"}` +
      (a.minVersion ? `, ≥ v${a.minVersion}` : "") +
      (a.maxVersion ? `, ≤ v${a.maxVersion}` : "")
  )
  if (a.action) console.log(`  action     ${a.action.type} → ${a.action.target}`)
  if (a.imageUrl) console.log(`  image      ${a.imageUrl}`)
  console.log(`  languages  ${Object.keys(a.content).length}/${LOCALES.length}`)
  if (missing.length) {
    const fallback = a.defaultLocale
      ? `see it in "${a.defaultLocale}"`
      : yellow("do NOT see it (no defaultLocale)")
    console.log(`  missing    ${missing.join(", ")} — these users ${fallback}`)
  }
  for (const [locale, text] of Object.entries(a.content)) {
    console.log(`    ${locale.padEnd(6)}${text.title}${text.cta ? dim(`  [${text.cta}]`) : ""}`)
  }
}

function connect(args: string[]): Firestore {
  const flag = args.indexOf("--key")
  const keyPath =
    (flag >= 0 ? args[flag + 1] : undefined) ??
    process.env.GOOGLE_APPLICATION_CREDENTIALS ??
    resolve(ROOT, DEFAULT_KEY)
  if (!existsSync(keyPath)) {
    fail(
      `No service-account key at ${keyPath}.\n` +
        `  Firebase console → Project settings → Service accounts → Generate new private key,\n` +
        `  save it as ${DEFAULT_KEY} (gitignored), or pass --key <path>.`
    )
  }
  initializeApp({ credential: cert(JSON.parse(readFileSync(keyPath, "utf8"))) })
  return getFirestore()
}

/** Only the normalised fields, so a typo can never reach Firestore. */
function toDocument(a: Announcement) {
  return {
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
    updatedAt: FieldValue.serverTimestamp(),
  }
}

function requireId(id: string | undefined): string {
  if (!id || !ID_PATTERN.test(id)) fail("Pass an announcement id.")
  return id
}

async function main() {
  const [command, ...args] = process.argv.slice(2)
  const positional = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--key")

  switch (command) {
    case "check": {
      if (!positional.length) fail("Usage: pnpm announce check <file.json>...")
      let bad = 0
      for (const file of positional) {
        const { announcement, errors } = load(file)
        if (announcement) preview(announcement)
        else {
          bad++
          console.log(red(`✖ ${file}`))
          for (const e of errors) console.log(red(`    ${e}`))
        }
        console.log()
      }
      process.exit(bad ? 1 : 0)
      break
    }

    case "publish": {
      const file = positional[0] ?? fail("Usage: pnpm announce publish <file.json>")
      const { announcement, errors } = load(file)
      if (!announcement) fail(`${file} is not valid:\n    ${errors.join("\n    ")}`)
      preview(announcement)
      const db = connect(args)
      const ref = db.collection(COLLECTION).doc(announcement.id)
      const existed = (await ref.get()).exists
      await ref.set(toDocument(announcement))
      console.log(green(`\n✔ ${existed ? "Replaced" : "Published"} "${announcement.id}".`))
      if (existed) {
        console.log(
          dim(
            "  Devices that already showed it will not show it again — " +
              "publish under a new id to show it to everyone once more."
          )
        )
      }
      break
    }

    case "list": {
      const db = connect(args)
      const snap = await db.collection(COLLECTION).orderBy("startAt", "desc").get()
      if (snap.empty) console.log("No announcements yet.")
      for (const doc of snap.docs) {
        const result = parseAnnouncement(doc.id, doc.data())
        if (!result.ok) {
          console.log(`${red(doc.id)}  invalid — the app skips it: ${result.errors.join("; ")}`)
          continue
        }
        const a = result.announcement
        console.log(
          `${status(a).padEnd(20)} ${bold(a.id.padEnd(28))} ${formatDate(a.startAt)} → ${formatDate(a.endAt)}  ${dim(Object.keys(a.content).join(","))}`
        )
      }
      break
    }

    case "enable":
    case "disable": {
      const id = requireId(positional[0])
      const ref = connect(args).collection(COLLECTION).doc(id)
      if (!(await ref.get()).exists) fail(`No announcement "${id}".`)
      await ref.update({ enabled: command === "enable", updatedAt: FieldValue.serverTimestamp() })
      console.log(green(`✔ "${id}" ${command}d.`))
      if (command === "disable") {
        console.log(dim("  Devices drop it at their next fetch, at most an hour from now."))
      }
      break
    }

    case "delete": {
      const id = requireId(positional[0])
      const ref = connect(args).collection(COLLECTION).doc(id)
      if (!(await ref.get()).exists) fail(`No announcement "${id}".`)
      await ref.delete()
      console.log(green(`✔ "${id}" deleted.`))
      break
    }

    default:
      console.log(
        readFileSync(new URL(import.meta.url), "utf8")
          .split("*/")[0]
          .replace(/^\/\*\*|^ \* ?/gm, "")
      )
      process.exit(command ? 1 : 0)
  }
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)))
