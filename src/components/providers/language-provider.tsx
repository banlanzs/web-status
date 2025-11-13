/*
 * 语言上下文，提供简易的双语切换能力
 */

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  type Language,
  languages,
  type TranslationKey,
  type TranslationValues,
  formatTranslation,
  resolveTranslation,
} from "@/lib/i18n/translations";

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey, values?: TranslationValues) => string;
  availableLanguages: typeof languages;
}

const STORAGE_KEY = "uptime-language";

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window === "undefined") return "zh";
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "zh" || saved === "en") return saved;
    const browserLanguage = window.navigator.language.startsWith("en")
      ? "en"
      : "zh";
    return browserLanguage;
  });

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = language;
    }
  }, [language]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, lang);
    }
  }, []);

  const t = useCallback(
    (key: TranslationKey, values?: TranslationValues) => {
      const template = resolveTranslation(key, language);
      return formatTranslation(template, values);
    },
    [language],
  );

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage,
      t,
      availableLanguages: languages,
    }),
    [language, setLanguage, t],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage 必须在 LanguageProvider 内使用");
  }
  return context;
}

