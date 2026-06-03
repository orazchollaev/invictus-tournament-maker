import { createI18n } from "vue-i18n"
import en from "./locales/en"
import tr from "./locales/tr"
import ru from "./locales/ru"
import es from "./locales/es"
import pt from "./locales/pt"

export type Locale = "en" | "tr" | "ru" | "es" | "pt"

export interface LocaleOption {
  value: Locale
  label: string
  flag: string
}

export const LOCALES: LocaleOption[] = [
  { value: "en", label: "English", flag: "🇬🇧" },
  { value: "tr", label: "Türkçe", flag: "🇹🇷" },
  { value: "ru", label: "Русский", flag: "🇷🇺" },
  { value: "es", label: "Español", flag: "🇪🇸" },
  { value: "pt", label: "Português", flag: "🇧🇷" },
]

export const i18n = createI18n({
  legacy: false,
  locale: "en",
  fallbackLocale: "en",
  messages: { en, tr, ru, es, pt },
})

export default i18n
