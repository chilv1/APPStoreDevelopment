"use client";
import { useMemo } from "react";
import type { PlanTask } from "../types";

const NODE_W = 160, NODE_H = 68, GAP_X = 60, GAP_Y = 12;

interface Props {
  tasks: PlanTask[];
  showCritical: boolean;
}

function fmtD(d: Date | null) {
  if (!d) return "—";
  return `${d.getDate()}/${d.getMonth()+1}`;
}

export default function NetworkDiagram({ tasks, showCritical }: Props) {
  const phaseTasks = tasks.filter(t => t.type !== "summary");

  // Topological level assignment
  const levels = useMemo(() => {
    const map = new Map<string, number>();
    function getLevel(t: PlanTask): number {
      if (map.has(t.id)) return map.get(t.id)!;
      if (!t.pred) { map.set(t.id, 0); return 0; }
      const pred = phaseTasks.find(x => x.id === t.pred);
      const l = pred ? getLevel(pred) + 1 : 0;
      map.set(t.id, l);
      return l;
    }
    phaseTasks.forEach(t => getLevel(t));
    return map;
  }, [phaseTasks]);

  // Position nodes in columns
  const positions = useMemo(() => {
    const cols = new Map<number, PlanTask[]>();
    phaseTasks.forEach(t => {
      const l = levels.get(t.id) ?? 0;
      if (!cols.has(l)) cols.set(l, []);
      cols.get(l)!.push(t);
    });
    const pos = new Map<string, { x:number; y:number }>();
    cols.forEach((col, colIdx) => {
      col.forEach((t, rowIdx) => {
        pos.set(t.id, { x: colIdx*(NODE_W+GAP_X)+20, y: rowIdx*(NODE_H+GAP_Y)+20 });
      });
    });
    return pos;
  }, [phaseTasks, levels]);

  const totalW = Math.max(...[...positions.values()].map(p => p.x)) + NODE_W + 40;
  const totalH = Math.max(...[...positions.values()].map(p => p.y)) + NODE_H + 40;

  const STATUS_BORDER: Record<string,string> = {
    COMPLETED:"#238636", IN_PROGRESS:"#1f6feb", BLOCKED:"#b91c1c", NOT_STARTED:"#374151"
  };

  return (
    <div style={{ flex:1, overflow:"auto", background:"#0d1117", position:"relative" }}>
      <div style={{ padding:"8px 16px", background:"#1c2128", borderBottom:"1px solid #30363d", display:"flex", gap:16, fontSize:11, color:"#8b949e", position:"sticky", top:0, zIndex:5, flexShrink:0 }}>
        <span>🔀 Diagrama de Red (PERT)</span>
        <span style={{ marginLeft:"auto", color:"#484f58" }}>Mostrando {phaseTasks.length} tareas · Zoom: scroll del trackpad</span>
      </div>
      <div style={{ position:"relative", width:totalW+40, height:totalH+40, minWidth:"100%" }}>
        {/* Arrow SVG */}
        <svg style={{ position:"absolute", top:0, left:0, width:totalW+40, height:totalH+40, pointerEvents:"none", zIndex:0 }}>
          <defs>
            <marker id="net-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill="#388bfd" />
            </marker>
            <marker id="net-arrow-red" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill="#da3633" />
            </marker>
          </defs>
          {phaseTasks.map(t => {
            if (!t.pred) return null;
            const from = positions.get(t.pred);
            const to   = positions.get(t.id);
            if (!from || !to) return null;
            const isCrit = showCritical && t.critical;
            const x1 = from.x + NODE_W, y1 = from.y + NODE_H/2;
            const x2 = to.x,            y2 = to.y   + NODE_H/2;
            const cx = (x1 + x2) / 2;
            return (
              <path key={t.id}
                d={`M${x1},${y1} C${cx},${y1} ${cx},${y2} ${x2},${y2}`}
                stroke={isCrit ? "#da3633" : "#388bfd"}
                strokeWidth="1.5" fill="none"
                markerEnd={isCrit ? "url(#net-arrow-red)" : "url(#net-arrow)"}
                opacity=".7" />
            );
          })}
        </svg>

        {/* Nodes */}
        {phaseTasks.map(t => {
          const pos = positions.get(t.id);
          if (!pos) return null;
          const isCrit = showCritical && t.critical;
          const border = isCrit ? "#da3633" : STATUS_BORDER[t.status] ?? "#30363d";
          return (
            <div key={t.id} style={{
              position:"absolute", left:pos.x, top:pos.y,
              width:NODE_W, height:NODE_H,
              background:"#161b22", border:`1px solid ${border}`,
              borderRadius:4, padding:"6px 8px",
              boxShadow:"0 2px 8px rgba(0,0,0,.4)", zIndex:1,
            }}>
              <div style={{ fontWeight:700, color:isCrit?"#f85149":"#e6edf3", fontSize:10, marginBottom:3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={t.name}>{t.name}</div>
              <div style={{ display:"flex", justifyContent:"space-between", color:"#8b949e", fontSize:9, marginBottom:2 }}>
                <span>Ini: {fmtD(t.start)}</span><span>Fin: {fmtD(t.fin)}</span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", color:"#8b949e", fontSize:9, marginBottom:3 }}>
                <span>Dur: {t.dur}d</span><span>{t.pct}%</span>
              </div>
              <div style={{ height:4, background:"#21262d", borderRadius:2, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${t.pct}%`, background:t.pct===100?"#238636":isCrit?"#da3633":"#1f6feb" }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
