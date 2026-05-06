/**
 * POST /api/report-schedules/[id]/run
 *
 * P4 — preview-only digest generator. Builds the email body that would be
 * sent for this schedule, but doesn't actually send (SMTP transport
 * deferred). Returns:
 *   { subject, bodyMarkdown, recipients, generatedAt }
 *
 * Updates `lastRunAt` so callers can audit when the preview was rendered.
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { scheduleStore } from "@/lib/scheduler/db-bridge";
import { analyzeRisks, buildWeeklySummary } from "@/lib/ai/risk-analyzer";

const MS_PER_DAY = 86_400_000;

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session.user as any;
  if (!["ADMIN", "AREA_MANAGER"].includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const sch = await prisma.reportSchedule.findUnique({ where: { id } });
  if (!sch) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const stores = sch.storeId
    ? [await prisma.storeProject.findUnique({ where: { id: sch.storeId }, select: { id: true, code: true, name: true } })].filter(Boolean) as Array<{ id: string; code: string; name: string }>
    : (await prisma.storeProject.findMany({ select: { id: true, code: true, name: true }, take: 25 }));

  const sections: string[] = [];
  if (sch.reportKind === "WEEKLY_SUMMARY") {
    for (const s of stores) {
      const phases = await prisma.phase.findMany({
        where: { storeId: s.id },
        orderBy: { order: "asc" },
        select: { id: true, phaseNumber: true, name: true, status: true, plannedStart: true, plannedEnd: true, actualStart: true, actualEnd: true, deadline: true, progressPct: true },
      });
      const result = await scheduleStore(prisma, s.id);
      const risks  = analyzeRisks(result, phases);
      const summary = buildWeeklySummary(result, phases, risks);
      sections.push(`## ${s.code} · ${s.name}\n\n${summary}\n\n- Critical path: ${result.criticalPath.length} phases\n- Project finish: ${result.projectFinish.toISOString().slice(0,10)}\n- ${result.errors.length} errors, ${result.warnings.length} warnings\n`);
    }
  } else if (sch.reportKind === "COST_VARIANCE") {
    sections.push("# Cost variance digest\n");
    for (const s of stores) {
      const phases = await prisma.phase.findMany({
        where: { storeId: s.id },
        select: {
          fixedCost: true, status: true, plannedStart: true, plannedEnd: true, progressPct: true,
          assignments: { select: { workHours: true, cost: true, actualWork: true, resource: { select: { standardRate: true } } } },
        },
      });
      let bcws = 0, bcwp = 0, acwp = 0, total = 0;
      const today = Date.now();
      for (const p of phases) {
        const t = p.fixedCost + p.assignments.reduce((s, a) => s + a.cost, 0);
        total += t;
        const ps = p.plannedStart?.getTime() ?? null;
        const pe = p.plannedEnd?.getTime() ?? null;
        let frac = 0;
        if (ps !== null && pe !== null) {
          if (today >= pe) frac = 1;
          else if (today > ps) frac = (today - ps) / Math.max(1, pe - ps);
        }
        bcws += t * frac;
        if (p.status === "COMPLETED" || (pe && today >= pe)) bcwp += t;
        const labor = p.assignments.reduce((s, a) => s + a.actualWork * (a.resource?.standardRate ?? 0), 0);
        acwp += labor + p.fixedCost * frac;
      }
      const cpi = acwp > 0 ? bcwp / acwp : null;
      sections.push(`## ${s.code}\n\n- Total: ${total.toLocaleString(undefined, { maximumFractionDigits: 0 })}\n- BCWS / BCWP / ACWP: ${bcws.toFixed(0)} / ${bcwp.toFixed(0)} / ${acwp.toFixed(0)}\n- CPI: ${cpi == null ? "—" : cpi.toFixed(2)}\n`);
    }
  } else { // RISK_DIGEST
    sections.push("# Risk digest — top items per store\n");
    for (const s of stores) {
      const phases = await prisma.phase.findMany({
        where: { storeId: s.id },
        orderBy: { order: "asc" },
        select: { id: true, phaseNumber: true, name: true, status: true, plannedStart: true, plannedEnd: true, actualStart: true, actualEnd: true, deadline: true, progressPct: true },
      });
      const result = await scheduleStore(prisma, s.id);
      const risks = analyzeRisks(result, phases).filter((r) => r.severity === "CRITICAL" || r.severity === "HIGH").slice(0, 5);
      if (risks.length === 0) { sections.push(`## ${s.code} · ${s.name}\n\n_No critical or high risks._\n`); continue; }
      const lines = risks.map((r) => `- **[${r.severity}]** ${r.message}${r.suggestion ? ` _Mitigation: ${r.suggestion}_` : ""}`).join("\n");
      sections.push(`## ${s.code} · ${s.name}\n\n${lines}\n`);
    }
  }

  let recipients: string[] = [];
  try { recipients = JSON.parse(sch.recipients); } catch {}

  const subject = `[${sch.reportKind.replace("_", " ")}] ${sch.name} · ${new Date().toLocaleDateString()}`;
  const bodyMarkdown = `# ${sch.name}\n\n_Generated ${new Date().toISOString()}._\n\n${sections.join("\n---\n\n")}`;

  await prisma.reportSchedule.update({ where: { id }, data: { lastRunAt: new Date() } });

  return NextResponse.json({
    subject, bodyMarkdown, recipients,
    generatedAt: new Date().toISOString(),
    note: "Email transport not wired yet. Copy this body to your mail client or hook this endpoint to a cron + SMTP runner in P5.",
  });
}
