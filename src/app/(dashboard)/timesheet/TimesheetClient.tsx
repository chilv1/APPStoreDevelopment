"use client";

import { useEffect, useMemo, useState } from "react";
import { useT } from "@/lib/i18n/context";

const MS_PER_DAY = 86_400_000;
const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

interface Entry {
  id: string;
  userId: string;
  phaseId: string;
  taskId: string | null;
  date: string;
  hours: number;
  billable: boolean;
  notes: string | null;
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";
  phase: { id: string; name: string; phaseNumber: number; store: { id: string; code: string; name: string } };
}

interface PlanningStore { id: string; code: string; name: string; phases: { id: string; name: string; phaseNumber: number }[] }

function utcMidnight(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function startOfWeek(d: Date): Date {
  const m = utcMidnight(d);
  const dow = (m.getUTCDay() + 6) % 7; // Mon=0
  return new Date(m.getTime() - dow * MS_PER_DAY);
}

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const STATUS_META: Record<string, { label: string; bg: string; color: string }> = {
  DRAFT:     { label: "Draft",     bg: "rgba(15,23,42,0.05)",   color: "var(--text-muted)" },
  SUBMITTED: { label: "Submitted", bg: "rgba(245,158,11,0.1)",  color: "#92400e" },
  APPROVED:  { label: "Approved",  bg: "rgba(16,185,129,0.1)",  color: "#047857" },
  REJECTED:  { label: "Rejected",  bg: "rgba(239,68,68,0.1)",   color: "#dc2626" },
};

export default function TimesheetClient() {
  const t = useT();
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()));
  const [entries, setEntries] = useState<Entry[]>([]);
  const [stores, setStores] = useState<PlanningStore[]>([]);
  const [storeId, setStoreId] = useState<string>("");
  const [phaseId, setPhaseId] = useState<string>("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<{ date: string; hours: number; billable: boolean; notes: string }>({
    date: fmtDate(new Date()),
    hours: 4,
    billable: true,
    notes: "",
  });

  const load = async () => {
    const r = await fetch(`/api/timesheets?weekStart=${fmtDate(weekStart)}`);
    if (r.ok) {
      const d = await r.json();
      setEntries(d.entries ?? []);
    }
  };

  useEffect(() => { load(); }, [weekStart]);
  useEffect(() => {
    fetch("/api/planning?status=all&limit=200")
      .then((r) => r.json())
      .then((d) => {
        setStores(d.stores ?? []);
        if (!storeId && d.stores?.[0]) setStoreId(d.stores[0].id);
      })
      .catch(() => {});
  }, []);

  const activeStore = stores.find((s) => s.id === storeId);
  useEffect(() => {
    if (activeStore && !phaseId) setPhaseId(activeStore.phases[0]?.id ?? "");
  }, [activeStore]);

  const create = async () => {
    if (!phaseId) return;
    setAdding(true); setError(null);
    try {
      const r = await fetch("/api/timesheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phaseId, date: form.date, hours: form.hours, billable: form.billable, notes: form.notes }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e?.error ?? "Save failed");
      }
      setForm({ ...form, hours: 4, notes: "" });
      load();
    } catch (e: any) { setError(String(e.message ?? e)); }
    finally { setAdding(false); }
  };

  const submit = async (id: string) => {
    await fetch(`/api/timesheets/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "submit" }) });
    load();
  };
  const approve = async (id: string) => { await fetch(`/api/timesheets/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "approve" }) }); load(); };
  const reject  = async (id: string) => { await fetch(`/api/timesheets/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "reject"  }) }); load(); };
  const remove  = async (id: string) => { await fetch(`/api/timesheets/${id}`, { method: "DELETE" }); load(); };

  // Group entries by day (col) × phase (row).
  const grid = useMemo(() => {
    const byPhaseDay = new Map<string, Map<number, Entry[]>>();
    for (const e of entries) {
      const day = (new Date(e.date).getUTCDay() + 6) % 7;
      if (!byPhaseDay.has(e.phaseId)) byPhaseDay.set(e.phaseId, new Map());
      const m = byPhaseDay.get(e.phaseId)!;
      if (!m.has(day)) m.set(day, []);
      m.get(day)!.push(e);
    }
    const phases = new Map<string, { phaseNumber: number; name: string; storeCode: string; storeName: string }>();
    for (const e of entries) {
      phases.set(e.phaseId, { phaseNumber: e.phase.phaseNumber, name: e.phase.name, storeCode: e.phase.store.code, storeName: e.phase.store.name });
    }
    return { byPhaseDay, phases };
  }, [entries]);

  const dayTotals = useMemo(() => {
    const t = [0, 0, 0, 0, 0, 0, 0];
    for (const e of entries) {
      const day = (new Date(e.date).getUTCDay() + 6) % 7;
      t[day] += e.hours;
    }
    return t;
  }, [entries]);

  const grandTotal = dayTotals.reduce((s, x) => s + x, 0);

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1500, margin: "0 auto" }}>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)", marginBottom: 6 }}>
          ⏱️ Timesheet
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Captura semanal por fase + flujo de aprobación</p>
      </div>

      {/* Week nav */}
      <div className="glass" style={{ borderRadius: 14, padding: 16, marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => setWeekStart(new Date(weekStart.getTime() - 7 * MS_PER_DAY))} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", cursor: "pointer", fontSize: 13 }}>‹ Sem</button>
        <div style={{ flex: 1, textAlign: "center", fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
          Semana del {weekStart.toLocaleDateString()} — {new Date(weekStart.getTime() + 6 * MS_PER_DAY).toLocaleDateString()}
        </div>
        <button onClick={() => setWeekStart(new Date(weekStart.getTime() + 7 * MS_PER_DAY))} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", cursor: "pointer", fontSize: 13 }}>Sem ›</button>
        <button onClick={() => setWeekStart(startOfWeek(new Date()))} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", cursor: "pointer", fontSize: 13, marginLeft: 8 }}>Esta semana</button>
        <span style={{ fontSize: 13, color: "var(--text-secondary)", marginLeft: 12 }}>
          Total: <strong style={{ color: "var(--text-primary)", fontSize: 18 }}>{grandTotal.toFixed(1)}h</strong>
        </span>
      </div>

      {/* Add entry form */}
      <div className="glass" style={{ borderRadius: 14, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
          + Nueva entrada
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label style={{ fontSize: 11, color: "var(--text-muted)" }}>Tienda</label>
            <select className="input" value={storeId} onChange={(e) => { setStoreId(e.target.value); setPhaseId(""); }} style={{ fontSize: 13 }}>
              {stores.map((s) => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={{ fontSize: 11, color: "var(--text-muted)" }}>Fase</label>
            <select className="input" value={phaseId} onChange={(e) => setPhaseId(e.target.value)} style={{ fontSize: 13 }}>
              <option value="">—</option>
              {activeStore?.phases.map((p) => <option key={p.id} value={p.id}>F.{p.phaseNumber} {p.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: "var(--text-muted)" }}>Fecha</label>
            <input className="input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} style={{ fontSize: 13, width: 140 }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: "var(--text-muted)" }}>Horas</label>
            <input className="input" type="number" step="0.25" min="0" max="24" value={form.hours} onChange={(e) => setForm({ ...form, hours: Number(e.target.value) })} style={{ fontSize: 13, width: 90 }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: "var(--text-muted)" }}>Tipo</label>
            <select className="input" value={form.billable ? "B" : "N"} onChange={(e) => setForm({ ...form, billable: e.target.value === "B" })} style={{ fontSize: 13 }}>
              <option value="B">Billable</option>
              <option value="N">No-bill</option>
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={{ fontSize: 11, color: "var(--text-muted)" }}>Notas</label>
            <input className="input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="(opcional)" style={{ fontSize: 13 }} />
          </div>
          <button className="gradient-btn" onClick={create} disabled={!phaseId || adding} style={{ padding: "8px 16px", borderRadius: 6, border: "none", color: "#fff", fontSize: 13, fontWeight: 600, cursor: adding ? "not-allowed" : "pointer" }}>
            {adding ? "..." : "+ Add"}
          </button>
        </div>
        {error && <div style={{ fontSize: 12, color: "#dc2626", marginTop: 8 }}>⚠ {error}</div>}
      </div>

      {/* Grid */}
      <div className="glass" style={{ borderRadius: 14, overflow: "auto" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Fase</th>
              {DAYS.map((d, i) => (
                <th key={d} style={{ width: 110, textAlign: "center" }}>
                  <div>{d}</div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 400 }}>
                    {new Date(weekStart.getTime() + i * MS_PER_DAY).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </div>
                </th>
              ))}
              <th style={{ width: 90 }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {[...grid.phases.entries()].map(([phaseId, info]) => {
              const dayMap = grid.byPhaseDay.get(phaseId)!;
              const rowTotal = [...dayMap.values()].flat().reduce((s, e) => s + e.hours, 0);
              return (
                <tr key={phaseId}>
                  <td>
                    <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>F.{info.phaseNumber} {info.name}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{info.storeCode} · {info.storeName}</div>
                  </td>
                  {DAYS.map((_, di) => {
                    const list = dayMap.get(di) ?? [];
                    const total = list.reduce((s, e) => s + e.hours, 0);
                    return (
                      <td key={di} style={{ textAlign: "center", padding: "6px 4px" }}>
                        {list.length === 0 ? <span style={{ color: "var(--text-muted)" }}>—</span> : (
                          <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
                            {list.map((e) => {
                              const m = STATUS_META[e.status];
                              return (
                                <div key={e.id} title={e.notes ?? ""} style={{ background: m.bg, color: m.color, padding: "2px 6px", borderRadius: 4, fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                                  {e.hours}h
                                  {e.status === "DRAFT" && (
                                    <>
                                      <button onClick={() => submit(e.id)} title="Submit" style={{ background: "transparent", border: "none", color: "#1d4ed8", cursor: "pointer", fontSize: 11, padding: 0 }}>↑</button>
                                      <button onClick={() => remove(e.id)} title="Delete" style={{ background: "transparent", border: "none", color: "#dc2626", cursor: "pointer", fontSize: 11, padding: 0 }}>×</button>
                                    </>
                                  )}
                                  {e.status === "SUBMITTED" && (
                                    <>
                                      <button onClick={() => approve(e.id)} title="Approve" style={{ background: "transparent", border: "none", color: "#047857", cursor: "pointer", fontSize: 11, padding: 0 }}>✓</button>
                                      <button onClick={() => reject(e.id)} title="Reject" style={{ background: "transparent", border: "none", color: "#dc2626", cursor: "pointer", fontSize: 11, padding: 0 }}>✕</button>
                                    </>
                                  )}
                                </div>
                              );
                            })}
                            {list.length > 1 && <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{total}h</div>}
                          </div>
                        )}
                      </td>
                    );
                  })}
                  <td style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums", textAlign: "right" }}>{rowTotal.toFixed(1)}h</td>
                </tr>
              );
            })}
            <tr style={{ background: "rgba(15,23,42,0.03)" }}>
              <td style={{ fontWeight: 700, color: "var(--text-secondary)" }}>Daily total</td>
              {dayTotals.map((tot, i) => (
                <td key={i} style={{ textAlign: "center", fontWeight: 700, fontVariantNumeric: "tabular-nums", color: "var(--text-secondary)" }}>{tot > 0 ? `${tot.toFixed(1)}h` : "—"}</td>
              ))}
              <td style={{ textAlign: "right", fontWeight: 800, fontVariantNumeric: "tabular-nums", color: "var(--text-primary)" }}>{grandTotal.toFixed(1)}h</td>
            </tr>
            {grid.phases.size === 0 && (
              <tr>
                <td colSpan={9} style={{ padding: 60, textAlign: "center", color: "var(--text-secondary)" }}>
                  No hay entradas esta semana — usa el formulario de arriba para registrar tus horas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
