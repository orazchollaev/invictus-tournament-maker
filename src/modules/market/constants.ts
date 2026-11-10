/** Hard limits for a shared dataset. Mirrored by the Firestore Security Rules. */
export const MARKET_LIMITS = {
  maxTeams: 128,
  maxPlayers: 4000,
  maxLabel: 40,
  maxDescription: 200,
  maxName: 40,
  /** Length of one team picture data-URL; a 64px WebP at q0.4 is about 1–3k. */
  maxImageChars: 8_000,
  /** Length of the gzip + base64 payload string; Firestore documents cap at 1 MiB. */
  maxPayloadChars: 900_000,
} as const

/** Shared team pictures are shrunk to this on publish: small on purpose. */
export const IMAGE_SHRINK = { size: 64, quality: 0.4 } as const

export const PAGE_SIZE = 20

/** How many creators the creators list shows, most downloaded first. */
export const CREATORS_LIMIT = 50

export const REPORT_REASONS = ["spam", "copyright", "offensive", "other"] as const

export const DATASET_TYPES = ["country", "club"] as const
export const DATASET_CATEGORIES = ["league", "classic", "ranking"] as const
