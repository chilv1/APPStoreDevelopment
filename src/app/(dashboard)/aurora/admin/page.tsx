import { Settings, Users, Shield, Bell } from "lucide-react";
import { COLOR, RADIUS } from "@/lib/design/tokens";

const SECTIONS = [
  { Icon: Users, title: "Quan ly nguoi dung", description: "Vai tro, quyen va phan vung" },
  { Icon: Shield, title: "Bao mat", description: "Chinh sach mat khau, SSO, audit log" },
  { Icon: Bell, title: "Thong bao", description: "Cau hinh email va in-app notifications" },
  { Icon: Settings, title: "Tuy chinh", description: "Branding, trang chu, phim tat" },
];

export default function AdminPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <header>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: COLOR.neutral[900] }}>Quan tri</h1>
        <p style={{ fontSize: 13, color: COLOR.neutral[600], marginTop: 4 }}>
          Cau hinh he thong va workspace
        </p>
      </header>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
        {SECTIONS.map((s) => (
          <div
            key={s.title}
            style={{
              background: "#fff",
              border: `1px solid ${COLOR.neutral[200]}`,
              borderRadius: RADIUS.lg,
              padding: 18,
              display: "flex",
              gap: 14,
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: RADIUS.md,
                background: COLOR.brand[50],
                color: COLOR.brand[700],
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <s.Icon size={18} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: COLOR.neutral[900] }}>{s.title}</div>
              <div style={{ fontSize: 12, color: COLOR.neutral[600], marginTop: 2 }}>{s.description}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
