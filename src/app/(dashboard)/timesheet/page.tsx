// Timesheet — server shell.
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import TimesheetClient from "./TimesheetClient";

export default async function TimesheetPage() {
  const session = await auth();
  if (!session) redirect("/login");
  return <TimesheetClient />;
}
