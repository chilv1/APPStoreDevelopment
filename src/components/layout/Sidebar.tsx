"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { ROLE_LABELS, ROLE_COLORS } from "@/lib/utils";
import { useT } from "@/lib/i18n/context";
import LanguageSwitcher from "./LanguageSwitcher";

export default function Sidebar({ session }: { session: any }) {
  const pathname = usePathname();
  const user = session?.user as any;
  const role = user?.role || "SURVEY_STAFF";
  const t = useT();

  // Reportes is the primary landing experience — pinned to top.
  // /dashboard (Resumen) is intentionally hidden from the sidebar; the route
  // still exists if anyone has the URL, but new users land directly on /reports.
  const NAV_ITEMS = [
    { href: "/reports",   icon: "📈", label: t.sidebar.reports },
    { href: "/stores",    icon: "🏪", label: t.sidebar.stores },
    { href: "/gantt",     icon: "📅", label: t.sidebar.portfolioGantt },
    { href: "/branches",  icon: "🏢", label: t.sidebar.branches },
    { href: "/map",       icon: "🗺️", label: t.sidebar.map },
  ];

  const ADMIN_ITEMS = [
    { href: "/users",           icon: "👥", label: t.sidebar.users },
    { href: "/phase-templates", icon: "⚙️", label: t.sidebar.phaseTemplates },
  ];

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div style={{ padding: "20px 16px 16px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, flexShrink: 0,
            boxShadow: "0 4px 16px rgba(59,130,246,0.25)",
          }}>📡</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#f0f4ff", lineHeight: 1.2 }}>
              Telecom Store
            </div>
            <div style={{ fontSize: 11, color: "#4a5568" }}>Manager v1.0</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: "12px 10px", overflowY: "auto" }}>
        <div style={{ marginBottom: 4 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: "#4a5568", textTransform: "uppercase", letterSpacing: "0.08em", padding: "4px 8px", marginBottom: 4 }}>
            {t.sidebar.mainMenu}
          </div>
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${pathname === item.href || pathname.startsWith(item.href + "/") ? "active" : ""}`}
              style={{ display: "flex", marginBottom: 2 }}
            >
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>

        {["ADMIN"].includes(role) && (
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: "#4a5568", textTransform: "uppercase", letterSpacing: "0.08em", padding: "4px 8px", marginBottom: 4 }}>
              {t.sidebar.admin}
            </div>
            {ADMIN_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${pathname === item.href ? "active" : ""}`}
                style={{ display: "flex", marginBottom: 2 }}
              >
                <span style={{ fontSize: 16 }}>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        )}
      </nav>

      {/* User Profile + Language Switcher */}
      <div style={{ padding: "12px 10px", borderTop: "1px solid var(--border)" }}>
        <LanguageSwitcher />

        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 12px", borderRadius: 10,
          background: "rgba(255,255,255,0.03)",
          border: "1px solid var(--border)",
          margin: "10px 0 8px",
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 700, color: "#fff", flexShrink: 0,
          }}>
            {user?.name?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#f0f4ff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user?.name || "User"}
            </div>
            <span className={`badge ${ROLE_COLORS[role]}`} style={{ fontSize: 10, padding: "2px 8px" }}>
              {ROLE_LABELS[role]}
            </span>
          </div>
        </div>

        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          style={{
            width: "100%", padding: "9px 12px",
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.2)",
            borderRadius: 8, cursor: "pointer",
            color: "#fca5a5", fontSize: 13, fontWeight: 500,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.background = "rgba(239,68,68,0.15)"; }}
          onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.background = "rgba(239,68,68,0.08)"; }}
        >
          🚪 {t.sidebar.logout}
        </button>
      </div>
    </aside>
  );
}
