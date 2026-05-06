"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  Clock,
  FileBarChart,
  Settings,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { COLOR, RADIUS } from "@/lib/design/tokens";
import { MOCK_PROJECTS } from "@/lib/aurora/mock";

const NAV = [
  { href: "/aurora/portfolio", label: "Portfolio", Icon: LayoutDashboard },
  { href: "/aurora/projects", label: "Du an", Icon: FolderKanban },
  { href: "/aurora/resources", label: "Nguon luc", Icon: Users },
  { href: "/aurora/timesheets", label: "Timesheet", Icon: Clock },
  { href: "/aurora/reports", label: "Bao cao", Icon: FileBarChart },
  { href: "/aurora/admin", label: "Quan tri", Icon: Settings },
];

export default function AuroraSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [activeProject, setActiveProject] = useState(MOCK_PROJECTS[0]);

  return (
    <aside
      style={{
        width: 240,
        height: "100vh",
        position: "sticky",
        top: 0,
        background: "#fff",
        borderRight: `1px solid ${COLOR.neutral[200]}`,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ padding: "18px 16px", borderBottom: `1px solid ${COLOR.neutral[100]}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: RADIUS.md,
              background: `linear-gradient(135deg, ${COLOR.brand[400]}, ${COLOR.brand[600]})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
            }}
          >
            <Sparkles size={18} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: COLOR.neutral[900] }}>Aurora PM</div>
            <div style={{ fontSize: 11, color: COLOR.neutral[500] }}>Enterprise Project Hub</div>
          </div>
        </div>
      </div>

      <div style={{ padding: "12px 12px 0" }}>
        <button
          onClick={() => setOpen(!open)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 12px",
            background: COLOR.neutral[50],
            border: `1px solid ${COLOR.neutral[200]}`,
            borderRadius: RADIUS.md,
            fontSize: 12,
            color: COLOR.neutral[800],
            cursor: "pointer",
          }}
        >
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {activeProject.name}
          </span>
          <ChevronDown size={14} />
        </button>
        {open && (
          <div
            style={{
              marginTop: 6,
              background: "#fff",
              border: `1px solid ${COLOR.neutral[200]}`,
              borderRadius: RADIUS.md,
              maxHeight: 220,
              overflowY: "auto",
            }}
          >
            {MOCK_PROJECTS.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setActiveProject(p);
                  setOpen(false);
                }}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "8px 12px",
                  fontSize: 12,
                  color: COLOR.neutral[800],
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontWeight: 500 }}>{p.name}</div>
                <div style={{ fontSize: 11, color: COLOR.neutral[500] }}>{p.code}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      <nav style={{ flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: 2 }}>
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 12px",
                fontSize: 13,
                fontWeight: 500,
                color: active ? COLOR.brand[700] : COLOR.neutral[700],
                background: active ? COLOR.brand[50] : "transparent",
                borderRadius: RADIUS.md,
                textDecoration: "none",
              }}
            >
              <item.Icon size={16} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div
        style={{
          padding: "12px 16px",
          borderTop: `1px solid ${COLOR.neutral[100]}`,
          fontSize: 11,
          color: COLOR.neutral[500],
        }}
      >
        Aurora PM v0.1
      </div>
    </aside>
  );
}
