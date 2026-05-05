import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import PlanningLoader from "@/components/planning/PlanningLoader";

export default async function PlanificacionPage() {
  const session = await auth();
  if (!session) redirect("/login");
  return <PlanningLoader />;
}
