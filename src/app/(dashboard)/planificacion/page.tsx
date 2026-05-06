// Planificación page — server shell. Auth + render client.
//
// New module (rebuilt from scratch) — uses existing app visual style
// (white cards, blue/purple gradients, .data-table). Wires through to
// /api/planning, /api/dependencies, /api/stores/[id]/schedule and the
// standalone scheduler engine in src/lib/scheduler/.
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import PlanningClient from "./PlanningClient";

export default async function PlanningPage() {
  const session = await auth();
  if (!session) redirect("/login");
  return <PlanningClient />;
}
