"use client";

import { useEffect, useState } from "react";

interface Snap { id: string; takenAt: string; reason: string | null; checksum: string; taker: { name: string } | null }
interface Diff {
  base: { id: string; takenAt: string }; head: { id: string; takenAt: string };
  summary: { durationDelta: number; finishDelta: number; tasksChanged: number; cpChanged: number };
  tasksAdded: string[]; tasksRemoved: string[];
  tasksSlipped: { id: string; name: string; startDelta: number; finishDelta: number; oldStart: string; newStart: string; oldFinish: string; newFinish: string }[];
  cpAdded: string[]; cpRemoved: string[];
}

interface Props { storeId: string; onClose: () => void }

export default function SnapshotsPanel({ storeId, onClose }: Props) {
  const [list, setList] = useState<Snap[]>([]);
  const [headId, setHeadId] = useState<string>("");
  const [baseId, setBaseId] = useState<string>("");
  const [diff, setDiff] = useState<Diff | null>(null);
  const [taking, setTaking] = useState(false);

  const load = async () => {
    const r = await fetch(`/api/stores/${storeId}/snapshots`);
    if (r.ok) {
      const list = await r.json();
      setList(list);
      if (list[0]) setHeadId(list[0].id);
      if (list[1]) setBaseId(list[1].id);
    }
  };
  useEffect(() => { load(); }, [storeId]);

  useEffect(() => {
    if (!headId || !baseId || headId === baseId) { setDiff(null); return; }
    fetch(`/api/stores/${storeId}/snapshots/${headId}?diff=${baseId}`)
      .then((r) => r.ok ? r.json() : null).then(setDiff).catch(() => setDiff(null));
  }, [headId, baseId, storeId]);

  const take = async () => {
    setTaking(true);
    try {
      const reason = window.prompt("Reason (optional)?", "manual capture");
      const r = await fetch(`/api/stores/${storeId}/snapshots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason ?? "" }),
      });
      if (r.ok) await load();
    } finally { setTaking(false); }
  };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.25)", zIndex: 49, backdropFilter: "blur(2px)" }} />
      <aside style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 560, background: "#fff", borderLeft: "1px solid var(--border)", boxShadow: "-12px 0 32px rgba(15,23,42,0.12)", zIndex: 50, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "16px 22px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Schedule snapshots</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>Compare runs over time</h2>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", fontSize: 22, color: "var(--text-muted)", cursor: "pointer" }}>×</button>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: 22, display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={take} disabled={taking} className="gradient-btn" style={{ padding: "8px 14px", borderRadius: 6, border: "none", color: "#fff", fontSize: 13, fontWeight: 600, cursor: taking ? "not-allowed" : "pointer" }}>
              {taking ? "Capturing..." : "📸 Capture snapshot now"}
            </button>
            <span style={{ fontSize: 12, color: "var(--text-secondary)", alignSelf: "center" }}>{list.length} snapshots stored</span>
          </div>

          {list.length >= 2 && (
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Older (base)</div>
                <select className="input" value={baseId} onChange={(e) => setBaseId(e.target.value)} style={{ fontSize: 12 }}>
                  {list.map((s) => <option key={s.id} value={s.id}>{new Date(s.takenAt).toLocaleString()} {s.reason ? `· ${s.reason}` : ""}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Newer (head)</div>
                <select className="input" value={headId} onChange={(e) => setHeadId(e.target.value)} style={{ fontSize: 12 }}>
                  {list.map((s) => <option key={s.id} value={s.id}>{new Date(s.takenAt).toLocaleString()} {s.reason ? `· ${s.reason}` : ""}</option>)}
                </select>
              </div>
            </div>
          )}

          {diff && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
                <div className="stat-card" style={{ padding: 12 }}>
                  <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Duration Δ</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: diff.summary.durationDelta > 0 ? "#dc2626" : diff.summary.durationDelta < 0 ? "#10b981" : "var(--text-primary)" }}>
                    {diff.summary.durationDelta > 0 ? "+" : ""}{diff.summary.durationDelta}d
                  </div>
                </div>
                <div className="stat-card" style={{ padding: 12 }}>
                  <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Finish Δ</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: diff.summary.finishDelta > 0 ? "#dc2626" : diff.summary.finishDelta < 0 ? "#10b981" : "var(--text-primary)" }}>
                    {diff.summary.finishDelta > 0 ? "+" : ""}{diff.summary.finishDelta}d
                  </div>
                </div>
                <div className="stat-card" style={{ padding: 12 }}>
                  <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Tasks moved</div>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>{diff.summary.tasksChanged}</div>
                </div>
                <div className="stat-card" style={{ padding: 12 }}>
                  <div style={{ fontSize: 10, color: "var(--text-muted)" }}>CP changes</div>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>{diff.summary.cpChanged}</div>
                </div>
              </div>

              {diff.tasksSlipped.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Slipped tasks</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 220, overflow: "auto" }}>
                    {diff.tasksSlipped.slice(0, 30).map((tk) => (
                      <div key={tk.id} className="task-item" style={{ padding: "8px 10px", fontSize: 12, gap: 6 }}>
                        <div style={{ flex: 1, fontWeight: 600 }}>{tk.name}</div>
                        <span style={{ color: tk.startDelta > 0 ? "#dc2626" : tk.startDelta < 0 ? "#10b981" : "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
                          start {tk.startDelta > 0 ? "+" : ""}{tk.startDelta}d
                        </span>
                        <span style={{ color: tk.finishDelta > 0 ? "#dc2626" : tk.finishDelta < 0 ? "#10b981" : "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
                          finish {tk.finishDelta > 0 ? "+" : ""}{tk.finishDelta}d
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(diff.cpAdded.length > 0 || diff.cpRemoved.length > 0) && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Critical path changes</div>
                  {diff.cpAdded.length > 0 && (
                    <div style={{ fontSize: 12, color: "#dc2626" }}>
                      ⬆ Entered CP: {diff.cpAdded.join(", ")}
                    </div>
                  )}
                  {diff.cpRemoved.length > 0 && (
                    <div style={{ fontSize: 12, color: "#10b981" }}>
                      ⬇ Left CP: {diff.cpRemoved.join(", ")}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {list.length < 2 && (
            <div style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", padding: 30 }}>
              Capture at least 2 snapshots to see the diff. Use the button above.
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
