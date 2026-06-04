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
  { value: "en", label: "English", flag: "en.webp" },
  { value: "tr", label: "Türkçe", flag: "tr.webp" },
  { value: "ru", label: "Русский", flag: "ru.webp" },
  { value: "es", label: "Español", flag: "sp.webp" },
  { value: "pt", label: "Português", flag: "pt.webp" },
]

export const i18n = createI18n({
  legacy: false,
  locale: "en",
  fallbackLocale: "en",
  messages: { en, tr, ru, es, pt },
})

export default i18n
