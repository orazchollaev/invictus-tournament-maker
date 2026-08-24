import { createI18n } from "vue-i18n"
import en from "./locales/en"

export type Locale =
  | "en"
  | "tr"
  | "ru"
  | "es"
  | "pt"
  | "id"
  | "ja"
  | "de"
  | "fr"
  | "ar"
  | "in"
  | "vi"
  | "ko"
  | "pl"
  | "th"

export interface LocaleOption {
  value: Locale
  label: string
  flag: string
}

export const RTL_LOCALES: readonly Locale[] = ["ar"]

export function isRtl(locale: Locale): boolean {
  return RTL_LOCALES.includes(locale)
}

export const LOCALES: LocaleOption[] = [
  { value: "en", label: "English", flag: "GB" },
  { value: "tr", label: "Türkçe", flag: "TR" },
  { value: "ru", label: "Русский", flag: "RU" },
  { value: "es", label: "Español", flag: "ES" },
  { value: "pt", label: "Português", flag: "PT" },
  { value: "id", label: "Bahasa Indonesia", flag: "ID" },
  { value: "ja", label: "日本語", flag: "JP" },
  { value: "de", label: "Deutsch", flag: "DE" },
  { value: "fr", label: "Français", flag: "FR" },
  { value: "ar", label: "العربية", flag: "SA" },
  { value: "in", label: "Indian", flag: "IN" },
  { value: "vi", label: "Vietnam", flag: "VN" },
  { value: "ko", label: "한국어", flag: "KR" },
  { value: "pl", label: "Polski", flag: "PL" },
  { value: "th", label: "ไทย", flag: "TH" },
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
  id: () => import("./locales/id"),
  ja: () => import("./locales/ja"),
  de: () => import("./locales/de"),
  fr: () => import("./locales/fr"),
  ar: () => import("./locales/ar"),
  in: () => import("./locales/in"),
  vi: () => import("./locales/vi"),
  ko: () => import("./locales/ko"),
  pl: () => import("./locales/pl"),
  th: () => import("./locales/th"),
}

export async function loadLocale(locale: Locale): Promise<void> {
  if (locale === "en") return

  if ((i18n.global.availableLocales as readonly string[]).includes(locale)) {
    return
  }

  const messages = await localeLoaders[locale]()

  // @typescript-eslint/no-explicit-any
  i18n.global.setLocaleMessage(locale, messages.default as any)
}

export default i18n
