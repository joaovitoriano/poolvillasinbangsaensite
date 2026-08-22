"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type AdminLocale = "en" | "th";

type AdminLocaleValue = {
  locale: AdminLocale;
  setLocale: (locale: AdminLocale) => void;
  copy: (english: string, thai: string) => string;
};

const AdminLocaleContext = createContext<AdminLocaleValue | null>(null);

function initialLocale(): AdminLocale {
  if (typeof window === "undefined") return "en";
  const urlLocale = new URLSearchParams(window.location.search).get("lang");
  if (urlLocale === "en" || urlLocale === "th") return urlLocale;
  return window.localStorage.getItem("admin-locale") === "th" ? "th" : "en";
}

export function AdminLocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<AdminLocale>("en");

  useEffect(() => {
    const next = initialLocale();
    document.documentElement.lang = next;
    setLocaleState(next);
  }, []);

  const value = useMemo<AdminLocaleValue>(() => ({
    locale,
    setLocale(next) {
      const url = new URL(window.location.href);
      url.searchParams.set("lang", next);
      window.history.replaceState(window.history.state, "", url);
      window.localStorage.setItem("admin-locale", next);
      document.documentElement.lang = next;
      setLocaleState(next);
    },
    copy: (english, thai) => locale === "th" ? thai : english,
  }), [locale]);

  return <AdminLocaleContext.Provider value={value}>{children}</AdminLocaleContext.Provider>;
}

export function useAdminLocale() {
  const value = useContext(AdminLocaleContext);
  if (!value) throw new Error("useAdminLocale must be used inside AdminLocaleProvider");
  return value;
}
