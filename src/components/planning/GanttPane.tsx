"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PlanTask, ZoomMode } from "./types";

const DAY = 86_400_000;
const ROW_H = 24;
const BAR_H = 14;
const BAR_TOP = (ROW_H - BAR_H) / 2;
const PX_PER_DAY: Record<ZoomMode, number> = { day:36, week:18, month:8, quarter:4 };

const STATUS_COLOR: Record<string, string> = {
  COMPLETED:"#238636", IN_PROGRESS:"#1f6feb",
  BLOCKED:"#b91c1c", NOT_STARTED:"#374151",
};
const CRIT_COLOR = "#da3633";

function fmtMonth(d: Date) { return d.toLocaleString("es", { month:"short", year:"2-digit" }); }
function fmtDay(d: Date) { return String(d.getDate()); }

interface DragState {
  taskId: string; type: "move"|"start"|"end";
  startX: number; origStartMs: number; origEndMs: number;
}

interface Props {
  tasks: PlanTask[];
  allTasks: PlanTask[];
  selectedId: string | null;
  zoomMode: ZoomMode;
  showCritical: boolean;
  showBaseline: boolean;
  showArrows: boolean;
  onSelect: (id: string) => void;
  onUpdateTask: (id: string, patch: Partial<PlanTask>) => void;
}

