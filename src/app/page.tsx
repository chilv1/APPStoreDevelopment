import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function HomePage() {
  const session = await auth();
  if (!session) redirect("/login");
  // /reports is the primary landing page (Resumen/dashboard hidden from sidebar).
  redirect("/reports");
}
