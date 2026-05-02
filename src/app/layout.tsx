import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import Providers from "./providers";
import { LOCALE_COOKIE, toLocale } from "@/lib/i18n/locale-cookie";

export const metadata: Metadata = {
  title: "Telecom Store Manager — Gestión de Apertura de Tiendas",
  description: "Sistema de gestión de aperturas de tiendas de telecomunicaciones: seguimiento de 11 fases, multi-usuario, en tiempo real",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Read locale from cookie on the server so the initial HTML matches the user's preference,
  // eliminating the "flash" where the page first renders Spanish (DEFAULT_LOCALE) before
  // client-side localStorage hydration switches to Vietnamese.
  const cookieStore = await cookies();
  const initialLocale = toLocale(cookieStore.get(LOCALE_COOKIE)?.value);
  const htmlLang = initialLocale === "vi" ? "vi" : "es";

  return (
    <html lang={htmlLang}>
      <body>
        <Providers initialLocale={initialLocale}>{children}</Providers>
      </body>
    </html>
  );
}
