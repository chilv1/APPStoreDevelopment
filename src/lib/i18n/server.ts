// Server-side i18n: read locale from the request cookie and return the matching dict.
// Use this in async Server Components (e.g. read-heavy report/dashboard pages) where
// `useT()` (a client hook) is not available. The dict objects themselves are the same
// modules the client-side LanguageProvider uses, so labels stay in sync.
import { cookies } from "next/headers";
import dictEs from "./dict-es";
import dictVi from "./dict-vi";
import type { Dict, Locale } from "./types";
import { LOCALE_COOKIE, toLocale } from "./locale-cookie";

export async function getServerDict(): Promise<{
  locale: Locale;
  t: Dict;
  intlCode: string;
}> {
  const cookieStore = await cookies();
  const locale = toLocale(cookieStore.get(LOCALE_COOKIE)?.value);
  const t = locale === "vi" ? dictVi : dictEs;
  const intlCode = locale === "vi" ? "vi-VN" : "es-PE";
  return { locale, t, intlCode };
}
