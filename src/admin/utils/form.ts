import type {
  Announcement,
  AnnouncementFrequency,
  AnnouncementPlatform,
} from "@/modules/announcements/types"
import { parseAnnouncement, type ParseResult } from "@/modules/announcements/utils/validate"

export interface ContentRow {
  locale: string
  title: string
  body: string
  cta: string
}

/**
 * What the editor binds to: strings where an input wants a string, so an empty
 * field is "" rather than null. `toAnnouncement` turns it back into the real
 * shape and runs the app's own validator on it.
 */
export interface AnnouncementForm {
  id: string
  enabled: boolean
  /** `<input type="datetime-local">` value, in this machine's time zone. */
  startAt: string
  endAt: string
  priority: number
  frequency: AnnouncementFrequency
  /** Empty = every platform. */
  platforms: AnnouncementPlatform[]
  minVersion: string
  maxVersion: string
  /** "" = users without their language do not see it. */
  defaultLocale: string
  content: ContentRow[]
  actionType: "none" | "route" | "url"
  actionTarget: string
  imageUrl: string
}

const pad = (n: number) => String(n).padStart(2, "0")

/** Epoch ms → the local "YYYY-MM-DDTHH:mm" a datetime-local input shows. */
export function toLocalInput(ms: number): string {
  const d = new Date(ms)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** The reverse; null when the field is empty or unreadable. */
export function fromLocalInput(value: string): number | null {
  if (!value) return null
  const ms = new Date(value).getTime()
  return Number.isNaN(ms) ? null : ms
}

export function emptyForm(now = Date.now()): AnnouncementForm {
  const start = new Date(now)
  start.setMinutes(0, 0, 0)
  start.setHours(start.getHours() + 1)
  const end = new Date(start)
  end.setDate(end.getDate() + 7)
  return {
    id: "",
    enabled: true,
    startAt: toLocalInput(start.getTime()),
    endAt: toLocalInput(end.getTime()),
    priority: 0,
    frequency: "once",
    platforms: [],
    minVersion: "",
    maxVersion: "",
    defaultLocale: "en",
    content: [
      { locale: "en", title: "", body: "", cta: "" },
      { locale: "tr", title: "", body: "", cta: "" },
    ],
    actionType: "none",
    actionTarget: "",
    imageUrl: "",
  }
}

export function formFromAnnouncement(a: Announcement): AnnouncementForm {
  return {
    id: a.id,
    enabled: a.enabled,
    startAt: toLocalInput(a.startAt),
    endAt: toLocalInput(a.endAt),
    priority: a.priority,
    frequency: a.frequency,
    platforms: a.platforms ? [...a.platforms] : [],
    minVersion: a.minVersion ?? "",
    maxVersion: a.maxVersion ?? "",
    defaultLocale: a.defaultLocale ?? "",
    content: Object.entries(a.content).map(([locale, t]) => ({
      locale,
      title: t.title,
      body: t.body,
      cta: t.cta ?? "",
    })),
    actionType: a.action?.type ?? "none",
    actionTarget: a.action?.target ?? "",
    imageUrl: a.imageUrl ?? "",
  }
}

/** A blank value means "not set", the way the JSON files leave a key out. */
const orNull = (v: string) => (v.trim() ? v.trim() : null)

/** Validates the form with the same rules the app applies when it reads Firestore. */
export function toAnnouncement(
  form: AnnouncementForm,
  knownLocales: readonly string[]
): ParseResult {
  const content: Record<string, { title: string; body: string; cta?: string }> = {}
  const duplicates: string[] = []
  for (const row of form.content) {
    if (content[row.locale]) duplicates.push(row.locale)
    content[row.locale] = row.cta.trim()
      ? { title: row.title, body: row.body, cta: row.cta }
      : { title: row.title, body: row.body }
  }

  const result = parseAnnouncement(
    form.id.trim(),
    {
      enabled: form.enabled,
      startAt: fromLocalInput(form.startAt) ?? undefined,
      endAt: fromLocalInput(form.endAt) ?? undefined,
      priority: form.priority,
      frequency: form.frequency,
      platforms: form.platforms.length ? form.platforms : null,
      minVersion: orNull(form.minVersion),
      maxVersion: orNull(form.maxVersion),
      defaultLocale: orNull(form.defaultLocale),
      content,
      action:
        form.actionType === "none" ? null : { type: form.actionType, target: form.actionTarget },
      imageUrl: orNull(form.imageUrl),
    },
    { strict: true, knownLocales }
  )
  if (!duplicates.length) return result
  const errors = duplicates.map((l) => `"${l}" is listed twice`)
  return { ok: false, errors: result.ok ? errors : [...errors, ...result.errors] }
}

export type AnnouncementStatus = "live" | "scheduled" | "ended" | "disabled"

export function statusOf(
  a: Pick<Announcement, "enabled" | "startAt" | "endAt">,
  now = Date.now()
): AnnouncementStatus {
  if (!a.enabled) return "disabled"
  if (now < a.startAt) return "scheduled"
  if (now >= a.endAt) return "ended"
  return "live"
}
