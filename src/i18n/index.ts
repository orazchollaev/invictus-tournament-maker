import { createI18n } from "vue-i18n"
import en from "./locales/en"

export type Locale = "en" | "tr" | "ru" | "es" | "pt"

export interface LocaleOption {
  value: Locale
  label: string
  flag: string
}

export const LOCALES: LocaleOption[] = [
  { value: "en", label: "English", flag: "GB" },
  { value: "tr", label: "Türkçe", flag: "TR" },
  { value: "ru", label: "Русский", flag: "RU" },
  { value: "es", label: "Español", flag: "ES" },
  { value: "pt", label: "Português", flag: "PT" },
]

export const i18n = createI18n({
  legacy: false,
  locale: "en",
  fallbackLocale: "en",
  messages: { en } as Record<Locale, typeof en>,
})

const localeLoaders: Record<
  Exclude<Locale, "en">,
  () => Promise<{ default: Record<string, unknown> }>
> = {
  tr: () => import("./locales/tr"),
  ru: () => import("./locales/ru"),
  es: () => import("./locales/es"),
  pt: () => import("./locales/pt"),
}

export async function loadLocale(locale: Locale): Promise<void> {
  if (locale === "en") return
  if ((i18n.global.availableLocales as readonly string[]).includes(locale)) return
  const messages = await localeLoaders[locale]()
  //@typescript-eslint/no-explicit-any
  i18n.global.setLocaleMessage(locale, messages.default as any)
}

export default i18n
