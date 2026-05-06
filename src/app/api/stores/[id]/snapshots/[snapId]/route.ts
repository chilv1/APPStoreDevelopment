/**
 * GET /api/stores/[id]/snapshots/[snapId]               — full snapshot payload
 * GET /api/stores/[id]/snapshots/[snapId]?diff=<other>  — diff vs another snapshot
 *
 * Diff returns:
 *   - tasksAdded / tasksRemoved
 *   - tasksSlipped: dates moved (start/finish delta in days)
 *   - cpAdded / cpRemoved (entered or left the critical path)
 *   - durationDelta
 *   - finishDelta (days)
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const MS_PER_DAY = 86_400_000;

interface SlimTask { id: string; name: string; type: string; start: string; finish: string; totalFloat: number; critical: boolean }
interface Slim { criticalPath: string[]; projectStart: string; projectFinish: string; durationDays: number; tasks: SlimTask[] }

function parsePayload(s: string): Slim | null {
  try { return JSON.parse(s) as Slim; } catch { return null; }
}

function diffDays(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / MS_PER_DAY);
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string; snapId: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, snapId } = await params;
  const url = new URL(req.url);
  const otherId = url.searchParams.get("diff");

  const snap = await prisma.scheduleSnapshot.findUnique({
    where: { id: snapId },
    include: { taker: { select: { id: true, name: true } } },
  });
  if (!snap || snap.storeId !== id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const slim = parsePayload(snap.payload);
  if (!slim) return NextResponse.json({ error: "Corrupt snapshot" }, { status: 500 });

  if (!otherId) {
    return NextResponse.json({ snapshot: { id: snap.id, takenAt: snap.takenAt, reason: snap.reason, taker: snap.taker, payload: slim } });
  }

  const other = await prisma.scheduleSnapshot.findUnique({ where: { id: otherId } });
  if (!other || other.storeId !== id) return NextResponse.json({ error: "Diff target not found" }, { status: 404 });
  const otherSlim = parsePayload(other.payload);
  if (!otherSlim) return NextResponse.json({ error: "Diff target corrupt" }, { status: 500 });

  // Compare snap (newer) vs other (older).
  const newById = new Map(slim.tasks.map((t) => [t.id, t]));
  const oldById = new Map(otherSlim.tasks.map((t) => [t.id, t]));

  const tasksAdded   = slim.tasks.filter((t) => !oldById.has(t.id)).map((t) => t.id);
  const tasksRemoved = otherSlim.tasks.filter((t) => !newById.has(t.id)).map((t) => t.id);

  const tasksSlipped: { id: string; name: string; startDelta: number; finishDelta: number; oldStart: string; newStart: string; oldFinish: string; newFinish: string }[] = [];
  for (const tNew of slim.tasks) {
    const tOld = oldById.get(tNew.id);
    if (!tOld) continue;
    const ds = diffDays(tOld.start, tNew.start);
    const df = diffDays(tOld.finish, tNew.finish);
    if (ds !== 0 || df !== 0) {
      tasksSlipped.push({ id: tNew.id, name: tNew.name, startDelta: ds, finishDelta: df,
        oldStart: tOld.start, newStart: tNew.start, oldFinish: tOld.finish, newFinish: tNew.finish });
    }
  }

  const oldCP = new Set(otherSlim.criticalPath);
  const newCP = new Set(slim.criticalPath);
  const cpAdded   = [...newCP].filter((id) => !oldCP.has(id));
  const cpRemoved = [...oldCP].filter((id) => !newCP.has(id));

  return NextResponse.json({
    base: { id: other.id, takenAt: other.takenAt, reason: other.reason },
    head: { id: snap.id,  takenAt: snap.takenAt,  reason: snap.reason  },
    summary: {
      durationDelta: slim.durationDays - otherSlim.durationDays,
      finishDelta:   diffDays(otherSlim.projectFinish, slim.projectFinish),
      tasksChanged:  tasksSlipped.length,
      cpChanged:     cpAdded.length + cpRemoved.length,
    },
    tasksAdded, tasksRemoved, tasksSlipped, cpAdded, cpRemoved,
  });
}
