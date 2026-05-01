"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { formatDate, formatCurrency, STATUS_LABELS, STATUS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS, PHASE_ICONS } from "@/lib/utils";
import { useSession } from "next-auth/react";
import TaskModal from "@/components/stores/TaskModal";
import IssueModal from "@/components/stores/IssueModal";
import EditStoreModal from "@/components/stores/EditStoreModal";

type Tab = "phases" | "gantt" | "issues" | "activity";

export default function StoreDetailPage() {
  const { id } = useParams() as { id: string };
  const { data: session } = useSession();
  const user = session?.user as any;
  const [store, setStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("phases");
  const [selectedPhase, setSelectedPhase] = useState<any>(null);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [showIssue, setShowIssue] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const fetchStore = () => {
    fetch(`/api/stores/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setStore(d);
        setLoading(false);
        setSelectedPhase((prev: any) => {
          if (!prev) return d.phases?.[0] ?? null;
          return d.phases?.find((p: any) => p.id === prev.id) ?? prev;
        });
      });
  };

  useEffect(() => {
    fetchStore();
    const iv = setInterval(fetchStore, 30000);
    return () => clearInterval(iv);
  }, [id]);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", flexDirection: "column", gap: 16 }}>
      <div className="spinner" />
      <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Đang tải...</p>
    </div>
  );

  if (!store) return <div style={{ padding: 32, color: "var(--text-secondary)" }}>Không tìm thấy cửa hàng</div>;

  const completedPhases = store.phases?.filter((p: any) => p.status === "COMPLETED").length || 0;

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1400, margin: "0 auto" }}>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, fontSize: 13, color: "var(--text-secondary)" }}>
        <Link href="/stores" style={{ color: "var(--accent-blue)", textDecoration: "none" }}>🏪 Cửa hàng</Link>
        <span>›</span>
        <span style={{ color: "#f0f4ff" }}>{store.name}</span>
      </div>

      {/* Store Header */}
      <div style={{
        background: "var(--bg-card)", border: "1px solid var(--border)",
        borderRadius: 16, padding: 24, marginBottom: 24,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, flexWrap: "wrap" }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: "#f0f4ff" }}>{store.name}</h1>
              <span className={`badge ${STATUS_COLORS[store.status]}`}>{STATUS_LABELS[store.status]}</span>
            </div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 4 }}>📍 {store.address}</div>
            <div style={{ display: "flex", gap: 20, fontSize: 13, color: "var(--text-secondary)", flexWrap: "wrap", marginTop: 8 }}>
              <span>🔖 {store.code}</span>
              {store.bc
                ? <span>🏢 <strong style={{ color: "#f0f4ff" }}>{store.bc.branch?.name}</strong> · <strong style={{ color: "#60a5fa" }}>{store.bc.code}</strong> — {store.bc.name}</span>
                : store.region && <span>🌏 {store.region}</span>
              }
              {store.pm && <span>👤 PM: <strong style={{ color: "#f0f4ff" }}>{store.pm.name}</strong></span>}
              {store.budget && <span>💰 {formatCurrency(store.budget)}</span>}
              {store.targetOpenDate && <span>🎯 KH khai trương: <strong style={{ color: "#f0f4ff" }}>{formatDate(store.targetOpenDate)}</strong></span>}
              {store.latitude != null && store.longitude != null && (
                <a href={`https://www.google.com/maps?q=${store.latitude},${store.longitude}`} target="_blank" rel="noopener noreferrer"
                  style={{ color: "var(--accent-blue)", textDecoration: "none", fontSize: 13 }}>
                  📍 {store.latitude.toFixed(5)}, {store.longitude.toFixed(5)}
                </a>
              )}
            </div>
          </div>

          {/* Edit button */}
          {["ADMIN", "AREA_MANAGER"].includes(user?.role) && (
            <button onClick={() => setShowEdit(true)} style={{
              padding: "8px 18px", borderRadius: 10, border: "1px solid var(--border)",
              background: "rgba(255,255,255,0.06)", color: "var(--text-secondary)",
              fontSize: 13, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap",
              transition: "all 0.15s ease",
            }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#f0f4ff"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.3)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"; }}
            >
              ✏️ Chỉnh sửa
            </button>
          )}

          {/* Overall Progress */}
          <div style={{ textAlign: "right", minWidth: 180 }}>
            <div style={{ fontSize: 36, fontWeight: 900, color: "#f0f4ff", lineHeight: 1 }}>{store.progress}%</div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>Hoàn thành {completedPhases}/11 giai đoạn</div>
            <div className="progress-bar" style={{ height: 8 }}>
              <div className="progress-bar-fill" style={{ width: `${store.progress}%` }} />
            </div>
          </div>
        </div>

        {/* Phase stepper (mini) */}
        <div style={{ display: "flex", gap: 6, marginTop: 20, overflowX: "auto", paddingBottom: 4 }}>
          {store.phases?.map((phase: any) => (
            <div key={phase.id}
              onClick={() => { setSelectedPhase(phase); setActiveTab("phases"); }}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                cursor: "pointer", minWidth: 54, opacity: phase.status === "NOT_STARTED" ? 0.4 : 1,
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16,
                background: phase.status === "COMPLETED" ? "rgba(16,185,129,0.2)"
                  : phase.status === "IN_PROGRESS" ? "rgba(59,130,246,0.2)"
                  : "rgba(255,255,255,0.05)",
                border: `2px solid ${phase.status === "COMPLETED" ? "#10b981" : phase.status === "IN_PROGRESS" ? "#3b82f6" : "rgba(255,255,255,0.1)"}`,
              }}>
                {phase.status === "COMPLETED" ? "✓" : PHASE_ICONS[phase.phaseNumber]}
              </div>
              <div style={{ fontSize: 9, color: "var(--text-muted)", textAlign: "center", lineHeight: 1.2 }}>
                GĐ {phase.phaseNumber}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "rgba(255,255,255,0.03)", padding: 4, borderRadius: 10, border: "1px solid var(--border)", width: "fit-content" }}>
        {([
          { key: "phases", label: "📋 Giai đoạn & Tasks" },
          { key: "gantt", label: "📅 Gantt Chart" },
          { key: "issues", label: `⚠️ Vướng mắc ${store.issues?.length ? `(${store.issues.length})` : ""}` },
          { key: "activity", label: "🕐 Lịch sử" },
        ] as { key: Tab; label: string }[]).map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
            padding: "8px 16px", borderRadius: 7, border: "none", cursor: "pointer",
            fontSize: 13, fontWeight: 500,
            background: activeTab === tab.key ? "rgba(59,130,246,0.2)" : "transparent",
            color: activeTab === tab.key ? "#60a5fa" : "var(--text-secondary)",
            transition: "all 0.15s ease",
          }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "phases" && (
        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 20 }}>
          {/* Phase list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {store.phases?.map((phase: any) => (
              <div key={phase.id} className={`phase-step ${selectedPhase?.id === phase.id ? "active" : ""} ${phase.status === "COMPLETED" ? "completed" : ""}`}
                onClick={() => setSelectedPhase(phase)}>
                <div className="phase-dot" style={{
                  background: phase.status === "COMPLETED" ? "rgba(16,185,129,0.2)"
                    : phase.status === "IN_PROGRESS" ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.05)",
                  border: `2px solid ${phase.status === "COMPLETED" ? "#10b981" : phase.status === "IN_PROGRESS" ? "#3b82f6" : "rgba(255,255,255,0.1)"}`,
                  color: phase.status === "COMPLETED" ? "#10b981" : phase.status === "IN_PROGRESS" ? "#3b82f6" : "var(--text-muted)",
                  fontSize: phase.status === "COMPLETED" ? 16 : 13,
                }}>
                  {phase.status === "COMPLETED" ? "✓" : phase.phaseNumber}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#f0f4ff", lineHeight: 1.3 }}>{phase.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                    {phase.tasks?.filter((t: any) => t.status === "DONE").length || 0}/{phase.tasks?.length || 0} tasks
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Task list */}
          {selectedPhase && (
            <div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: "#f0f4ff" }}>
                      {PHASE_ICONS[selectedPhase.phaseNumber]} GĐ {selectedPhase.phaseNumber}: {selectedPhase.name}
                    </h2>
                    <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>{selectedPhase.description}</p>
                  </div>
                  <span className={`badge ${STATUS_COLORS[selectedPhase.status]}`}>{STATUS_LABELS[selectedPhase.status]}</span>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {selectedPhase.tasks?.map((task: any) => (
                  <div key={task.id} className="task-item"
                    onClick={() => setSelectedTask(task)}
                    style={{ cursor: "pointer" }}>
                    {/* Checkbox */}
                    <div style={{
                      width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                      border: `2px solid ${task.status === "DONE" ? "#10b981" : task.status === "IN_PROGRESS" ? "#3b82f6" : "rgba(255,255,255,0.2)"}`,
                      background: task.status === "DONE" ? "rgba(16,185,129,0.2)" : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11,
                    }}>
                      {task.status === "DONE" && "✓"}
                      {task.status === "IN_PROGRESS" && "●"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 14, fontWeight: 500,
                        color: task.status === "DONE" ? "var(--text-secondary)" : "#f0f4ff",
                        textDecoration: task.status === "DONE" ? "line-through" : "none",
                        lineHeight: 1.3,
                      }}>
                        {task.title}
                      </div>
                      <div style={{ display: "flex", gap: 8, marginTop: 4, alignItems: "center", flexWrap: "wrap" }}>
                        {task.assignee && (
                          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>👤 {task.assignee.name}</span>
                        )}
                        {task.dueDate && (
                          <span style={{ fontSize: 11, color: new Date(task.dueDate) < new Date() && task.status !== "DONE" ? "#f87171" : "var(--text-muted)" }}>
                            📅 {formatDate(task.dueDate)}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className={`badge ${PRIORITY_COLORS[task.priority]}`} style={{ fontSize: 10 }}>
                      {PRIORITY_LABELS[task.priority]}
                    </span>
                    <span className={`badge ${STATUS_COLORS[task.status]}`} style={{ fontSize: 10 }}>
                      {STATUS_LABELS[task.status]}
                    </span>
                  </div>
                ))}
                {(!selectedPhase.tasks || selectedPhase.tasks.length === 0) && (
                  <div style={{ textAlign: "center", padding: 32, color: "var(--text-muted)", fontSize: 13 }}>
                    Chưa có task nào trong giai đoạn này
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "gantt" && <GanttChart phases={store.phases || []} targetDate={store.targetOpenDate} />}

      {activeTab === "issues" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#f0f4ff" }}>Vướng mắc & Rủi ro</h2>
            <button onClick={() => setShowIssue(true)} className="gradient-btn" style={{
              padding: "8px 16px", borderRadius: 8, border: "none",
              color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}>+ Ghi nhận vướng mắc</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {store.issues?.map((issue: any) => (
              <div key={issue.id} style={{
                background: "var(--bg-card)", border: `1px solid ${issue.severity === "HIGH" || issue.severity === "CRITICAL" ? "rgba(239,68,68,0.3)" : "var(--border)"}`,
                borderRadius: 12, padding: 16,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#f0f4ff" }}>
                    {issue.type === "RISK" ? "⚠️" : "🔴"} {issue.title}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <span className={`badge ${STATUS_COLORS[issue.status]}`} style={{ fontSize: 10 }}>{STATUS_LABELS[issue.status] || issue.status}</span>
                    <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: issue.severity === "HIGH" ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.15)", color: issue.severity === "HIGH" ? "#fca5a5" : "#fcd34d" }}>
                      {issue.severity}
                    </span>
                  </div>
                </div>
                {issue.description && <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 8 }}>{issue.description}</p>}
                {issue.resolution && (
                  <div style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#6ee7b7" }}>
                    ✓ Giải pháp: {issue.resolution}
                  </div>
                )}
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>
                  Báo cáo bởi: {issue.reporter?.name || "N/A"} · {new Date(issue.createdAt).toLocaleDateString("vi-VN")}
                </div>
              </div>
            ))}
            {(!store.issues || store.issues.length === 0) && (
              <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)", fontSize: 14 }}>
                ✅ Không có vướng mắc nào. Tiến độ suôn sẻ!
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "activity" && (
        <div style={{ maxWidth: 600 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#f0f4ff", marginBottom: 16 }}>Lịch sử hoạt động</h2>
          {store.activities?.map((act: any, i: number) => (
            <div key={i} className="activity-item">
              <div className="activity-dot" style={{ background: "#3b82f6" }} />
              <div>
                <div style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  <span style={{ color: "#f0f4ff", fontWeight: 600 }}>{act.user?.name || "System"}</span>
                  {" "}{act.details}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>
                  {new Date(act.createdAt).toLocaleString("vi-VN")}
                </div>
              </div>
            </div>
          ))}
          {(!store.activities || store.activities.length === 0) && (
            <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Chưa có hoạt động nào</p>
          )}
        </div>
      )}

      {/* Task Modal */}
      {selectedTask && (
        <TaskModal
          task={selectedTask}
          storeId={id}
          canEdit={["ADMIN", "AREA_MANAGER", "PM"].includes(user?.role || "") ||
            (user?.role === "SURVEY_STAFF" && selectedPhase?.phaseNumber <= 2)}
          onClose={() => setSelectedTask(null)}
          onUpdated={() => { fetchStore(); setSelectedTask(null); }}
        />
      )}

      {/* Issue Modal */}
      {showIssue && (
        <IssueModal storeId={id} onClose={() => setShowIssue(false)} onCreated={() => { fetchStore(); setShowIssue(false); }} />
      )}

      {/* Edit Store Modal */}
      {showEdit && (
        <EditStoreModal store={store} onClose={() => setShowEdit(false)} onUpdated={() => { fetchStore(); setShowEdit(false); }} />
      )}
    </div>
  );
}

function GanttChart({ phases, targetDate }: { phases: any[]; targetDate?: string }) {
  if (!phases.length) return null;

  const now = new Date();
  const start = new Date(Math.min(...phases.filter(p => p.plannedStart).map((p: any) => new Date(p.plannedStart).getTime())));
  const end = new Date(Math.max(...phases.filter(p => p.plannedEnd).map((p: any) => new Date(p.plannedEnd).getTime())));
  const totalDays = Math.max((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24), 1);

  const COLORS = ["#3b82f6", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#14b8a6", "#6366f1", "#84cc16", "#f97316"];

  const getLeft = (date: string) => ((new Date(date).getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) / totalDays * 100;
  const getWidth = (s: string, e: string) => Math.max(((new Date(e).getTime() - new Date(s).getTime()) / (1000 * 60 * 60 * 24)) / totalDays * 100, 1);

  const todayLeft = ((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) / totalDays * 100;

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: "#f0f4ff", marginBottom: 20 }}>📅 Gantt Chart — Tiến Độ 11 Giai Đoạn</h2>
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: 20, overflowX: "auto" }}>
        {/* Timeline header */}
        <div style={{ display: "flex", marginBottom: 16, paddingLeft: 180 }}>
          {[0, 25, 50, 75, 100].map((pct) => (
            <div key={pct} style={{ position: "absolute", left: `calc(180px + ${pct}% * ((100% - 180px - 40px) / 100))`, fontSize: 10, color: "var(--text-muted)", transform: "translateX(-50%)" }}>
              {new Date(start.getTime() + (totalDays * pct / 100) * 86400000).toLocaleDateString("vi-VN", { month: "short", day: "numeric" })}
            </div>
          ))}
        </div>

        <div style={{ position: "relative", minWidth: 600 }}>
          {/* Today line */}
          {todayLeft >= 0 && todayLeft <= 100 && (
            <div style={{
              position: "absolute", left: `calc(180px + ${todayLeft}% * ((100% - 180px) / 100))`,
              top: 0, bottom: 0, width: 2, background: "#ef4444",
              zIndex: 10, opacity: 0.8,
            }}>
              <div style={{ position: "absolute", top: -16, left: -12, fontSize: 9, color: "#ef4444", whiteSpace: "nowrap", background: "rgba(239,68,68,0.15)", padding: "2px 6px", borderRadius: 4 }}>
                Hôm nay
              </div>
            </div>
          )}

          {phases.map((phase, i) => (
            <div key={phase.id} style={{ display: "flex", alignItems: "center", marginBottom: 10, height: 40 }}>
              <div style={{ width: 180, flexShrink: 0, fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", paddingRight: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {PHASE_ICONS[phase.phaseNumber]} GĐ {phase.phaseNumber}
              </div>
              <div style={{ flex: 1, position: "relative", height: 28 }}>
                {/* Background row */}
                <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.02)", borderRadius: 4 }} />

                {/* Planned bar */}
                {phase.plannedStart && phase.plannedEnd && (
                  <div className="gantt-bar" style={{
                    left: `${getLeft(phase.plannedStart)}%`,
                    width: `${getWidth(phase.plannedStart, phase.plannedEnd)}%`,
                    background: phase.status === "COMPLETED"
                      ? `${COLORS[i % COLORS.length]}cc`
                      : phase.status === "IN_PROGRESS"
                      ? `${COLORS[i % COLORS.length]}99`
                      : `${COLORS[i % COLORS.length]}40`,
                    border: `1px solid ${COLORS[i % COLORS.length]}60`,
                    color: "#fff",
                    fontSize: 10,
                  }}>
                    {phase.name}
                  </div>
                )}
              </div>

              {/* Status */}
              <div style={{ width: 90, paddingLeft: 12, flexShrink: 0 }}>
                <span className={`badge ${STATUS_COLORS[phase.status]}`} style={{ fontSize: 9 }}>
                  {STATUS_LABELS[phase.status]}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
