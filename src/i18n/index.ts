import { createI18n } from "vue-i18n"
import en from "./locales/en"

export type Locale =
  | "en"
  | "tr"
  | "ru"
  | "es"
  | "pt"
  | "pt-BR"
  | "id"
  | "ja"
  | "de"
  | "fr"
  | "it"
  | "ar"
  | "in"
  | "vi"
  | "ko"
  | "pl"
  | "th"
  | "fa"
  | "uz"
  | "nl"

export interface LocaleOption {
  value: Locale
  label: string
  flag: string
}

export const RTL_LOCALES: readonly Locale[] = ["ar", "fa"]

export function isRtl(locale: Locale): boolean {
  return RTL_LOCALES.includes(locale)
}

export const LOCALES: LocaleOption[] = [
  { value: "en", label: "English", flag: "GB" },
  { value: "tr", label: "Türkçe", flag: "TR" },
  { value: "ru", label: "Русский", flag: "RU" },
  { value: "es", label: "Español", flag: "ES" },
  { value: "pt", label: "Português", flag: "PT" },
  { value: "pt-BR", label: "Português (Brasil)", flag: "BR" },
  { value: "id", label: "Bahasa Indonesia", flag: "ID" },
  { value: "ja", label: "日本語", flag: "JP" },
  { value: "de", label: "Deutsch", flag: "DE" },
  { value: "fr", label: "Français", flag: "FR" },
  { value: "it", label: "Italiano", flag: "IT" },
  { value: "ar", label: "العربية", flag: "SA" },
  { value: "in", label: "हिन्दी", flag: "IN" },
  { value: "vi", label: "Tiếng Việt", flag: "VN" },
  { value: "ko", label: "한국어", flag: "KR" },
  { value: "pl", label: "Polski", flag: "PL" },
  { value: "th", label: "ไทย", flag: "TH" },
  { value: "fa", label: "فارسی", flag: "IR" },
  { value: "uz", label: "O‘zbekcha", flag: "UZ" },
  { value: "nl", label: "Nederlands", flag: "NL" },
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
  "pt-BR": () => import("./locales/pt-BR"),
  id: () => import("./locales/id"),
  ja: () => import("./locales/ja"),
  de: () => import("./locales/de"),
  fr: () => import("./locales/fr"),
  it: () => import("./locales/it"),
  ar: () => import("./locales/ar"),
  in: () => import("./locales/in"),
  vi: () => import("./locales/vi"),
  ko: () => import("./locales/ko"),
  pl: () => import("./locales/pl"),
  th: () => import("./locales/th"),
  fa: () => import("./locales/fa"),
  uz: () => import("./locales/uz"),
  nl: () => import("./locales/nl"),
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
