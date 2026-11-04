/** Hard limits for a shared dataset. Mirrored by the Firestore Security Rules. */
export const MARKET_LIMITS = {
  maxTeams: 128,
  maxPlayers: 4000,
  maxLabel: 40,
  maxDescription: 200,
  maxName: 40,
  /** Length of the gzip + base64 payload string; Firestore documents cap at 1 MiB. */
  maxPayloadChars: 900_000,
} as const

export const PAGE_SIZE = 20

export const REPORT_REASONS = ["spam", "copyright", "offensive", "other"] as const

export const DATASET_TYPES = ["country", "club"] as const
export const DATASET_CATEGORIES = ["league", "classic", "ranking"] as const
