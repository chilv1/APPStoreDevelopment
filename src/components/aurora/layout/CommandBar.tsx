"use client";

import { useEffect, useState } from "react";
import { Search, Bell } from "lucide-react";
import { usePathname } from "next/navigation";
import { COLOR, RADIUS } from "@/lib/design/tokens";
import CommandPalette from "../common/CommandPalette";

interface Props {
  userName?: string;
  userEmail?: string;
}

export default function CommandBar({ userName = "User", userEmail }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const crumbs = pathname.split("/").filter(Boolean);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const initial = userName?.charAt(0)?.toUpperCase() ?? "U";

  return (
    <>
      <header
        style={{
          height: 56,
          padding: "0 20px",
          background: "#fff",
          borderBottom: `1px solid ${COLOR.neutral[200]}`,
          display: "flex",
          alignItems: "center",
          gap: 16,
          position: "sticky",
          top: 0,
          zIndex: 20,
        }}
      >
        <nav style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: COLOR.neutral[600] }}>
          {crumbs.map((c, i) => (
            <span key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {i > 0 && <span style={{ color: COLOR.neutral[300] }}>/</span>}
              <span style={{
                color: i === crumbs.length - 1 ? COLOR.neutral[900] : COLOR.neutral[600],
                fontWeight: i === crumbs.length - 1 ? 600 : 400,
                textTransform: "capitalize",
              }}>
                {c}
              </span>
            </span>
          ))}
        </nav>

        <div style={{ flex: 1 }} />

        <button
          onClick={() => setOpen(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 12px",
            background: COLOR.neutral[50],
            border: `1px solid ${COLOR.neutral[200]}`,
            borderRadius: RADIUS.md,
            color: COLOR.neutral[500],
            fontSize: 12,
            cursor: "pointer",
            minWidth: 240,
          }}
        >
          <Search size={14} />
          <span style={{ flex: 1, textAlign: "left" }}>Tim kiem...</span>
          <kbd
            style={{
              padding: "1px 5px",
              background: "#fff",
              border: `1px solid ${COLOR.neutral[200]}`,
              borderRadius: 4,
              fontSize: 10,
            }}
          >
            Cmd+K
          </kbd>
        </button>

        <button
          aria-label="Notifications"
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: COLOR.neutral[600],
            padding: 6,
            display: "flex",
            alignItems: "center",
          }}
        >
          <Bell size={18} />
        </button>

        <div
          title={userEmail ?? userName}
          style={{
            width: 32,
            height: 32,
            borderRadius: 999,
            background: `linear-gradient(135deg, ${COLOR.brand[400]}, ${COLOR.brand[600]})`,
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          {initial}
        </div>
      </header>

      <CommandPalette open={open} onClose={() => setOpen(false)} />
    </>
  );
}
