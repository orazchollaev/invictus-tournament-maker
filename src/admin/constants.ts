/** The only account the panel lets in. firestore.rules enforces the same address. */
export const ADMIN_EMAIL = "orazchollaev@gmail.com"

/**
 * Locale codes the app ships, read off the locale file names so a new language
 * shows up here without a second list to keep in sync. Only the keys are used;
 * nothing is loaded.
 */
export const APP_LOCALES: string[] = Object.keys(import.meta.glob("@/i18n/locales/*.ts"))
  .map((path) => path.slice(path.lastIndexOf("/") + 1, -3))
  .sort((a, b) => (a === "en" ? -1 : b === "en" ? 1 : a.localeCompare(b)))
