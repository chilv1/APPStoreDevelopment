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
    <SessionProvider>
      <LanguageProvider initialLocale={initialLocale}>
        {children}
      </LanguageProvider>
    </SessionProvider>
  );
}
