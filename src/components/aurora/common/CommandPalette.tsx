"use client";

import { useEffect, useState } from "react";
import { Search, ArrowRight } from "lucide-react";
import { COLOR, RADIUS, Z, SHADOW } from "@/lib/design/tokens";

interface Result {
  id: string;
  label: string;
  group: string;
  href: string;
}

const MOCK_RESULTS: Result[] = [
  { id: "1", label: "Portfolio Dashboard", group: "Trang", href: "/aurora/portfolio" },
  { id: "2", label: "Du an dang chay", group: "Trang", href: "/aurora/projects" },
  { id: "3", label: "Resource Heatmap", group: "Trang", href: "/aurora/resources" },
  { id: "4", label: "Cua hang Viettel tai Quan 1", group: "Du an", href: "/aurora/projects/p1" },
  { id: "5", label: "Cua hang Mobifone tai Cau Giay", group: "Du an", href: "/aurora/projects/p2" },
  { id: "6", label: "Bao cao tien do", group: "Bao cao", href: "/aurora/reports" },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CommandPalette({ open, onClose }: Props) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const filtered = query
    ? MOCK_RESULTS.filter((r) => r.label.toLowerCase().includes(query.toLowerCase()))
    : MOCK_RESULTS;

  const groups = filtered.reduce<Record<string, Result[]>>((acc, r) => {
    (acc[r.group] = acc[r.group] || []).push(r);
    return acc;
  }, {});

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.45)",
        zIndex: Z.modal,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: 100,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 560,
          maxWidth: "92vw",
          background: "#fff",
          borderRadius: RADIUS.xl,
          boxShadow: SHADOW.lg,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "14px 16px",
            borderBottom: `1px solid ${COLOR.neutral[100]}`,
          }}
        >
          <Search size={16} color={COLOR.neutral[400]} />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tim trang, du an, bao cao..."
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              fontSize: 14,
              background: "transparent",
              color: COLOR.neutral[900],
            }}
          />
          <kbd
            style={{
              padding: "2px 6px",
              fontSize: 11,
              color: COLOR.neutral[500],
              background: COLOR.neutral[100],
              borderRadius: 4,
            }}
          >
            Esc
          </kbd>
        </div>
        <div style={{ maxHeight: 400, overflowY: "auto", padding: 6 }}>
          {Object.keys(groups).length === 0 && (
            <div style={{ padding: 24, color: COLOR.neutral[500], fontSize: 13, textAlign: "center" }}>
              Khong tim thay ket qua
            </div>
          )}
          {Object.entries(groups).map(([group, items]) => (
            <div key={group} style={{ marginBottom: 4 }}>
              <div
                style={{
                  padding: "6px 10px",
                  fontSize: 11,
                  fontWeight: 600,
                  color: COLOR.neutral[500],
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {group}
              </div>
              {items.map((r) => (
                <a
                  key={r.id}
                  href={r.href}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 10px",
                    borderRadius: RADIUS.md,
                    fontSize: 13,
                    color: COLOR.neutral[800],
                    textDecoration: "none",
                  }}
                >
                  <span>{r.label}</span>
                  <ArrowRight size={14} color={COLOR.neutral[400]} />
                </a>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
