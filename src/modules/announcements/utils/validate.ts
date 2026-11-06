import type {
  Announcement,
  AnnouncementAction,
  AnnouncementFrequency,
  AnnouncementPlatform,
  AnnouncementText,
} from "../types"

/**
 * The one definition of a valid announcement. The app runs it on every
 * document it reads from Firestore; scripts/announce.ts runs it, in strict
 * mode, before anything is published.
 *
 * Deliberately has no runtime imports: Node runs the script straight from its
 * .ts source, and while type-only imports vanish when it strips the types, a
 * value import would need a ".ts" extension the app build does not use.
 */

export const TEXT_LIMITS = { title: 80, body: 1000, cta: 30 } as const

const FREQUENCIES: readonly AnnouncementFrequency[] = ["once", "daily", "launch"]
const PLATFORMS: readonly AnnouncementPlatform[] = ["android", "ios", "web"]
const KNOWN_KEYS = [
  "enabled",
  "startAt",
  "endAt",
  "priority",
  "frequency",
  "platforms",
  "minVersion",
  "maxVersion",
  "defaultLocale",
  "content",
  "action",
  "imageUrl",
]
const TEXT_KEYS = ["title", "body", "cta"]

export const ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/
const VERSION_PATTERN = /^\d+(\.\d+){0,2}$/
/** A date string must say which zone it is in; "09:00" alone means a different moment on every machine. */
const ZONED_DATE = /(Z|[+-]\d{2}:?\d{2})$/i

export interface ParseOptions {
  /** Reject content in languages the app does not ship. */
  knownLocales?: readonly string[]
  /** Reject unknown keys — catches typos like "frequncy" before they publish silently. */
  strict?: boolean
}

export type ParseResult = { ok: true; announcement: Announcement } | { ok: false; errors: string[] }

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v)
}

/**
 * Epoch ms from a number, a zoned ISO string, a Date, or a Firestore Timestamp
 * (admin SDK object or its plain `{ seconds, nanoseconds }` form).
 */
export function toMillis(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null
  if (typeof v === "string") {
    if (!ZONED_DATE.test(v.trim())) return null
    const t = Date.parse(v)
    return Number.isNaN(t) ? null : t
  }
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v.getTime()
  if (isRecord(v)) {
    if (typeof v.toMillis === "function") return (v.toMillis as () => number)()
    const seconds = v.seconds ?? v._seconds
    const nanos = v.nanoseconds ?? v._nanoseconds ?? 0
    if (typeof seconds === "number" && typeof nanos === "number") {
      return seconds * 1000 + Math.floor(nanos / 1e6)
    }
  }
  return null
}

function isHttps(v: string): boolean {
  try {
    return new URL(v).protocol === "https:"
  } catch {
    return false
  }
}

function text(
  raw: unknown,
  key: "title" | "body" | "cta",
  where: string,
  errors: string[]
): string | undefined {
  if (raw === undefined || raw === null) {
    if (key !== "cta") errors.push(`${where}.${key} is required`)
    return undefined
  }
  if (typeof raw !== "string" || !raw.trim()) {
    errors.push(`${where}.${key} must be a non-empty string`)
    return undefined
  }
  const value = raw.trim()
  if (value.length > TEXT_LIMITS[key]) {
    errors.push(`${where}.${key} is ${value.length} characters (max ${TEXT_LIMITS[key]})`)
  }
  return value
}

function parseContent(
  raw: unknown,
  options: ParseOptions,
  errors: string[]
): Record<string, AnnouncementText> {
  const content: Record<string, AnnouncementText> = {}
  if (!isRecord(raw) || !Object.keys(raw).length) {
    errors.push("content must map at least one locale to { title, body }")
    return content
  }
  for (const [locale, entry] of Object.entries(raw)) {
    const where = `content.${locale}`
    if (options.knownLocales && !options.knownLocales.includes(locale)) {
      errors.push(`${where}: the app has no "${locale}" locale`)
      continue
    }
    if (!isRecord(entry)) {
      errors.push(`${where} must be { title, body, cta? }`)
      continue
    }
    if (options.strict) {
      for (const key of Object.keys(entry)) {
        if (!TEXT_KEYS.includes(key)) errors.push(`${where}: unknown key "${key}"`)
      }
    }
    const title = text(entry.title, "title", where, errors)
    const body = text(entry.body, "body", where, errors)
    const cta = text(entry.cta, "cta", where, errors)
    if (title && body) content[locale] = cta ? { title, body, cta } : { title, body }
  }
  return content
}