export default function GanttPane({ tasks, allTasks, selectedId, zoomMode, showCritical, showBaseline, showArrows, onSelect, onUpdateTask }: Props) {
  const bodyRef   = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const px = PX_PER_DAY[zoomMode];
  const [drag, setDrag] = useState<DragState | null>(null);
  const [tooltip, setTooltip] = useState<{ task: PlanTask; x:number; y:number } | null>(null);
  const [localTasks, setLocalTasks] = useState<PlanTask[]>(tasks);

  // Sync local on prop change (when drag ends)
  useEffect(() => { if (!drag) setLocalTasks(tasks); }, [tasks, drag]);

  // View window
  const vw = useMemo(() => {
    const dated = localTasks.filter(t => t.start && t.fin);
    if (!dated.length) return { startMs: Date.now(), days: 90 };
    const min = Math.min(...dated.map(t => t.start!.getTime()));
    const max = Math.max(...dated.map(t => t.fin!.getTime()));
    const extra = zoomMode === "day" ? 7 : zoomMode === "week" ? 14 : 30;
    return { startMs: min - extra * DAY, days: Math.ceil((max - min) / DAY) + extra * 2 };
  }, [localTasks, zoomMode]);

  const msToX = (ms: number) => Math.round((ms - vw.startMs) / DAY * px);
  const durW   = (dur: number) => Math.max(dur * px, 4);
  const totalW = vw.days * px;

  // Header
  const { upper, lower } = useMemo(() => {
    const upper: { label:string; w:number }[] = [];
    const lower: { label:string; w:number; isToday:boolean; isWeekend:boolean }[] = [];
    const today = new Date(); today.setHours(0,0,0,0);

    // Months
    let cur = new Date(vw.startMs); cur.setDate(1);
    while (cur.getTime() < vw.startMs + vw.days * DAY) {
      const next = new Date(cur); next.setMonth(next.getMonth() + 1);
      const x1 = Math.max(msToX(cur.getTime()), 0);
      const x2 = Math.min(msToX(next.getTime()), totalW);
      if (x2 > x1) upper.push({ label: fmtMonth(cur), w: x2 - x1 });
      cur = next;
    }

    // Days / weeks
    cur = new Date(vw.startMs);
    for (let i = 0; i < vw.days; i++) {
      const isWknd = cur.getDay() === 0 || cur.getDay() === 6;
      const isToday = cur.getTime() === today.getTime();
      if (zoomMode === "day") {
        lower.push({ label: fmtDay(cur), w: px, isToday, isWeekend: isWknd });
        cur.setDate(cur.getDate() + 1);
      } else if (zoomMode === "week") {
        if (cur.getDay() === 1 || i === 0) {
          lower.push({ label: cur.getDate() + "/" + (cur.getMonth()+1), w: px * 7, isToday:false, isWeekend:false });
          cur.setDate(cur.getDate() + 7);
          i += 6;
        } else { cur.setDate(cur.getDate() + 1); }
      } else if (zoomMode === "month") {
        if (cur.getDate() === 1 || i === 0) {
          const daysInMonth = new Date(cur.getFullYear(), cur.getMonth()+1, 0).getDate();
          lower.push({ label:"S"+Math.ceil(cur.getDate()/7), w:px*7, isToday:false, isWeekend:false });
          cur.setDate(cur.getDate() + 7);
          i += 6;
        } else { cur.setDate(cur.getDate()+1); }
      } else {
        // quarter: months
        if (cur.getDate()===1 || i===0) {
          const next2 = new Date(cur); next2.setMonth(next2.getMonth()+1);
          const days = Math.round((next2.getTime()-cur.getTime())/DAY);
          lower.push({ label:cur.toLocaleString("es",{month:"short"}), w:px*days, isToday:false, isWeekend:false });
          cur=next2; i+=days-1;
        } else { cur.setDate(cur.getDate()+1); }
      }
    }
    return { upper, lower };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vw, px, zoomMode]);

  // Today
  const today = new Date(); today.setHours(0,0,0,0);
  const todayX = msToX(today.getTime());

  // Keep a ref of localTasks to avoid stale closures in drag onUp
  const localTasksRef = useRef<PlanTask[]>(localTasks);
  localTasksRef.current = localTasks;

  // Drag handlers
  const startDrag = useCallback((e: React.MouseEvent, taskId: string, type: DragState["type"]) => {
    e.preventDefault(); e.stopPropagation();
    const t = localTasks.find(x => x.id === taskId);
    if (!t?.start || !t.fin || t.type === "summary") return; // guard: no drag on summary rows
    setDrag({ taskId, type, startX:e.clientX, origStartMs:t.start.getTime(), origEndMs:t.fin.getTime() });
    document.body.style.cursor = type==="move" ? "grabbing" : "ew-resize";
    document.body.style.userSelect = "none";
  }, [localTasks]);

  useEffect(() => {
    if (!drag) return;
    const onMove = (e: MouseEvent) => {
      const delta = Math.round((e.clientX - drag.startX) / px);
      const deltaMs = delta * DAY;
      setLocalTasks(prev => prev.map(t => {
        if (t.id !== drag.taskId) return t;
        if (drag.type === "move") {
          return { ...t, start:new Date(drag.origStartMs+deltaMs), fin:new Date(drag.origEndMs+deltaMs) };
        } else if (drag.type === "end") {
          const newEnd = Math.max(drag.origStartMs + DAY, drag.origEndMs + deltaMs);
          return { ...t, fin:new Date(newEnd), dur:Math.round((newEnd-t.start!.getTime())/DAY) };
        } else {
          const newStart = Math.min(drag.origEndMs - DAY, drag.origStartMs + deltaMs);
          return { ...t, start:new Date(newStart), dur:Math.round((t.fin!.getTime()-newStart)/DAY) };
        }
      }));
    };
    const onUp = () => {
      // Use ref to avoid stale closure on rapidly-changing localTasks
      const t = localTasksRef.current.find(x => x.id === drag.taskId);
      if (t?.start && t.fin) onUpdateTask(drag.taskId, { start:t.start, fin:t.fin, dur:t.dur });
      setDrag(null);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
  }, [drag, px, onUpdateTask]);

  // Sync grid ↔ gantt scroll
  const onBodyScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const grid = document.querySelector<HTMLDivElement>(".planning-grid-wrap");
    if (grid) grid.scrollTop = e.currentTarget.scrollTop;
  };

  // Listen for "scrollToToday" custom event dispatched by PlanningClient
  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    const handler = () => {
      const todayMs = new Date().setHours(0,0,0,0);
      const x = Math.round((todayMs - vw.startMs) / DAY * px);
      body.scrollLeft = Math.max(0, x - 200);
    };
    body.addEventListener("scrollToToday", handler);
    return () => body.removeEventListener("scrollToToday", handler);
  }, [vw.startMs, px]);

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minWidth:200 }}>
      {/* Timeline header */}
      <div ref={headerRef} style={{ background:"#1c2128", borderBottom:"1px solid #30363d", flexShrink:0, overflowX:"hidden" }}>
        {/* Upper row — months */}
        <div style={{ display:"flex", height:14, width:totalW }}>
          {upper.map((m,i) => (
            <div key={i} style={{ width:m.w, flexShrink:0, borderRight:"1px solid #21262d", fontSize:9, color:"#8b949e", display:"flex", alignItems:"center", paddingLeft:4, overflow:"hidden" }}>{m.label}</div>
          ))}
        </div>
        {/* Lower row — days/weeks */}
        <div style={{ display:"flex", height:14, width:totalW }}>
          {lower.map((d,i) => (
            <div key={i} style={{ width:d.w, flexShrink:0, borderRight:"1px solid #21262d", fontSize:8, color:d.isToday?"#f85149":d.isWeekend?"#484f58":"#484f58", background:d.isToday?"rgba(248,81,73,.12)":d.isWeekend?"rgba(248,81,73,.02)":"transparent", display:"flex", alignItems:"center", justifyContent:"center" }}>{d.label}</div>
          ))}
        </div>
      </div>

      {/* Gantt body */}
      <div ref={bodyRef} id="gantt-body-scroll" style={{ flex:1, overflowY:"auto", overflowX:"auto" }} onScroll={onBodyScroll}>
        <div style={{ width:totalW, position:"relative" }}>
          {/* Today line */}
          {todayX >= 0 && todayX <= totalW && (
            <>
              <div style={{ position:"absolute", left:todayX, top:0, bottom:0, width:1, background:"#f85149", opacity:.7, pointerEvents:"none", zIndex:8 }} />
              <div style={{ position:"absolute", left:todayX, top:0, transform:"translateX(-50%)", background:"#f85149", color:"#fff", fontSize:8, fontWeight:700, padding:"1px 4px", borderRadius:"0 0 3px 3px", pointerEvents:"none", zIndex:9, whiteSpace:"nowrap" }}>
                HOY {today.getDate()}/{today.getMonth()+1}
              </div>
            </>
          )}

          {/* Grid lines */}
          {lower.map((_, i) => {
            const x = lower.slice(0,i).reduce((s,d) => s+d.w, 0);
            return <div key={i} style={{ position:"absolute", left:x, top:0, bottom:0, width:1, background:"rgba(255,255,255,.04)", pointerEvents:"none" }} />;
          })}

          {/* Arrows SVG */}
          {showArrows && (
            <svg style={{ position:"absolute", top:0, left:0, width:totalW, height:localTasks.length*ROW_H+20, pointerEvents:"none", zIndex:10, overflow:"visible" }}>
              <defs>
                {[["FS","#388bfd"],["SS","#3fb950"],["FF","#d29922"],["VIO","#f85149"]].map(([k,c]) => (
                  <marker key={k} id={`pm-${k}`} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto">
                    <path d="M0,0 L8,4 L0,8 Z" fill={c} />
                  </marker>
                ))}
              </defs>
              {localTasks.map((t, si) => {
                if (!t.pred || !t.start || !t.fin) return null;
                const pi = localTasks.findIndex(x => x.id === t.pred);
                if (pi < 0) return null;
                const pred = localTasks[pi];
                if (!pred.start || !pred.fin) return null;
                const violated = (t.depType==="FS" && t.start < pred.fin)
                  || (t.depType==="SS" && t.start < pred.start)
                  || (t.depType==="FF" && t.fin < pred.fin);
                const color = violated?"#f85149":t.depType==="SS"?"#3fb950":t.depType==="FF"?"#d29922":"#388bfd";
                const mk = violated?"VIO":t.depType==="SS"?"SS":t.depType==="FF"?"FF":"FS";
                const predY = pi*ROW_H + ROW_H/2;
                const succY = si*ROW_H + ROW_H/2;
                const x1 = t.depType==="SS"||t.depType==="SF" ? msToX(pred.start.getTime()) : msToX(pred.fin.getTime());
                const x2 = t.depType==="FF"||t.depType==="SF" ? msToX(t.fin.getTime()) : msToX(t.start.getTime());
                const G = 8;
                let d;
                if (x2 > x1 + G*2) {
                  const mx = x1 + (x2-x1)/3;
                  d = `M${x1},${predY} H${mx} V${succY} H${x2-5}`;
                } else {
                  const ox = Math.min(x1,x2) - G;
                  d = `M${x1},${predY} H${Math.max(ox,2)} V${succY} H${x2-5}`;
                }
                return <path key={t.id} d={d} stroke={color} strokeWidth={violated?"1.8":"1.3"} fill="none" markerEnd={`url(#pm-${mk})`} strokeDasharray={violated?"4,3":"none"} opacity=".75" />;
              })}
            </svg>
          )}

          {/* Rows */}
          {localTasks.map((t, i) => {
            const isSel = t.id === selectedId;
            const barColor = t.type==="summary" ? "#1f6feb" : showCritical&&t.critical ? CRIT_COLOR : t.pct===100?"#1a7f37":STATUS_COLOR[t.status]??"#374151";

            return (
              <div key={t.id} style={{ height:ROW_H, position:"relative", borderBottom:"1px solid #21262d", background:isSel?"rgba(56,139,253,.08)":t.type==="summary"?"rgba(121,192,255,.02)":"transparent" }}
                onClick={() => onSelect(t.id)}
                onMouseEnter={e => t.start && t.fin && setTooltip({ task:t, x:e.clientX, y:e.clientY })}
                onMouseLeave={() => setTooltip(null)}>

                {t.start && t.fin && (() => {
                  const x  = msToX(t.start.getTime());
                  const w  = durW(t.dur);
                  if (t.milestone) return (
                    <div style={{ position:"absolute", left:x-6, top:ROW_H/2-6, width:12, height:12, background:"#6e40c9", border:"1px solid #fff", transform:"rotate(45deg)", cursor:"pointer", zIndex:5 }} onClick={() => onSelect(t.id)} />
                  );

                  return (
                    <>
                      {/* Baseline ghost */}
                      {showBaseline && t.baseline && (() => {
                        const bx = msToX(t.baseline.start.getTime());
                        const bw = durW(Math.round((t.baseline.fin.getTime()-t.baseline.start.getTime())/DAY));
                        return <div style={{ position:"absolute", left:bx, top:ROW_H-5, width:bw, height:4, border:"1px solid rgba(200,200,200,.4)", borderRadius:2, background:"rgba(200,200,200,.08)", pointerEvents:"none" }} />;
                      })()}

                      {/* Bar */}
                      <div
                        style={{ position:"absolute", left:x, top:BAR_TOP, width:w, height:BAR_H, background:barColor, border:`1px solid ${barColor}cc`, borderRadius:t.type==="summary"?1:3, cursor:"grab", overflow:"hidden", boxShadow:"0 1px 3px rgba(0,0,0,.4)", zIndex:5 }}
                        onMouseDown={e => { if (!(e.target as HTMLElement).dataset.side) startDrag(e, t.id, "move"); }}
                      >
                        {/* Progress fill */}
                        <div style={{ position:"absolute", left:0, top:0, bottom:0, width:`${t.pct}%`, background:"rgba(0,0,0,.2)", pointerEvents:"none" }} />
                        {/* Label */}
                        <div style={{ position:"relative", fontSize:9, color:"rgba(255,255,255,.9)", padding:"0 4px", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", fontWeight:600, lineHeight:`${BAR_H}px`, textShadow:"0 1px 2px rgba(0,0,0,.5)" }}>
                          {t.name}
                        </div>
                        {/* Resize handles */}
                        <div data-side="start" style={{ position:"absolute", left:0, top:0, bottom:0, width:5, cursor:"ew-resize", background:"rgba(255,255,255,.15)" }} onMouseDown={e=>{e.stopPropagation();startDrag(e,t.id,"start");}} />
                        <div data-side="end"   style={{ position:"absolute", right:0, top:0, bottom:0, width:5, cursor:"ew-resize", background:"rgba(255,255,255,.15)" }} onMouseDown={e=>{e.stopPropagation();startDrag(e,t.id,"end");}} />
                      </div>
                    </>
                  );
                })()}
              </div>
            );
          })}
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div style={{ position:"fixed", left:tooltip.x+12, top:tooltip.y-20, background:"rgba(22,27,34,.98)", border:"1px solid #30363d", borderRadius:6, padding:"8px 12px", fontSize:11, color:"#e6edf3", zIndex:200, maxWidth:240, boxShadow:"0 8px 24px rgba(0,0,0,.5)", pointerEvents:"none" }}>
          <div style={{ fontWeight:700, marginBottom:4 }}>{tooltip.task.name}</div>
          <div style={{ color:"#8b949e" }}>Inicio: <span style={{ color:"#e6edf3" }}>{tooltip.task.start?.toLocaleDateString("es") ?? "—"}</span></div>
          <div style={{ color:"#8b949e" }}>Fin: <span style={{ color:"#e6edf3" }}>{tooltip.task.fin?.toLocaleDateString("es") ?? "—"}</span></div>
          <div style={{ color:"#8b949e" }}>Duración: <span style={{ color:"#e6edf3" }}>{tooltip.task.dur}d</span></div>
          <div style={{ color:"#8b949e" }}>Avance: <span style={{ color:tooltip.task.pct===100?"#3fb950":"#388bfd" }}>{tooltip.task.pct}%</span></div>
          {tooltip.task.pred && <div style={{ fontSize:10, color:"#484f58", marginTop:4 }}>Dep: {tooltip.task.depType}{tooltip.task.lag>0?`+${tooltip.task.lag}d`:""}</div>}
          <div style={{ fontSize:10, color:"#484f58", marginTop:4 }}>💡 Kéo để mover · Kéo cạnh để resize</div>
        </div>
      )}
    </div>
  );
}
