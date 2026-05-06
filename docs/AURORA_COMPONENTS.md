# Aurora PM — Component Index

Generated scaffold for the Aurora PM enterprise project hub.

## Design tokens
- `src/lib/design/tokens.ts` — color, spacing, radius, shadow, typography, motion, z, breakpoints + `generateCssVars()`.

## Mock data
- `src/lib/aurora/mock.ts` — projects, tasks (parent/child + deps), resources, timesheet, KPIs, reports.

## Layout
- `src/components/aurora/layout/AuroraSidebar.tsx` — branded sidebar with project switcher dropdown and primary navigation.
- `src/components/aurora/layout/CommandBar.tsx` — top bar: breadcrumbs, Cmd+K search trigger, notifications, avatar.
- `src/components/aurora/layout/ViewSwitcher.tsx` — segmented control: Grid / Gantt / Board / Calendar / Dashboard.

## Task views
- `src/components/aurora/task-grid/TaskGrid.tsx` — editable WBS grid with status, dates, progress.
- `src/components/aurora/task-grid/InlineCell.tsx` — double-click-to-edit cell with Enter/Esc commit/cancel.
- `src/components/aurora/gantt/GanttTimeline.tsx` — minimal SVG Gantt with grid and progress overlay.
- `src/components/aurora/board/KanbanBoard.tsx` — three-column draggable board (TODO / IN_PROGRESS / DONE).
- `src/components/aurora/calendar/MonthCalendar.tsx` — month grid with task chips.

## Drawers and detail
- `src/components/aurora/drawer/TaskDetailDrawer.tsx` — right-slide task detail using the generic Drawer.
- `src/components/aurora/common/Drawer.tsx` — generic right-side overlay drawer with Esc-to-close.

## Resources and timesheet
- `src/components/aurora/resource/ResourceHeatmap.tsx` — resource x week utilization heatmap (0-150%).
- `src/components/aurora/timesheet/TimesheetWeek.tsx` — Mon-Sun hour entry grid with totals.

## Reports and dashboard
- `src/components/aurora/reports/ReportCard.tsx` — KPI value + sparkline + delta.
- `src/components/aurora/dashboard/PortfolioKPIs.tsx` — four-card portfolio KPI strip.

## Common primitives
- `src/components/aurora/common/Button.tsx` — primary/secondary/ghost/danger button using tokens.
- `src/components/aurora/common/Input.tsx` — labeled text input.
- `src/components/aurora/common/Select.tsx` — labeled select with options.
- `src/components/aurora/common/EmptyState.tsx` — icon + headline + CTA empty state.
- `src/components/aurora/common/PermissionGate.tsx` — wraps children, shows lock fallback when not allowed.
- `src/components/aurora/common/CommandPalette.tsx` — Cmd+K modal with grouped mocked results.

## Pages
- `src/app/(dashboard)/aurora/layout.tsx` — auth check + AuroraSidebar + CommandBar shell.
- `src/app/(dashboard)/aurora/portfolio/page.tsx` — KPI strip + report cards or empty state.
- `src/app/(dashboard)/aurora/projects/page.tsx` — list of mock projects.
- `src/app/(dashboard)/aurora/projects/[id]/page.tsx` — project header + view tabs (server).
- `src/app/(dashboard)/aurora/projects/[id]/ProjectViews.tsx` — client tab switcher mounting Grid/Gantt/Board/Calendar/Dashboard.
- `src/app/(dashboard)/aurora/resources/page.tsx` — resource heatmap.
- `src/app/(dashboard)/aurora/timesheets/page.tsx` — timesheet week.
- `src/app/(dashboard)/aurora/reports/page.tsx` — grid of report cards.
- `src/app/(dashboard)/aurora/admin/page.tsx` — admin settings sections placeholder.
