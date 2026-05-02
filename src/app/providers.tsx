"use client";
import { SessionProvider } from "next-auth/react";
import { LanguageProvider } from "@/lib/i18n/context";
import type { Locale } from "@/lib/i18n/types";

export default function Providers({
  children,
  initialLocale,
}: {
  children: React.ReactNode;
  initialLocale: Locale;
}) {
  return (
    // refetchOnWindowFocus=false: by default NextAuth refires /api/auth/session every time
    // the tab regains focus, causing the duplicate session calls observed in production
    // (~140ms each). The session is JWT-based here; it does not need to be refetched on
    // focus to stay valid.
    // refetchInterval=0: explicit no-poll. We rely on token expiration + sign-in flow
    // rather than periodic re-validation.
    <SessionProvider refetchOnWindowFocus={false} refetchInterval={0}>
      <LanguageProvider initialLocale={initialLocale}>
        {children}
      </LanguageProvider>
    </SessionProvider>
  );
}
