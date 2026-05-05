"use client";
import type { PlanningState, ViewMode, ZoomMode, DepType, RibbonTab } from "./types";

interface Props {
  state: PlanningState;
  onView: (v: ViewMode) => void;
  onZoom: (z: ZoomMode) => void;
  onRibbon: (t: RibbonTab) => void;
  onToggleCritical: () => void;
  onToggleBaseline: () => void;
  onToggleArrows: () => void;
  onToggleDetail: () => void;
  onSaveBaseline: () => void;
  onAddTask: () => void;
  onDelete: () => void;
  onLink: (dep: DepType) => void;
  onFilter: (s: string) => void;
  onSearch: (q: string) => void;
  onCollapseAll: () => void;
  onExpandAll: () => void;
  onAutoSchedule: () => void;
  onNotify: (msg: string) => void;
  onUnlink?: () => void;
  onExport?: () => void;
  onScrollToday?: () => void;
  onLevelResources?: () => void;
  onStats?: () => void;
}

const VIEWS: { id: ViewMode; icon: string; label: string }[] = [
  { id:"gantt",    icon:"📊", label:"Gantt" },
  { id:"resource", icon:"👥", label:"Recursos" },
  { id:"calendar", icon:"📅", label:"Calendario" },
  { id:"network",  icon:"🔀", label:"Red" },
  { id:"usage",    icon:"📈", label:"Uso" },
];
const TABS: { id: RibbonTab; label: string }[] = [
  { id:"task",    label:"Tarea" },
  { id:"resource",label:"Recurso" },
  { id:"project", label:"Proyecto" },
  { id:"view",    label:"Vista" },
  { id:"format",  label:"Formato" },
];

function RBtn({ icon, label, active, danger, onClick }: { icon:string; label:string; active?:boolean; danger?:boolean; onClick:()=>void }) {
  return (
    <button onClick={onClick} title={label} style={{
      background: active ? "rgba(56,139,253,.2)" : "rgba(33,38,45,1)",
      border: `1px solid ${active ? "#388bfd" : "#30363d"}`,
      borderRadius:4, color: danger?"#f85149":active?"#388bfd":"#8b949e",
      padding:"3px 7px", fontSize:11, cursor:"pointer", display:"flex",
      flexDirection:"column", alignItems:"center", gap:1, minWidth:36, height:44,
      justifyContent:"center", userSelect:"none",
      transition:"all .1s",
    }}>
      <span style={{ fontSize:15 }}>{icon}</span>
      <span style={{ fontSize:9, whiteSpace:"nowrap" }}>{label}</span>
    </button>
  );
}

function RBtnSm({ label, active, onClick }: { label:string; active?:boolean; onClick:()=>void }) {
  return (
    <button onClick={onClick} style={{
      background: active?"rgba(56,139,253,.2)":"rgba(33,38,45,1)",
      border:`1px solid ${active?"#388bfd":"#30363d"}`,
      borderRadius:3, color:active?"#388bfd":"#8b949e",
      padding:"3px 8px", fontSize:11, cursor:"pointer", height:22,
      display:"flex", alignItems:"center", userSelect:"none",
    }}>{label}</button>
  );
}

function Group({ children }: { children: React.ReactNode }) {
  return <div style={{ display:"flex", alignItems:"center", gap:2, padding:"0 8px", borderRight:"1px solid #21262d" }}>{children}</div>;
}

