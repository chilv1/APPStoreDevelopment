"use client";
import type { PlanTask } from "../types";

interface Props {
  tasks: PlanTask[];
  calOffset: number;
  showCritical: boolean;
  onPrev: () => void;
  onNext: () => void;
}

const DAYS = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];

export default function CalendarView({ tasks, calOffset, showCritical, onPrev, onNext }: Props) {
  const now   = new Date();
  const refDate = new Date(now.getFullYear(), now.getMonth() + calOffset, 1);
  const year  = refDate.getFullYear();
  const month = refDate.getMonth();
  const title = refDate.toLocaleString("es", { month:"long", year:"numeric" });

  const today = new Date(); today.setHours(0,0,0,0);

  // Calendar days
  const firstDay = new Date(year, month, 1);
  const startDow = (firstDay.getDay() + 6) % 7; // Mon=0
  const daysInMonth = new Date(year, month+1, 0).getDate();

  const cells: { date: Date | null; otherMonth: boolean }[] = [];
  for (let i = 0; i < startDow; i++) {
    cells.push({ date: new Date(year, month, -startDow+i+1), otherMonth:true });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), otherMonth:false });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ date: new Date(year, month+1, cells.length - daysInMonth - startDow + 1), otherMonth:true });
  }

  const phaseTasks = tasks.filter(t => t.type !== "summary");

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", background:"#0d1117" }}>
      {/* Header */}
      <div style={{ padding:"8px 16px", background:"#1c2128", borderBottom:"1px solid #30363d", display:"flex", alignItems:"center", gap:12, flexShrink:0 }}>
        <button onClick={onPrev} style={{ background:"#21262d", border:"1px solid #30363d", color:"#e6edf3", padding:"3px 10px", borderRadius:4, cursor:"pointer", fontSize:13 }}>◀</button>
        <span style={{ fontSize:14, fontWeight:700, minWidth:180, textAlign:"center" }}>{title}</span>
        <button onClick={onNext} style={{ background:"#21262d", border:"1px solid #30363d", color:"#e6edf3", padding:"3px 10px", borderRadius:4, cursor:"pointer", fontSize:13 }}>▶</button>
        <div style={{ marginLeft:"auto", display:"flex", gap:12, fontSize:11, color:"#8b949e" }}>
          <span style={{ display:"flex", alignItems:"center", gap:4 }}><span style={{ width:10, height:10, background:"rgba(35,134,54,.5)", borderRadius:2, display:"inline-block" }}></span> Normal</span>
          <span style={{ display:"flex", alignItems:"center", gap:4 }}><span style={{ width:10, height:10, background:"rgba(218,54,51,.5)", borderRadius:2, display:"inline-block" }}></span> Crítica</span>
        </div>
      </div>

      {/* Grid */}
      <div style={{ flex:1, display:"grid", gridTemplateColumns:"repeat(7,1fr)", gridAutoRows:"1fr", overflow:"auto" }}>
        {/* Day headers */}
        {DAYS.map((d,i) => (
          <div key={d} style={{ background:"#1c2128", borderRight:"1px solid #21262d", borderBottom:"1px solid #30363d", padding:"4px", fontSize:10, fontWeight:700, color:i>=5?"rgba(248,81,73,.6)":"#484f58", textAlign:"center" }}>{d}</div>
        ))}

        {/* Day cells */}
        {cells.map((cell, i) => {
          if (!cell.date) return <div key={i} />;
          const d = cell.date;
          const isToday = !cell.otherMonth && d.getTime() === today.getTime();
          const isWknd  = d.getDay() === 0 || d.getDay() === 6;

          // Find tasks active on this day
          const dayTasks = phaseTasks.filter(t => t.start && t.fin && d >= t.start && d < t.fin);

          return (
            <div key={i} style={{
              background: isToday ? "rgba(248,81,73,.05)" : isWknd ? "rgba(248,81,73,.02)" : "#0d1117",
              border: isToday ? "1px solid rgba(248,81,73,.3)" : "1px solid #21262d",
              padding:4, minHeight:80, opacity:cell.otherMonth?.4:1,
            }}>
              <div style={{ fontSize:11, color:isToday?"#f85149":isWknd?"rgba(248,81,73,.5)":"#484f58", fontWeight:isToday?700:400, marginBottom:3 }}>
                {d.getDate()}
              </div>
              {dayTasks.slice(0, 3).map(t => (
                <div key={t.id} style={{
                  fontSize:9, padding:"1px 3px", borderRadius:2, marginBottom:1,
                  overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis",
                  background: showCritical&&t.critical ? "rgba(218,54,51,.35)" : "rgba(35,134,54,.35)",
                  color: showCritical&&t.critical ? "#f85149" : "#3fb950",
                }} title={t.name}>{t.name}</div>
              ))}
              {dayTasks.length > 3 && <div style={{ fontSize:8, color:"#484f58" }}>+{dayTasks.length-3} más</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
