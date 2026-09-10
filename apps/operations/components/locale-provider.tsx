"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Localized = { en: string; th: string };
export type Locale = "en" | "th";

const LocaleContext = createContext<{
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (value: Localized) => string;
  localize: (value: string) => string;
} | null>(null);

export function localizeCombined(value: string, locale: Locale) {
  for (const separator of [" / ", " | "]) {
    const separatorIndex = value.indexOf(separator);
    if (separatorIndex >= 0) {
      return locale === "th"
        ? value.slice(separatorIndex + separator.length).trim()
        : value.slice(0, separatorIndex).trim();
    }
  }
  return value;
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");
  useEffect(() => {
    const stored = window.localStorage.getItem("villa-operations-locale");
    if (stored === "th") setLocaleState("th");
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.cookie = `villa-operations-locale=${locale}; path=/; max-age=31536000; samesite=lax`;
    document.title = locale === "th" ? "ระบบจัดการวิลล่า" : "Villa Operations";
    document.querySelector('meta[name="description"]')?.setAttribute(
      "content",
      locale === "th" ? "ระบบจัดการการจองวิลล่าภายใน" : "Internal villa booking operations",
    );
  }, [locale]);
  const setLocale = (value: Locale) => {
    setLocaleState(value);
    window.localStorage.setItem("villa-operations-locale", value);
  };
  const context = useMemo(() => ({
    locale,
    setLocale,
    t: (value: Localized) => value[locale],
    localize: (value: string) => localizeCombined(value, locale),
  }), [locale]);
  return <LocaleContext.Provider value={context}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) throw new Error("LocaleProvider is missing");
  return context;
}
