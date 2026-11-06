/**
 * "once": the first time it is due, never again.
 * "daily": at most once per calendar day (device time).
 * "launch": once per app process — every cold start, never twice in one session.
 */
export type AnnouncementFrequency = "once" | "daily" | "launch"

export type AnnouncementPlatform = "android" | "ios" | "web"

export interface AnnouncementText {
  title: string
  body: string
  /** Button label. Required in every language when the announcement has an action. */
  cta?: string
}

export type AnnouncementAction =
  /** An in-app path, e.g. "/market". */
  | { type: "route"; target: string }
  /** An https link, opened outside the app. */
  | { type: "url"; target: string }

/** A validated announcement, as stored in Firestore `announcements/{id}`. */
export interface Announcement {
  id: string
  /** Off switch that leaves the dates alone. */
  enabled: boolean
  /** Epoch ms. */
  startAt: number
  /** Epoch ms, exclusive. */
  endAt: number
  /** Higher wins when several are due at once. */
  priority: number
  frequency: AnnouncementFrequency
  /** null = every platform. */
  platforms: AnnouncementPlatform[] | null
  /** Inclusive bounds on the app version; null = unbounded. */
  minVersion: string | null
  maxVersion: string | null
  /**
   * Shown to users whose language has no entry in `content`. null means those
   * users do not see the announcement at all — a way to target one language.
   */
  defaultLocale: string | null
  /** Keyed by app locale code ("en", "tr", "pt-BR", …). */
  content: Record<string, AnnouncementText>
  action: AnnouncementAction | null
  /** https image shown above the text; null = none. */
  imageUrl: string | null
}

/** One announcement in one language, ready to render. */
export interface ResolvedAnnouncement {
  id: string
  /** The content locale actually used — may be the fallback, not the app's. */
  locale: string
  title: string
  body: string
  ctaLabel: string | null
  action: AnnouncementAction | null
  imageUrl: string | null
}

export interface SeenEntry {
  /** Epoch ms of the last time it was shown. */
  last: number
  count: number
}

/** Announcement id → when it was shown. Persisted on the device. */
export type SeenLog = Record<string, SeenEntry>
