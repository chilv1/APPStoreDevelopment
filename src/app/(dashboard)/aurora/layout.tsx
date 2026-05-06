import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import AuroraSidebar from "@/components/aurora/layout/AuroraSidebar";
import CommandBar from "@/components/aurora/layout/CommandBar";

export default async function AuroraLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  const user = session.user as { name?: string | null; email?: string | null } | undefined;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc" }}>
      <AuroraSidebar />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <CommandBar userName={user?.name ?? "User"} userEmail={user?.email ?? undefined} />
        <main style={{ flex: 1, padding: 24, overflowY: "auto" }}>{children}</main>
      </div>
    </div>
  );
}
