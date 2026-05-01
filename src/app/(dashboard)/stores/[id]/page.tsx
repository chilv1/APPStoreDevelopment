"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { formatDate, formatCurrency, STATUS_LABELS, STATUS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS, PHASE_ICONS } from "@/lib/utils";
import { useSession } from "next-auth/react";
import TaskModal from "@/components/stores/TaskModal";
import IssueModal from "@/components/stores/IssueModal";
import EditStoreModal from "@/components/stores/EditStoreModal";
import GanttChart from "@/components/stores/GanttChart";

type Tab = "phases" | "gantt" | "issues" | "activity";

export default function StoreDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user as any;
  const [store, setStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("phases");
  const [selectedPhase, setSelectedPhase] = useState<any>(null);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [showIssue, setShowIssue] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [issueFilter, setIssueFilter] = useState("ALL");
  const [resolveTarget, setResolveTarget] = useState<any>(null);
  const [editIssueTarget, setEditIssueTarget] = useState<any>(null);
  const [issueActionLoading, setIssueActionLoading] = useState(false);

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

          {/* Edit + Delete buttons */}
          {["ADMIN", "AREA_MANAGER"].includes(user?.role) && (
            <div style={{ display: "flex", gap: 8 }}>
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
              <button onClick={() => setShowDelete(true)} style={{
                padding: "8px 14px", borderRadius: 10, border: "1px solid rgba(239,68,68,0.3)",
                background: "rgba(239,68,68,0.08)", color: "#fca5a5",
                fontSize: 13, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap",
                transition: "all 0.15s ease",
              }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.16)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(239,68,68,0.5)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.08)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(239,68,68,0.3)"; }}
              >
                🗑️ Xóa
              </button>
            </div>
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

      {activeTab === "gantt" && <GanttChart storeId={id} phases={store.phases || []} targetDate={store.targetOpenDate} onUpdated={fetchStore} currentUserRole={user?.role} />}

      {activeTab === "issues" && (
        <div>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#f0f4ff" }}>Vướng mắc & Rủi ro</h2>
            <button onClick={() => setShowIssue(true)} className="gradient-btn" style={{
              padding: "8px 16px", borderRadius: 8, border: "none",
              color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}>+ Ghi nhận vướng mắc</button>
          </div>

          {/* Stats + filter */}
          {store.issues?.length > 0 && (() => {
            const all = store.issues;
            const counts = { ALL: all.length, OPEN: 0, IN_PROGRESS: 0, RESOLVED: 0, CLOSED: 0 } as any;
            all.forEach((i: any) => { if (counts[i.status] !== undefined) counts[i.status]++; });
            const FILTER_TABS = [
              { key: "ALL",         label: "Tất cả",       color: "#8b9ab5" },
              { key: "OPEN",        label: "Chưa xử lý",   color: "#f59e0b" },
              { key: "IN_PROGRESS", label: "Đang xử lý",   color: "#3b82f6" },
              { key: "RESOLVED",    label: "Đã giải quyết",color: "#10b981" },
              { key: "CLOSED",      label: "Đã đóng",      color: "#6b7280" },
            ];
            return (
              <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                {FILTER_TABS.map(t => counts[t.key] >= 0 && (
                  <button key={t.key} onClick={() => setIssueFilter(t.key)} style={{
                    padding: "5px 12px", borderRadius: 20, border: `1px solid ${issueFilter === t.key ? t.color : "var(--border)"}`,
                    background: issueFilter === t.key ? `${t.color}22` : "transparent",
                    color: issueFilter === t.key ? t.color : "var(--text-secondary)",
                    fontSize: 12, fontWeight: 500, cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 6,
                  }}>
                    {t.label}
                    {counts[t.key] > 0 && <span style={{ background: issueFilter === t.key ? t.color : "rgba(255,255,255,0.1)", color: issueFilter === t.key ? "#fff" : "var(--text-secondary)", borderRadius: 99, padding: "0 6px", fontSize: 10, fontWeight: 700 }}>{counts[t.key]}</span>}
                  </button>
                ))}
              </div>
            );
          })()}

          {/* Issue list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {(store.issues || [])
              .filter((i: any) => issueFilter === "ALL" || i.status === issueFilter)
              .map((issue: any) => {
                const typeIcon = issue.type === "RISK" ? "⚠️" : issue.type === "BLOCKER" ? "🚫" : "🔴";
                const sevColor = { CRITICAL: "#ef4444", HIGH: "#f97316", MEDIUM: "#f59e0b", LOW: "#6b7280" }[issue.severity as string] || "#6b7280";
                const statusStep = { OPEN: 0, IN_PROGRESS: 1, RESOLVED: 2, CLOSED: 3 }[issue.status as string] ?? 0;
                const stepLabels = ["Chưa xử lý", "Đang xử lý", "Đã giải quyết", "Đã đóng"];
                const stepColors = ["#f59e0b", "#3b82f6", "#10b981", "#6b7280"];
                return (
                  <div key={issue.id} style={{
                    background: "var(--bg-card)",
                    border: `1px solid ${issue.status === "OPEN" && (issue.severity === "HIGH" || issue.severity === "CRITICAL") ? "rgba(239,68,68,0.35)" : issue.status === "RESOLVED" || issue.status === "CLOSED" ? "rgba(16,185,129,0.2)" : "var(--border)"}`,
                    borderRadius: 12, padding: 16,
                  }}>
                    {/* Top row */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 15, fontWeight: 600, color: "#f0f4ff", marginBottom: 4 }}>
                          {typeIcon} {issue.title}
                        </div>
                        {issue.description && <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>{issue.description}</p>}
                      </div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                        <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: `${sevColor}22`, color: sevColor, border: `1px solid ${sevColor}44`, fontWeight: 600 }}>
                          {{ CRITICAL: "Khẩn cấp", HIGH: "Cao", MEDIUM: "Trung bình", LOW: "Thấp" }[issue.severity as string] || issue.severity}
                        </span>
                      </div>
                    </div>

                    {/* Progress steps */}
                    <div style={{ display: "flex", alignItems: "center", gap: 0, marginTop: 12, marginBottom: 10 }}>
                      {stepLabels.map((label, idx) => (
                        <div key={idx} style={{ display: "flex", alignItems: "center", flex: idx < 3 ? 1 : "none" }}>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                            <div style={{
                              width: 22, height: 22, borderRadius: "50%", border: `2px solid ${idx <= statusStep ? stepColors[statusStep] : "rgba(255,255,255,0.1)"}`,
                              background: idx === statusStep ? stepColors[statusStep] : idx < statusStep ? `${stepColors[statusStep]}33` : "transparent",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 10, color: idx <= statusStep ? (idx === statusStep ? "#fff" : stepColors[statusStep]) : "var(--text-muted)",
                              fontWeight: 700,
                            }}>
                              {idx < statusStep ? "✓" : idx + 1}
                            </div>
                            <span style={{ fontSize: 9, color: idx === statusStep ? stepColors[statusStep] : "var(--text-muted)", whiteSpace: "nowrap", fontWeight: idx === statusStep ? 600 : 400 }}>
                              {label}
                            </span>
                          </div>
                          {idx < 3 && <div style={{ flex: 1, height: 2, background: idx < statusStep ? `${stepColors[statusStep]}44` : "rgba(255,255,255,0.06)", marginBottom: 14, marginLeft: 2, marginRight: 2 }} />}
                        </div>
                      ))}
                    </div>

                    {/* Resolution */}
                    {issue.resolution && (
                      <div style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#6ee7b7", marginBottom: 10 }}>
                        ✓ <strong>Giải pháp:</strong> {issue.resolution}
                      </div>
                    )}

                    {/* Footer */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        Báo cáo bởi: {issue.reporter?.name || "N/A"} · {new Date(issue.createdAt).toLocaleDateString("vi-VN")}
                      </div>
                      {issue.status !== "CLOSED" && (
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => setEditIssueTarget(issue)} style={{
                            padding: "4px 10px", borderRadius: 6, border: "1px solid var(--border)",
                            background: "rgba(255,255,255,0.04)", color: "var(--text-secondary)",
                            fontSize: 11, cursor: "pointer",
                          }}>Chỉnh sửa</button>
                          <button onClick={() => setResolveTarget(issue)} style={{
                            padding: "4px 12px", borderRadius: 6, border: `1px solid ${issue.status === "OPEN" ? "rgba(59,130,246,0.4)" : "rgba(16,185,129,0.4)"}`,
                            background: issue.status === "OPEN" ? "rgba(59,130,246,0.1)" : "rgba(16,185,129,0.1)",
                            color: issue.status === "OPEN" ? "#93c5fd" : "#6ee7b7",
                            fontSize: 11, fontWeight: 600, cursor: "pointer",
                          }}>
                            {issue.status === "OPEN" ? "Xử lý →" : issue.status === "IN_PROGRESS" ? "Cập nhật →" : "Đóng →"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            {(!store.issues || store.issues.filter((i: any) => issueFilter === "ALL" || i.status === issueFilter).length === 0) && (
              <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)", fontSize: 14 }}>
                {issueFilter === "ALL" ? "✅ Không có vướng mắc nào. Tiến độ suôn sẻ!" : `Không có vướng mắc nào ở trạng thái này.`}
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

      {/* Delete Store Modal */}
      {showDelete && (
        <DeleteStoreModal
          store={store}
          onClose={() => setShowDelete(false)}
          onDeleted={() => { router.push("/stores"); }}
        />
      )}

      {/* Resolve Issue Modal */}
      {resolveTarget && (
        <ResolveIssueModal
          issue={resolveTarget}
          onClose={() => setResolveTarget(null)}
          loading={issueActionLoading}
          onSave={async (data: any) => {
            setIssueActionLoading(true);
            await fetch(`/api/issues/${resolveTarget.id}`, {
              method: "PATCH", headers: { "Content-Type": "application/json" },
              body: JSON.stringify(data),
            });
            setIssueActionLoading(false);
            setResolveTarget(null);
            fetchStore();
          }}
        />
      )}

      {/* Edit Issue Modal */}
      {editIssueTarget && (
        <EditIssueModal
          issue={editIssueTarget}
          onClose={() => setEditIssueTarget(null)}
          loading={issueActionLoading}
          onSave={async (data: any) => {
            setIssueActionLoading(true);
            await fetch(`/api/issues/${editIssueTarget.id}`, {
              method: "PATCH", headers: { "Content-Type": "application/json" },
              body: JSON.stringify(data),
            });
            setIssueActionLoading(false);
            setEditIssueTarget(null);
            fetchStore();
          }}
          onDelete={async () => {
            setIssueActionLoading(true);
            await fetch(`/api/issues/${editIssueTarget.id}`, { method: "DELETE" });
            setIssueActionLoading(false);
            setEditIssueTarget(null);
            fetchStore();
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// Delete Store Modal — type-to-confirm to prevent accidents
// ============================================================================
function DeleteStoreModal({ store, onClose, onDeleted }: { store: any; onClose: () => void; onDeleted: () => void }) {
  const [typed, setTyped] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const phaseCount   = store.phases?.length ?? 0;
  const taskCount    = (store.phases || []).reduce((sum: number, p: any) => sum + (p.tasks?.length ?? 0), 0);
  const issueCount   = store.issues?.length ?? 0;
  const noteCount    = (store.phases || []).reduce((sum: number, p: any) => sum + (p.notes?.length ?? 0), 0);
  const activityCount = store.activities?.length ?? 0;

  const confirmText = store.code;
  const isMatch = typed.trim() === confirmText;

  const handleDelete = async () => {
    if (!isMatch) return;
    setLoading(true);
    setError("");
    const res = await fetch(`/api/stores/${store.id}`, { method: "DELETE" });
    if (res.ok) {
      onDeleted();
    } else {
      const err = await res.json().catch(() => ({}));
      setError(err.error || "Lỗi xóa cửa hàng");
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && !loading && onClose()}>
      <div className="modal-content" onMouseDown={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: "#fca5a5", margin: 0 }}>
            🗑️ Xóa cửa hàng
          </h2>
          <button onClick={onClose} disabled={loading} style={{ background: "none", border: "none", color: "var(--text-secondary)", fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>

        {/* Warning box */}
        <div style={{
          background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)",
          borderRadius: 8, padding: "12px 14px", marginBottom: 16,
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#fca5a5", marginBottom: 8 }}>
            ⚠️ Hành động này KHÔNG THỂ HOÀN TÁC
          </div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>
            Bạn sắp xóa cửa hàng <strong style={{ color: "#f0f4ff" }}>{store.name}</strong> ({store.code}).
            Cùng với cửa hàng, các dữ liệu sau sẽ bị xóa vĩnh viễn:
          </div>
          <ul style={{ margin: "8px 0 0 16px", padding: 0, fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.8 }}>
            <li><strong style={{ color: "#fca5a5" }}>{phaseCount}</strong> giai đoạn + <strong style={{ color: "#fca5a5" }}>{taskCount}</strong> task</li>
            <li><strong style={{ color: "#fca5a5" }}>{issueCount}</strong> vướng mắc / rủi ro</li>
            <li><strong style={{ color: "#fca5a5" }}>{noteCount}</strong> ghi chú giai đoạn</li>
            <li><strong style={{ color: "#fca5a5" }}>{activityCount}</strong> bản ghi lịch sử hoạt động</li>
            <li>Tất cả mốc kế hoạch (baselines) đã lưu</li>
          </ul>
        </div>

        {/* Type-to-confirm */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>
            Để xác nhận, gõ <strong style={{ color: "#f0f4ff", fontFamily: "monospace", background: "rgba(255,255,255,0.06)", padding: "1px 6px", borderRadius: 4 }}>{confirmText}</strong> vào ô dưới:
          </label>
          <input
            className="input"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={confirmText}
            disabled={loading}
            autoFocus
            style={{
              fontFamily: "monospace",
              borderColor: typed && !isMatch ? "rgba(239,68,68,0.5)"
                : isMatch ? "rgba(16,185,129,0.5)" : undefined,
            }}
          />
        </div>

        {error && (
          <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 6, padding: "8px 12px", color: "#fca5a5", fontSize: 12, marginBottom: 12 }}>
            ⚠️ {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} disabled={loading} style={{
            flex: 1, padding: "10px", borderRadius: 8,
            background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)",
            color: "var(--text-secondary)", fontSize: 13, cursor: loading ? "not-allowed" : "pointer",
          }}>Hủy</button>
          <button
            disabled={!isMatch || loading}
            onClick={handleDelete}
            style={{
              flex: 2, padding: "10px", borderRadius: 8, border: "none",
              background: isMatch ? "linear-gradient(135deg, #ef4444, #dc2626)" : "rgba(239,68,68,0.2)",
              color: isMatch ? "#fff" : "rgba(252,165,165,0.5)",
              fontSize: 13, fontWeight: 600,
              cursor: !isMatch || loading ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
            {loading ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Đang xóa...</> : "🗑️ Xóa vĩnh viễn"}
          </button>
        </div>
      </div>
    </div>
  );
}

const STATUS_FLOW = [
  { value: "OPEN",        label: "Chưa xử lý",    color: "#f59e0b" },
  { value: "IN_PROGRESS", label: "Đang xử lý",    color: "#3b82f6" },
  { value: "RESOLVED",    label: "Đã giải quyết", color: "#10b981" },
  { value: "CLOSED",      label: "Đã đóng",       color: "#6b7280" },
];

function ResolveIssueModal({ issue, onClose, onSave, loading }: any) {
  const [status, setStatus] = useState(issue.status);
  const [resolution, setResolution] = useState(issue.resolution || "");

  const needsResolution = status === "RESOLVED" || status === "CLOSED";

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" onMouseDown={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: "#f0f4ff", margin: 0 }}>🔧 Xử lý vướng mắc</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-secondary)", fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>

        {/* Issue summary */}
        <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "10px 14px", marginBottom: 20, fontSize: 13 }}>
          <div style={{ fontWeight: 600, color: "#f0f4ff", marginBottom: 2 }}>{issue.title}</div>
          {issue.description && <div style={{ color: "var(--text-secondary)" }}>{issue.description}</div>}
        </div>

        {/* Status selector */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 8 }}>Chuyển trạng thái</label>
          <div style={{ display: "flex", gap: 8 }}>
            {STATUS_FLOW.map(s => (
              <button key={s.value} onClick={() => setStatus(s.value)} style={{
                flex: 1, padding: "8px 4px", borderRadius: 8, fontSize: 11, fontWeight: 600,
                border: `1.5px solid ${status === s.value ? s.color : "var(--border)"}`,
                background: status === s.value ? `${s.color}22` : "transparent",
                color: status === s.value ? s.color : "var(--text-secondary)",
                cursor: "pointer", textAlign: "center",
              }}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Resolution notes */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>
            Ghi chú giải pháp {needsResolution && <span style={{ color: "#ef4444" }}>*</span>}
          </label>
          <textarea className="input" rows={4} style={{ resize: "vertical" }}
            placeholder={needsResolution ? "Mô tả cách đã giải quyết, kết quả đạt được..." : "Ghi chú thêm về tình trạng xử lý..."}
            value={resolution} onChange={(e) => setResolution(e.target.value)}
          />
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: "10px", borderRadius: 8,
            background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)",
            color: "var(--text-secondary)", fontSize: 13, cursor: "pointer",
          }}>Hủy</button>
          <button
            disabled={loading || (needsResolution && !resolution.trim())}
            onClick={() => onSave({ status, resolution: resolution.trim() || null })}
            className="gradient-btn" style={{
              flex: 2, padding: "10px", borderRadius: 8, border: "none",
              color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              opacity: needsResolution && !resolution.trim() ? 0.5 : 1,
            }}>
            {loading ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />Đang lưu...</> : "✓ Lưu cập nhật"}
          </button>
        </div>
      </div>
    </div>
  );
}

const ISSUE_TYPES = [
  { value: "ISSUE",   label: "🔴 Vấn đề phát sinh" },
  { value: "RISK",    label: "⚠️ Rủi ro tiềm ẩn" },
  { value: "BLOCKER", label: "🚫 Vướng mắc blocker" },
];
const SEVERITIES = [
  { value: "LOW",      label: "Thấp" },
  { value: "MEDIUM",   label: "Trung bình" },
  { value: "HIGH",     label: "Cao" },
  { value: "CRITICAL", label: "Khẩn cấp" },
];

function EditIssueModal({ issue, onClose, onSave, onDelete, loading }: any) {
  const [form, setForm] = useState({
    title: issue.title, description: issue.description || "",
    type: issue.type, severity: issue.severity,
  });
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" onMouseDown={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: "#f0f4ff", margin: 0 }}>✏️ Chỉnh sửa vướng mắc</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-secondary)", fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Tiêu đề *</label>
          <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Loại</label>
            <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {ISSUE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Mức độ</label>
            <select className="input" value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
              {SEVERITIES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Mô tả</label>
          <textarea className="input" rows={3} style={{ resize: "vertical" }}
            value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)} style={{
              padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.3)",
              background: "rgba(239,68,68,0.08)", color: "#fca5a5", fontSize: 13, cursor: "pointer",
            }}>Xóa</button>
          ) : (
            <button onClick={onDelete} disabled={loading} style={{
              padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.5)",
              background: "rgba(239,68,68,0.15)", color: "#fca5a5", fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}>Xác nhận xóa?</button>
          )}
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={{
            padding: "10px 16px", borderRadius: 8,
            background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)",
            color: "var(--text-secondary)", fontSize: 13, cursor: "pointer",
          }}>Hủy</button>
          <button disabled={loading || !form.title.trim()} onClick={() => onSave(form)} className="gradient-btn" style={{
            padding: "10px 20px", borderRadius: 8, border: "none",
            color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            {loading ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />Lưu...</> : "✓ Lưu"}
          </button>
        </div>
      </div>
    </div>
  );
}

