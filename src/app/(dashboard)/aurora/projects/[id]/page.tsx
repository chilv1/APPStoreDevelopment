import { notFound } from "next/navigation";
import { getProject, getTasksForProject } from "@/lib/aurora/mock";
import { COLOR } from "@/lib/design/tokens";
import ProjectViews from "./ProjectViews";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) notFound();

  const tasks = getTasksForProject(id);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <header>
        <div style={{ fontSize: 11, color: COLOR.neutral[500], fontWeight: 600 }}>{project.code}</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: COLOR.neutral[900] }}>{project.name}</h1>
        <div style={{ display: "flex", gap: 14, marginTop: 6, fontSize: 12, color: COLOR.neutral[600] }}>
          <span>PM: <strong>{project.pm}</strong></span>
          <span>Vung: <strong>{project.region}</strong></span>
          <span>Status: <strong>{project.status}</strong></span>
          <span>Tien do: <strong>{project.progress}%</strong></span>
        </div>
      </header>

      <ProjectViews tasks={tasks} />
    </div>
  );
}
