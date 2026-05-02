"use client";

// Tiny client island for the only interactive element on the Reports page.
// Keeps the rest of the page server-rendered (zero client JS for the table).
export default function PrintButton({ label }: { label: string }) {
  return (
    <button
      onClick={() => window.print()}
      style={{
        padding: "10px 20px", borderRadius: 10, cursor: "pointer",
        background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)",
        color: "var(--text-secondary)", fontSize: 14, fontWeight: 500,
      }}>
      {label}
    </button>
  );
}
