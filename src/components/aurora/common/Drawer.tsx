"use client";

import { ReactNode, useEffect } from "react";
import { X } from "lucide-react";
import { COLOR, Z, SHADOW } from "@/lib/design/tokens";

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  width?: number;
  children: ReactNode;
}

export default function Drawer({ open, onClose, title, width = 420, children }: Props) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15,23,42,0.30)",
          zIndex: Z.drawer,
        }}
      />
      <aside
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          height: "100vh",
          width,
          background: "#fff",
          boxShadow: SHADOW.lg,
          zIndex: Z.drawer + 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 18px",
            borderBottom: `1px solid ${COLOR.neutral[200]}`,
          }}
        >
          <h3 style={{ fontSize: 15, fontWeight: 600, color: COLOR.neutral[900] }}>{title}</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: COLOR.neutral[500],
              padding: 4,
              display: "flex",
              alignItems: "center",
            }}
          >
            <X size={18} />
          </button>
        </header>
        <div style={{ flex: 1, overflowY: "auto", padding: 18 }}>{children}</div>
      </aside>
    </>
  );
}
