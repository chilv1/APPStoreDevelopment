"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import type { Dict, Locale } from "./types";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "./types";
import dictEs from "./dict-es";
import dictVi from "./dict-vi";

const DICTS: Record<Locale, Dict> = { es: dictEs, vi: dictVi };
const STORAGE_KEY = "telecom-locale";

type Ctx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: Dict;
  intlCode: string;
};

const I18nContext = createContext<Ctx | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Initialize as default to keep SSR + first client render in sync; hydrate from storage in useEffect.
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && SUPPORTED_LOCALES.includes(stored as Locale)) {
      setLocaleState(stored as Locale);
    }
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, l);
    }
  }, []);

  const intlCode = locale === "es" ? "es-PE" : "vi-VN";

  return (
    <I18nContext.Provider value={{ locale, setLocale, t: DICTS[locale], intlCode }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useLocale(): Ctx {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useLocale must be used inside LanguageProvider");
  return ctx;
}

// Convenience hook — returns the dict directly
export function useT(): Dict {
  return useLocale().t;
}
