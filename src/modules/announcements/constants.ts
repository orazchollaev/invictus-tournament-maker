const MINUTE = 60_000
const DAY = 24 * 60 * MINUTE

export const ANNOUNCEMENTS_COLLECTION = "announcements"

/** Bump the suffix whenever the cached shape changes. */
export const CACHE_KEY = "invictus_announcements_cache_v1"
export const SEEN_KEY = "invictus_announcements_seen_v1"

/**
 * A launch within this long of the last fetch reuses it. Bounds the Firestore
 * reads per user, and also how long an emergency `enabled: false` takes to land.
 */
export const CACHE_TTL_MS = 60 * MINUTE
export const FETCH_TIMEOUT_MS = 8_000
/** Far more than will ever be live at once; a cap on reads if old ones pile up. */
export const QUERY_LIMIT = 20
/**
 * The query asks for announcements ending after (device time − this), so a
 * device clock that runs up to a week fast still receives live ones. The exact
 * cut happens on the device, against the server's clock.
 */
export const CLOCK_TOLERANCE_MS = 7 * DAY

/** After launch: lets the first screen settle and the app-open ad have its window. */
export const FIRST_CHECK_DELAY_MS = 4_000
/** Coming back from the background after this long counts as a fresh check. */
export const RESUME_CHECK_AFTER_MS = 30 * MINUTE
export const QUIET_POLL_MS = 1_000
/** Busy the whole time — a long simulation, say — and it waits for the next launch. */
export const QUIET_GIVE_UP_MS = 3 * MINUTE
export const IMAGE_PRELOAD_TIMEOUT_MS = 4_000
export const SEEN_RETENTION_MS = 365 * DAY

/** The list pages: never over a match, a form or a detail page someone is reading. */
export const QUIET_PATHS = ["/tournaments", "/teams", "/players", "/history", "/settings"]
