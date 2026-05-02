// Reports page — Server Component shell.
// Auth check happens here so unauthenticated users redirect immediately.
// Renders <ReportsTabs> which is a client component that handles tab switching
// and lazy-loads each tab's content.
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getServerDict } from "@/lib/i18n/server";
import ReportsTabs from "./ReportsTabs";

export default async function ReportsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const user = session.user as any;

  const { t } = await getServerDict();

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1400, margin: "0 auto" }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "#f0f4ff", marginBottom: 6 }}>
          {t.reportsPage.title}
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
          Bienvenido · {user.name} · {user.role}
        </p>
      </div>

      <ReportsTabs userRole={user.role} />
    </div>
  );
}
