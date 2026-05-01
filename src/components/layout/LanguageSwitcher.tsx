"use client";

import { useLocale } from "@/lib/i18n/context";
import { LOCALE_INFO, SUPPORTED_LOCALES } from "@/lib/i18n/types";

export default function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();

  return (
    <div style={{
      display: "flex", gap: 4,
      background: "rgba(255,255,255,0.04)",
      border: "1px solid var(--border)",
      borderRadius: 8,
      padding: 3,
    }}>
      {SUPPORTED_LOCALES.map((l) => {
        const info = LOCALE_INFO[l];
        const isActive = locale === l;
        return (
          <button
            key={l}
            onClick={() => setLocale(l)}
            title={info.name}
            style={{
              flex: 1,
              padding: "5px 8px",
              borderRadius: 5,
              border: "none",
              background: isActive ? "rgba(59,130,246,0.25)" : "transparent",
              color: isActive ? "#93c5fd" : "var(--text-secondary)",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
              transition: "all 0.15s ease",
            }}
          >
            <span style={{ fontSize: 14, lineHeight: 1 }}>{info.flag}</span>
            <span>{info.short}</span>
          </button>
        );
      })}
    </div>
  );
}
