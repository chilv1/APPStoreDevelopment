"use client";

import { useState } from "react";
import ViewSwitcher, { AuroraView } from "@/components/aurora/layout/ViewSwitcher";
import TaskGrid from "@/components/aurora/task-grid/TaskGrid";
import GanttTimeline from "@/components/aurora/gantt/GanttTimeline";
import KanbanBoard from "@/components/aurora/board/KanbanBoard";
import MonthCalendar from "@/components/aurora/calendar/MonthCalendar";
import PortfolioKPIs from "@/components/aurora/dashboard/PortfolioKPIs";
import { Task, MOCK_KPIS } from "@/lib/aurora/mock";

interface Props {
  tasks: Task[];
}

export default function ProjectViews({ tasks }: Props) {
  const [view, setView] = useState<AuroraView>("Grid");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <ViewSwitcher value={view} onChange={setView} />
      {view === "Grid" && <TaskGrid tasks={tasks} />}
      {view === "Gantt" && <GanttTimeline tasks={tasks} />}
      {view === "Board" && <KanbanBoard tasks={tasks} />}
      {view === "Calendar" && <MonthCalendar tasks={tasks} />}
      {view === "Dashboard" && <PortfolioKPIs kpis={MOCK_KPIS} />}
    </div>
  );
}
