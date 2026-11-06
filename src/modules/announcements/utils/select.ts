import type {
  Announcement,
  AnnouncementPlatform,
  AnnouncementText,
  ResolvedAnnouncement,
  SeenEntry,
  SeenLog,
} from "../types"
import { compareVersions } from "./version"

export interface SelectContext {
  /** Epoch ms, already corrected for the device clock where possible. */
  now: number
  /** The app's current locale. */
  locale: string
  platform: AnnouncementPlatform | string
  appVersion: string
  seen: SeenLog
  /** Ids already shown since this process started. */
  shownThisSession: ReadonlySet<string>
}

export function isLive(a: Announcement, now: number): boolean {
  return a.enabled && a.startAt <= now && now < a.endAt
}

export function targets(a: Announcement, ctx: Pick<SelectContext, "platform" | "appVersion">) {
  if (a.platforms && !a.platforms.includes(ctx.platform as AnnouncementPlatform)) return false
  if (a.minVersion && compareVersions(ctx.appVersion, a.minVersion) < 0) return false
  if (a.maxVersion && compareVersions(ctx.appVersion, a.maxVersion) > 0) return false
  return true
}

function sameLocalDay(a: number, b: number): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString()
}

/** Whether the frequency rule allows showing it again now. */
export function isDue(
  a: Announcement,
  entry: SeenEntry | undefined,
  now: number,
  shownThisSession: ReadonlySet<string>
): boolean {
  if (shownThisSession.has(a.id)) return false
  if (!entry) return true
  switch (a.frequency) {
    case "once":
      return false
    case "daily":
      return !sameLocalDay(entry.last, now)
    case "launch":
      return true
  }
}

/**
 * The user's language, then the same language in another region ("pt-BR" ↔
 * "pt"), then the announcement's fallback. null when none applies: the user
 * sees nothing rather than a half-translated popup.
 */
export function resolveText(
  a: Announcement,
  locale: string
): { locale: string; text: AnnouncementText } | null {
  if (a.content[locale]) return { locale, text: a.content[locale] }
  const base = locale.split("-")[0]
  const sibling = Object.keys(a.content).find((key) => key.split("-")[0] === base)
  if (sibling) return { locale: sibling, text: a.content[sibling] }
  if (a.defaultLocale && a.content[a.defaultLocale]) {
    return { locale: a.defaultLocale, text: a.content[a.defaultLocale] }
  }
  return null
}

/**
 * The single announcement to show now, or null. Highest priority first; among
 * equals, the one that started most recently.
 */
export function pickAnnouncement(
  list: readonly Announcement[],
  ctx: SelectContext
): ResolvedAnnouncement | null {
  const candidates = list
    .filter(
      (a) =>
        isLive(a, ctx.now) &&
        targets(a, ctx) &&
        isDue(a, ctx.seen[a.id], ctx.now, ctx.shownThisSession)
    )
    .sort((x, y) => y.priority - x.priority || y.startAt - x.startAt)

  for (const a of candidates) {
    const resolved = resolveText(a, ctx.locale)
    if (!resolved) continue
    return {
      id: a.id,
      locale: resolved.locale,
      title: resolved.text.title,
      body: resolved.text.body,
      ctaLabel: a.action ? (resolved.text.cta ?? null) : null,
      action: a.action,
      imageUrl: a.imageUrl,
    }
  }
  return null
}

export function markSeen(log: SeenLog, id: string, now: number): SeenLog {
  const prev = log[id]
  return { ...log, [id]: { last: now, count: (prev?.count ?? 0) + 1 } }
}

/** Drops entries older than `maxAgeMs` so the log cannot grow forever. */
export function pruneSeen(log: SeenLog, now: number, maxAgeMs: number): SeenLog {
  return Object.fromEntries(Object.entries(log).filter(([, e]) => now - e.last < maxAgeMs))
}
