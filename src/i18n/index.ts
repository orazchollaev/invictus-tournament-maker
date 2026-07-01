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
  messages: { en, tr, ru, es, pt },
})

export default i18n
