import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import Sidebar from "@/components/layout/Sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar session={session} />
      <main style={{
        marginLeft: "260px",
        flex: 1,
        minHeight: "100vh",
        background: "var(--bg-primary)",
      }}>
        {children}
      </main>
    </div>
  );
}
