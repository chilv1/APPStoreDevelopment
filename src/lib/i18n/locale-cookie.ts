// Cookie name for locale preference. Used by both server (next/headers cookies()) and client (document.cookie).
// Stored as a plain cookie (NOT httpOnly) so client can update it; SameSite=Lax for safety.
import type { Locale } from "./types";
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from "./types";

export const LOCALE_COOKIE = "locale";
export const LOCALE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

/**
 * Validate a string and return a Locale, or DEFAULT_LOCALE if invalid.
 */
export function toLocale(value: string | undefined | null): Locale {
  if (value && SUPPORTED_LOCALES.includes(value as Locale)) {
    return value as Locale;
  }
  return DEFAULT_LOCALE;
}

/**
 * Read locale from document.cookie (client-side only).
 * Returns DEFAULT_LOCALE if cookie is missing or invalid.
 */
export function readLocaleCookieClient(): Locale {
  if (typeof document === "undefined") return DEFAULT_LOCALE;
  const match = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]*)`));
  return toLocale(match ? decodeURIComponent(match[1]) : null);
}

/**
 * Set locale cookie on the client. Updates document.cookie + persists for 1 year.
 */
export function writeLocaleCookieClient(locale: Locale): void {
  if (typeof document === "undefined") return;
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${LOCALE_MAX_AGE}; samesite=lax`;
}
