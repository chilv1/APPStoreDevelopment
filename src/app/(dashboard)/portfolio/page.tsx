import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import PortfolioClient from "./PortfolioClient";

export default async function PortfolioPage() {
  const session = await auth();
  if (!session) redirect("/login");
  return <PortfolioClient />;
}