export default function Ribbon({ state, onView, onZoom, onRibbon, onToggleCritical, onToggleBaseline, onToggleArrows, onToggleDetail, onSaveBaseline, onAddTask, onDelete, onLink, onFilter, onSearch, onCollapseAll, onExpandAll, onAutoSchedule, onNotify, onUnlink, onExport, onScrollToday, onLevelResources, onStats }: Props) {
  const { ribbonTab: tab, viewMode, zoomMode, showCritical, showBaseline, showArrows, filterStatus } = state;

  return (
    <div style={{ background:"#1c2128", borderBottom:"1px solid #30363d", flexShrink:0 }}>
      {/* Tabs */}
      <div style={{ display:"flex", borderBottom:"1px solid #21262d" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => onRibbon(t.id)} style={{
            padding:"4px 12px", fontSize:11, cursor:"pointer",
            color: tab===t.id ? "#388bfd" : "#8b949e",
            background: tab===t.id ? "rgba(56,139,253,.08)" : "transparent",
            border:"none", borderBottom: tab===t.id ? "2px solid #388bfd" : "2px solid transparent",
            transition:"all .15s",
          }}>{t.label}</button>
        ))}
      </div>

      {/* Ribbon body */}
      <div style={{ display:"flex", alignItems:"center", padding:"4px 6px", gap:2, minHeight:52, flexWrap:"wrap" }}>
        {tab === "task" && <>
          <Group>
            <RBtn icon="＋" label="Tarea"    onClick={onAddTask} />
            <RBtn icon="◆" label="Hito"     onClick={onAddTask} />
            <RBtn icon="🗑" label="Eliminar" danger onClick={onDelete} />
          </Group>
          <Group>
            <RBtn icon="🔗" label="Vincular"    onClick={() => onLink("FS")} />
            <RBtn icon="✂"  label="Desvincular" onClick={() => onUnlink?.()} />
          </Group>
          <Group>
            <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
              <div style={{ display:"flex", gap:1 }}>
                {(["FS","SS","FF","SF"] as DepType[]).map(dt => (
                  <RBtnSm key={dt} label={dt} onClick={() => onLink(dt)} />
                ))}
              </div>
              <div style={{ fontSize:9, color:"#484f58" }}>Tipo de dependencia</div>
            </div>
          </Group>
          <Group>
            <RBtn icon="✔" label="% Avance"    onClick={() => onNotify("Seleccione una tarea y haga doble clic en la barra de progreso")} />
            <RBtn icon="⚡" label="Auto"        onClick={onAutoSchedule} />
            <RBtn icon="⚖" label="Nivelar"     onClick={() => onLevelResources?.()} />
          </Group>
          <Group>
            <RBtn icon="🔴" label="R.Crítica"  active={showCritical}  onClick={onToggleCritical} />
            <RBtn icon="📐" label="Línea Base" active={showBaseline}  onClick={onToggleBaseline} />
            <RBtn icon="📌" label="Guardar LB"                        onClick={onSaveBaseline} />
          </Group>
          <Group>
            <RBtn icon="📅" label="Hoy"         onClick={() => onScrollToday?.()} />
          </Group>
        </>}

        {tab === "view" && <>
          <Group>
            {VIEWS.map(v => (
              <RBtn key={v.id} icon={v.icon} label={v.label} active={viewMode===v.id} onClick={() => onView(v.id)} />
            ))}
          </Group>
          <Group>
            <RBtn icon="⬇" label="Detalles" active={state.detailOpen} onClick={onToggleDetail} />
          </Group>
          <Group>
            <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
              <div style={{ display:"flex", gap:1 }}>
                {(["day","week","month","quarter"] as ZoomMode[]).map(z => (
                  <RBtnSm key={z} label={z.slice(0,3)} active={zoomMode===z} onClick={() => onZoom(z)} />
                ))}
              </div>
              <div style={{ fontSize:9, color:"#484f58" }}>Escala de tiempo</div>
            </div>
          </Group>
          <Group>
            <RBtn icon="⊖" label="Contraer" onClick={onCollapseAll} />
            <RBtn icon="⊕" label="Expandir" onClick={onExpandAll} />
          </Group>
          <Group>
            <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
              <div style={{ fontSize:9, color:"#484f58" }}>Filtro</div>
              <select value={filterStatus} onChange={e => onFilter(e.target.value)}
                style={{ background:"#21262d", border:"1px solid #30363d", color:"#e6edf3", fontSize:11, padding:"2px 4px", height:22, borderRadius:3 }}>
                <option value="active">En progreso / Planning</option>
                <option value="completed">Completadas</option>
                <option value="on_hold">En espera</option>
                <option value="all">Todas</option>
              </select>
            </div>
          </Group>
        </>}

        {tab === "resource" && <>
          <Group>
            <RBtn icon="👤" label="Recurso"    onClick={() => onNotify("Agregue recursos en la vista de Recursos")} />
            <RBtn icon="⚠"  label="Sobreasig." onClick={() => onNotify("3 recursos con sobreasignación detectados")} />
            <RBtn icon="⚖"  label="Nivelar"    onClick={() => onLevelResources?.()} />
          </Group>
        </>}

        {tab === "project" && <>
          <Group>
            <RBtn icon="ℹ"  label="Info"       onClick={() => onNotify(`${state.tasks.filter(t=>t.type==='summary').length} proyectos activos`)} />
            <RBtn icon="📊" label="Estadísticas" onClick={() => onStats?.()} />
          </Group>
          <Group>
            <RBtn icon="📄" label="Reporte"    onClick={() => onNotify("Reporte generado")} />
            <RBtn icon="📗" label="Exportar"   onClick={() => onExport?.()} />
          </Group>
          <Group>
            <RBtn icon="📆" label="Calendario" onClick={() => onNotify("Calendario actualizado")} />
            <RBtn icon="⚙"  label="Config"     onClick={() => onNotify("Configuración guardada")} />
          </Group>
        </>}

        {tab === "format" && <>
          <Group>
            <RBtn icon={showArrows?"🔗":"○"} label="Flechas Dep" active={showArrows} onClick={onToggleArrows} />
            <RBtn icon="📐" label="Línea Base" active={showBaseline} onClick={onToggleBaseline} />
            <RBtn icon="🔴" label="R.Crítica"  active={showCritical} onClick={onToggleCritical} />
          </Group>
          <Group>
            <RBtn icon="⊞" label="Columnas" onClick={() => onNotify("Personalización de columnas")} />
            <RBtn icon="🎨" label="Colores"  onClick={() => onNotify("Editor de colores")} />
          </Group>
        </>}

        {/* Search — always visible */}
        <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:6 }}>
          <span style={{ fontSize:11, color:"#484f58" }}>🔎</span>
          <input value={state.searchQuery} onChange={e => onSearch(e.target.value)}
            placeholder="Buscar tareas..."
            style={{ background:"#21262d", border:"1px solid #30363d", color:"#e6edf3", fontSize:11, padding:"3px 8px", borderRadius:3, width:150, outline:"none" }} />
        </div>
      </div>

      {/* View strip */}
      <div style={{ background:"#161b22", borderTop:"1px solid #21262d", display:"flex", alignItems:"center", height:24, padding:"0 8px", gap:0, flexShrink:0 }}>
        {VIEWS.map(v => (
          <button key={v.id} onClick={() => onView(v.id)} style={{
            padding:"2px 12px", fontSize:11, cursor:"pointer",
            color: viewMode===v.id ? "#388bfd" : "#8b949e",
            background: viewMode===v.id ? "rgba(56,139,253,.06)" : "transparent",
            border:"none", borderBottom: viewMode===v.id ? "2px solid #388bfd" : "2px solid transparent",
            height:24, display:"flex", alignItems:"center",
          }}>{v.icon} {v.label}</button>
        ))}
      </div>
    </div>
  );
}
