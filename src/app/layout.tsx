import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "Telecom Store Manager — Gestión de Apertura de Tiendas",
  description: "Sistema de gestión de aperturas de tiendas de telecomunicaciones: seguimiento de 11 fases, multi-usuario, en tiempo real",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