function parseAction(raw: unknown, errors: string[]): AnnouncementAction | null {
  if (raw === undefined || raw === null) return null
  if (!isRecord(raw) || typeof raw.target !== "string") {
    errors.push('action must be { type: "route" | "url", target }')
    return null
  }
  const target = raw.target.trim()
  if (raw.type === "route") {
    if (!/^\/(?!\/)/.test(target)) errors.push('action.target must be an app path like "/market"')
    return { type: "route", target }
  }
  if (raw.type === "url") {
    if (!isHttps(target)) errors.push("action.target must be an https:// link")
    return { type: "url", target }
  }
  errors.push('action.type must be "route" or "url"')
  return null
}

function parseVersion(raw: unknown, key: string, errors: string[]): string | null {
  if (raw === undefined || raw === null) return null
  if (typeof raw !== "string" || !VERSION_PATTERN.test(raw)) {
    errors.push(`${key} must look like "4.1.0"`)
    return null
  }
  return raw
}

function parsePlatforms(raw: unknown, errors: string[]): AnnouncementPlatform[] | null {
  if (raw === undefined || raw === null) return null
  if (
    !Array.isArray(raw) ||
    !raw.length ||
    !raw.every((p) => PLATFORMS.includes(p as AnnouncementPlatform))
  ) {
    errors.push(`platforms must be a non-empty list of ${PLATFORMS.join(", ")} (or null for all)`)
    return null
  }
  return [...new Set(raw as AnnouncementPlatform[])]
}

export function parseAnnouncement(
  id: string,
  raw: unknown,
  options: ParseOptions = {}
): ParseResult {
  const errors: string[] = []
  if (!ID_PATTERN.test(id)) {
    errors.push(`id "${id}" must be lowercase letters, digits, "-" or "_" (max 64)`)
  }
  if (!isRecord(raw)) return { ok: false, errors: [...errors, "announcement must be an object"] }

  if (options.strict) {
    for (const key of Object.keys(raw)) {
      if (!KNOWN_KEYS.includes(key)) errors.push(`unknown key "${key}"`)
    }
  }

  const startAt = toMillis(raw.startAt)
  const endAt = toMillis(raw.endAt)
  if (startAt === null)
    errors.push('startAt must be a date with a zone, e.g. "2026-11-10T09:00:00+03:00"')
  if (endAt === null)
    errors.push('endAt must be a date with a zone, e.g. "2026-11-17T23:59:00+03:00"')
  if (startAt !== null && endAt !== null && endAt <= startAt)
    errors.push("endAt must be after startAt")

  const enabled = raw.enabled ?? true
  if (typeof enabled !== "boolean") errors.push("enabled must be true or false")

  const priority = raw.priority ?? 0
  if (typeof priority !== "number" || !Number.isInteger(priority)) {
    errors.push("priority must be a whole number")
  }

  const frequency = raw.frequency ?? "once"
  if (!FREQUENCIES.includes(frequency as AnnouncementFrequency)) {
    errors.push(`frequency must be one of ${FREQUENCIES.join(", ")}`)
  }

  const platforms = parsePlatforms(raw.platforms, errors)
  const minVersion = parseVersion(raw.minVersion, "minVersion", errors)
  const maxVersion = parseVersion(raw.maxVersion, "maxVersion", errors)
  const content = parseContent(raw.content, options, errors)

  const defaultLocale = raw.defaultLocale ?? null
  if (defaultLocale !== null && (typeof defaultLocale !== "string" || !content[defaultLocale])) {
    errors.push("defaultLocale must be one of the locales in content (or null)")
  }

  const action = parseAction(raw.action, errors)
  if (action) {
    for (const [locale, entry] of Object.entries(content)) {
      if (!entry.cta) errors.push(`content.${locale}.cta is required because there is an action`)
    }
  }

  const imageUrl = raw.imageUrl ?? null
  if (imageUrl !== null && (typeof imageUrl !== "string" || !isHttps(imageUrl))) {
    errors.push("imageUrl must be an https:// link (or null)")
  }

  if (errors.length) return { ok: false, errors }
  return {
    ok: true,
    announcement: {
      id,
      enabled: enabled as boolean,
      startAt: startAt as number,
      endAt: endAt as number,
      priority: priority as number,
      frequency: frequency as AnnouncementFrequency,
      platforms,
      minVersion,
      maxVersion,
      defaultLocale: defaultLocale as string | null,
      content,
      action,
      imageUrl: imageUrl as string | null,
    },
  }
}
