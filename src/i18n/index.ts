import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import it from "./locales/it";
import en from "./locales/en";
import fr from "./locales/fr";
import ar from "./locales/ar";

export const SUPPORTED_LANGUAGES = [
  { code: "it", label: "Italiano", dir: "ltr" as const },
  { code: "en", label: "English", dir: "ltr" as const },
  { code: "fr", label: "Français", dir: "ltr" as const },
  { code: "ar", label: "العربية", dir: "rtl" as const },
];

if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: {
        it: { translation: it },
        en: { translation: en },
        fr: { translation: fr },
        ar: { translation: ar },
      },
      fallbackLng: "it",
      supportedLngs: ["it", "en", "fr", "ar"],
      interpolation: { escapeValue: false },
      detection: { order: ["localStorage", "navigator"], caches: ["localStorage"] },
    });
}

export function applyLanguageDirection(lang: string) {
  if (typeof document === "undefined") return;
  const entry = SUPPORTED_LANGUAGES.find((l) => l.code === lang);
  document.documentElement.dir = entry?.dir ?? "ltr";
  document.documentElement.lang = lang;
}

export default i18n;