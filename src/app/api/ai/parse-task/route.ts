/**
 * POST /api/ai/parse-task
 *
 * Stream 9 P3 — natural language task creation.
 *
 * Body: { text: string, storeId: string }
 * Returns: { suggestion: { name, durationDays, dependsOnPhaseNumber?, depType?, lagDays?, deadline? } }
 *
 * If ANTHROPIC_API_KEY is set, calls Claude Haiku for parsing. Otherwise
 * falls back to a regex parser that handles patterns like:
 *   "Survey site, 5 days, after F.2"
 *   "Procure equipment, 2 weeks, depends on permits"
 *   "Final inspection 3d due 2026-12-15"
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface Suggestion {
  name: string;
  durationDays: number;
  dependsOnPhaseNumber?: number;
  depType?: "FS" | "SS" | "FF" | "SF";
  lagDays?: number;
  deadline?: string;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body?.text || !body?.storeId) return NextResponse.json({ error: "text + storeId required" }, { status: 400 });

  const phases = await prisma.phase.findMany({
    where: { storeId: body.storeId },
    orderBy: { order: "asc" },
    select: { id: true, phaseNumber: true, name: true },
  });

  const llm = await tryLLM(body.text, phases.map((p) => ({ n: p.phaseNumber, name: p.name })));
  const suggestion = llm ?? fallbackRegex(body.text);

  return NextResponse.json({
    suggestion,
    source: llm ? "llm" : "regex",
    phases: phases.map((p) => ({ phaseNumber: p.phaseNumber, name: p.name })),
  });
}

async function tryLLM(text: string, phases: { n: number; name: string }[]): Promise<Suggestion | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
        messages: [{
          role: "user",
          content: `Parse the following task description into JSON. Available phases in this project (number · name): ${phases.map((p) => `F.${p.n} ${p.name}`).join(", ")}.\n\nDescription: "${text}"\n\nReturn ONLY a JSON object with these keys:\n  name (string, the task title — clean it up if the input is sloppy)\n  durationDays (number, in working days; convert weeks if needed)\n  dependsOnPhaseNumber (number, optional, only if they reference one of the existing phases)\n  depType (one of FS/SS/FF/SF, default FS)\n  lagDays (number, optional)\n  deadline (ISO date YYYY-MM-DD, optional)\n\nNo prose, no markdown — pure JSON.`,
        }],
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const raw = data?.content?.[0]?.text?.trim() ?? "";
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) return null;
    const obj = JSON.parse(m[0]);
    if (typeof obj?.name !== "string" || typeof obj?.durationDays !== "number") return null;
    return obj as Suggestion;
  } catch {
    return null;
  }
}

function fallbackRegex(text: string): Suggestion {
  const t = text.trim();
  // Duration: "5 days", "2 weeks", "3d", "2w".
  const durM = t.match(/(\d+)\s*(d|day|days|w|wk|wks|week|weeks)\b/i);
  let durationDays = 7;
  if (durM) {
    const n = Number(durM[1]);
    durationDays = /^w/i.test(durM[2]) ? n * 5 : n;
  }
  // Phase reference: "F.3" / "phase 3" / "after 3".
  const phaseM = t.match(/(?:F\.?|phase|fase|after|depends on|tras|despues de)\s*(\d+)/i);
  const dependsOnPhaseNumber = phaseM ? Number(phaseM[1]) : undefined;
  // Dep type hint.
  let depType: Suggestion["depType"] = "FS";
  if (/start[- ]to[- ]start|SS\b/i.test(t)) depType = "SS";
  else if (/finish[- ]to[- ]finish|FF\b/i.test(t)) depType = "FF";
  else if (/start[- ]to[- ]finish|SF\b/i.test(t)) depType = "SF";
  // Lag: "+2d" or "lag 3 days".
  const lagM = t.match(/lag\s*(\d+)\s*(d|day|days|w|week|weeks)?|\+(\d+)\s*d/i);
  const lagDays = lagM ? Number(lagM[1] ?? lagM[3] ?? "0") : undefined;
  // Deadline: ISO date.
  const dateM = t.match(/(20\d{2}-\d{2}-\d{2})/);
  const deadline = dateM?.[1];
  // Name: strip duration/phase/lag/deadline tokens.
  const name = t
    .replace(/\d+\s*(d|day|days|w|wk|wks|week|weeks)\b/gi, "")
    .replace(/(?:F\.?|phase|fase|after|depends on|tras|despues de)\s*\d+/gi, "")
    .replace(/lag\s*\d+\s*(d|day|days|w|week|weeks)?/gi, "")
    .replace(/[+]\d+\s*d/gi, "")
    .replace(/20\d{2}-\d{2}-\d{2}/g, "")
    .replace(/[,;]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    || "Untitled task";
  return { name, durationDays, dependsOnPhaseNumber, depType, lagDays, deadline };
}
