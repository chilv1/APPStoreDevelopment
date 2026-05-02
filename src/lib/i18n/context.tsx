"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import type { Dict, Locale } from "./types";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "./types";
import dictEs from "./dict-es";
import dictVi from "./dict-vi";
import { writeLocaleCookieClient, readLocaleCookieClient } from "./locale-cookie";

const DICTS: Record<Locale, Dict> = { es: dictEs, vi: dictVi };
const STORAGE_KEY = "telecom-locale";

type Ctx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: Dict;
  intlCode: string;
};

const I18nContext = createContext<Ctx | null>(null);

export function LanguageProvider({
  children,
  initialLocale,
}: {
  children: ReactNode;
  // Optional for backward compat. When provided (from server-read cookie), used to seed
  // initial state so SSR HTML matches the client and there is no flash.
  initialLocale?: Locale;
}) {
  // Seed from server-provided cookie value when available; otherwise fall back to default.
  // Client-side mounting will reconcile with localStorage as a legacy fallback.
  const [locale, setLocaleState] = useState<Locale>(initialLocale ?? DEFAULT_LOCALE);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // If server already provided a valid initialLocale via cookie, no further read needed.
    if (initialLocale) return;

    // Legacy fallback: prefer cookie, then localStorage. This path runs only when an existing
    // user has localStorage but no cookie yet (first load after upgrading to cookie-based locale).
    const fromCookie = readLocaleCookieClient();
    if (fromCookie !== DEFAULT_LOCALE) {
      setLocaleState(fromCookie);
      return;
    }
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && SUPPORTED_LOCALES.includes(stored as Locale)) {
      const lc = stored as Locale;
      setLocaleState(lc);
      // Backfill cookie so next page load skips this whole hydration step.
      writeLocaleCookieClient(lc);
    }
  }, [initialLocale]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    if (typeof window !== "undefined") {
      // Write both cookie (server-readable) and localStorage (legacy fallback).
      writeLocaleCookieClient(l);
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
