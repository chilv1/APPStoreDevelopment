# Aurora PM Roadmap

This document defines the six-month evolution of the Aurora PM platform from its current state (Next.js 16, Prisma 7, SQLite, NextAuth v5, Tailwind 4 with a working CPM scheduler at `src/lib/scheduler/` and ~2500 LOC of planning UI under `src/components/planning/`) toward enterprise-grade project management capabilities. Each of the nine streams below is sized for incremental delivery in three phases (P1 foundational, P2 production, P3 enterprise polish), with explicit owners drawn from an eleven-role multi-agent execution model. The order of streams is not arbitrary: dependencies, critical path, and baselines form the scheduling backbone; resources, timesheets, and costs form the actuals backbone; reporting, portfolio, and AI sit on top of both. The cross-cutting concerns and sequencing tables at the end of this document anchor the program and should be consulted before any phase kickoff. Person-week estimates assume a steady-state team familiar with the existing codebase and exclude initial onboarding; estimates should be re-validated at each phase kickoff against the actual roster. The data model already includes `Phase`, `Task`, `PhaseBaseline`, `PhaseTemplate`, `StoreProject`, `BusinessCenter`, and `Branch`, and each branch has a single store seeded at city coordinates, which gives Stream 8 a free geographic axis for portfolio visualizations from day one.

## 1. Advanced Dependencies

### Vision
Move beyond simple finish-to-start parent-child task ordering toward the full PMI dependency model: FS, SS, FF, SF with positive and negative lag, hard versus soft constraints, and cross-phase or cross-project links. The existing scheduler already understands a graph of predecessors via `src/lib/scheduler/graph.ts`, but the persisted model in Prisma stores only a coarse `dependsOnId` relation. Advanced dependencies unlock realistic construction, rollout, and decommissioning sequences for telecom store builds where civil works, electrical, IT cabling, and merchandising overlap. Real telecom rollouts routinely require partial overlaps (cabling can start when civil is 60 percent complete) and cross-branch links (regional warehouse delivery gates ten store openings simultaneously); these are impossible to express today and force planners into spreadsheets that live outside the platform. The result is drift between the canonical Aurora schedule and the operational reality, which then poisons every downstream stream from baselines through reporting. Closing this gap is the highest-leverage foundational investment.

### Phases
- P1 (4 person-weeks): Add a `TaskDependency` join table with type and lag; backfill from existing `dependsOnId`; surface a dependency editor sidebar in the task drawer; teach `src/lib/scheduler/graph.ts` to consume the new shape without behavior change.
- P2 (6 person-weeks): Implement SS/FF/SF semantics in `src/lib/scheduler/cpm.ts`, lag arithmetic against the working calendar, and cycle detection with actionable error messages. Add bulk dependency editing to the Gantt and a link-by-drag interaction in `src/components/planning/Gantt.tsx`.
- P3 (4 person-weeks): Cross-project links across `StoreProject` instances within a `BusinessCenter`, soft constraints with violation badges instead of hard rejection, and an audit log of dependency changes.

### Critical files
`src/lib/scheduler/graph.ts`, `src/lib/scheduler/cpm.ts`, `src/lib/scheduler/types.ts`, `src/lib/scheduler/__tests__/cpm.test.ts`, `src/components/planning/TaskDrawer.tsx`, `src/components/planning/Gantt.tsx`, `prisma/schema.prisma`.

### API endpoints
`POST /api/tasks/[id]/dependencies`, `DELETE /api/tasks/[id]/dependencies/[depId]`, `PATCH /api/tasks/[id]/dependencies/[depId]` (type, lag), `GET /api/projects/[id]/dependency-graph`.

### DB schema changes
New `TaskDependency { id, predecessorId, successorId, type (FS|SS|FF|SF), lagMinutes, hard Boolean, createdAt, createdBy }` with a unique composite index on `(predecessorId, successorId)`. Migration must backfill existing `Task.dependsOnId` rows as `FS, lag=0, hard=true` and then drop the legacy column in P2 once the UI and scheduler are switched.

### Acceptance criteria
- A user can create FS, SS, FF, SF links with positive or negative lag through the Gantt and the task drawer.
- The CPM engine returns identical schedules for the legacy and new representation when only FS/0 links are present.
- Cycles are rejected with a message naming both endpoints and the conflicting edge.
- Cross-project links survive project rename and are visible from both endpoints.
- Dependency edits are recorded with actor and timestamp and surfaced in the audit log view.

### Owners
Architect (lead), Backend, Gantt Engine, Database, QA.

## 2. Critical Path

### Vision
Make the critical path a first-class, always-visible artifact: highlighted in the Gantt, summarized in the project header, and exportable. The standalone CPM engine in `src/lib/scheduler/` already produces early/late dates and float per task; this stream wires that output through to the user, persists a snapshot for change comparison, and adds resource-leveled critical path (RCP) once Stream 4 lands. The strategic value of an explicit critical path is twofold. First, it tells program managers exactly which tasks deserve daily attention out of the hundreds in a typical store rollout; today they guess based on tribal knowledge. Second, when persisted as snapshots over time, the path becomes a record of how risk migrated through the project, which is invaluable both for post-mortems and for sharpening future templates. The same snapshot store also serves as the binding mechanism for reproducible reports in Stream 7 and earned-value baselines in Stream 6, so this investment pays back across multiple downstream streams rather than only inside its own UI surface.

### Phases
- P1 (3 person-weeks): Surface `totalFloat` and `isCritical` from `schedule()` into the API response for `GET /api/projects/[id]/schedule`; render critical tasks in red with a legend toggle in `src/components/planning/Gantt.tsx`; add a header chip showing critical path length in working days.
- P2 (5 person-weeks): Persist a `ScheduleSnapshot` per recompute with checksum and trigger reason; provide a diff view (added, removed, slipped); add a "what is critical and why" panel that walks the predecessor chain.
- P3 (4 person-weeks): Resource-leveled critical path that re-runs after Stream 4 leveling; multi-critical-path display when several chains share the maximum length; CSV/PNG export of the critical chain.

### Critical files
`src/lib/scheduler/cpm.ts`, `src/lib/scheduler/index.ts`, `src/lib/scheduler/__tests__/`, `src/components/planning/Gantt.tsx`, `src/components/planning/CriticalPathPanel.tsx` (new), `src/app/api/projects/[id]/schedule/route.ts`.

### API endpoints
`GET /api/projects/[id]/schedule` (extended with critical flags and float), `GET /api/projects/[id]/schedule/snapshots`, `GET /api/projects/[id]/schedule/snapshots/[snapId]`, `POST /api/projects/[id]/schedule/snapshots/diff`.

### DB schema changes
New `ScheduleSnapshot { id, projectId, takenAt, takenBy, reason, payload Json, checksum }`. The payload stores the per-task early/late/float so historical comparisons do not require re-running the CPM against a mutated graph.

### Acceptance criteria
- The critical chain is highlighted in the Gantt within 100ms of opening a 1k-task project.
- The header chip matches the maximum chain length returned by the engine for a fixture project.
- A snapshot diff between two runs lists every task whose early start moved, with the delta.
- Toggling resource leveling produces a different critical chain in P3 and the change is annotated.
- The walk-the-chain panel reaches a project start node from any critical task in O(chain length) clicks.

### Owners
Gantt Engine (lead), Architect, Backend, Frontend, QA.

## 3. Baselines

### Vision
A baseline is a frozen plan against which actuals and forecasts are compared. The schema already has `PhaseBaseline`; this stream generalizes baselining to the project and task level, supports multiple named baselines (initial, rebaseline-Q2, post-scope-change), and renders variance as a second bar in the Gantt. Baselines are the contractual memory of the program: without them, every slip looks like the new normal and every recovery looks invisible. With them, leadership can answer "are we tracking against the plan we committed to" in a single glance, and finance can defend variance numbers without re-deriving them from emails. Multiple named baselines matter because telecom rollouts undergo legitimate scope changes (added branches, deferred renovations) that would otherwise force a single-baseline organization to either ignore reality or destroy historical truth. The active-baseline pattern below preserves both.

### Phases
- P1 (3 person-weeks): Add `ProjectBaseline` and `TaskBaseline` models; "Save baseline" action on the project header; baseline list view; ability to mark one baseline as the active comparison set.
- P2 (5 person-weeks): Render baseline bars under live bars in `src/components/planning/Gantt.tsx` with start/finish/duration variance tooltips; baseline variance columns in the task table; a project-level variance summary card.
- P3 (3 person-weeks): Rebaseline workflow that records a reason and a delta report; baseline export to PDF; per-phase baseline rollback (reuse `PhaseBaseline` mechanics).

### Critical files
`prisma/schema.prisma`, `src/components/planning/Gantt.tsx`, `src/components/planning/TaskTable.tsx`, `src/components/planning/BaselineBar.tsx` (new), `src/lib/scheduler/rollup.ts`, `src/app/api/projects/[id]/baselines/route.ts` (new).

### API endpoints
`POST /api/projects/[id]/baselines`, `GET /api/projects/[id]/baselines`, `POST /api/projects/[id]/baselines/[bid]/activate`, `DELETE /api/projects/[id]/baselines/[bid]`, `GET /api/projects/[id]/baselines/[bid]/variance`.

### DB schema changes
New `ProjectBaseline { id, projectId, name, takenAt, takenBy, reason, isActive }` and `TaskBaseline { id, baselineId, taskId, plannedStart, plannedFinish, plannedDurationMinutes, plannedCost }`. The existing `PhaseBaseline` becomes a derived view in P3 to avoid double-bookkeeping.

### Acceptance criteria
- Saving a baseline captures every task in the project at the moment of the click; later edits do not mutate the snapshot.
- Variance numbers in the UI exactly match the formula `actualOrForecast - baseline` for a fixture.
- Activating a different baseline updates Gantt overlay and variance card without a full reload.
- Rebaselining records the reason and is surfaced in audit history.
- Baseline export renders the same Gantt visuals at print resolution.

### Owners
Product Manager (lead), Backend, Frontend, Gantt Engine, QA.

## 4. Resource Capacity

### Vision
Today, tasks have assignees but no notion of how loaded those assignees are. Resource capacity introduces named resources (people and equipment), per-resource calendars, allocation percentages on tasks, and a leveling pass that smooths over-allocation by either delaying tasks (preserving constraints) or flagging conflicts. Capacity is per-store-project and per-`BusinessCenter` because crews rotate across branches. The single biggest hidden risk in current rollouts is double-booking specialist crews (POS installers, fiber splicers, signage teams) across simultaneous store openings. Today, the planner sees a green schedule for each project but a red operational reality once Monday arrives. Resource capacity makes the conflict visible at planning time, and the leveling pass turns the platform from a passive recorder into an active solver. It also unlocks downstream economics: timesheets become trustworthy because the assignment model is grounded, costs become defensible because rates attach to resources, and AI suggestions in Stream 9 can recommend reassignments instead of hand-waving.

### Phases
- P1 (4 person-weeks): `Resource` and `ResourceAssignment` models; resource picker in task drawer; per-resource workload heatmap by week.
- P2 (6 person-weeks): Resource calendars (PTO, holidays, shift patterns) layered on top of `src/lib/scheduler/calendar.ts`; over-allocation indicators in the Gantt; manual leveling tools.
- P3 (5 person-weeks): Automatic leveling pass invoked from `schedule()` with a configurable strategy (delay vs split vs flag); cross-project resource pool view at the `BusinessCenter` level.

### Critical files
`src/lib/scheduler/calendar.ts`, `src/lib/scheduler/cpm.ts`, `src/lib/scheduler/types.ts`, `src/components/planning/ResourceHeatmap.tsx` (new), `src/components/planning/TaskDrawer.tsx`, `prisma/schema.prisma`.

### API endpoints
`GET/POST /api/resources`, `PATCH/DELETE /api/resources/[id]`, `GET /api/resources/[id]/calendar`, `POST /api/projects/[id]/level`, `GET /api/business-centers/[id]/resource-load`.

### DB schema changes
`Resource { id, name, kind (person|equipment), email, branchId, costPerHour, defaultCapacityPercent }`, `ResourceCalendarEntry { id, resourceId, date, kind (work|off|reduced), hours }`, `ResourceAssignment { id, taskId, resourceId, allocationPercent, units }`.

### Acceptance criteria
- A resource over-allocated above 100 percent in any working day is flagged in the heatmap and on the Gantt.
- Adding a PTO entry shifts dependent tasks when the leveling toggle is on and only flags when off.
- Cross-project view aggregates load for shared resources without duplication.
- Leveling completes in under 100ms for a 1k-task project with 50 resources.
- Removing a resource does not orphan assignments; the UI prompts for reassignment first.

### Owners
Resource Planning (lead), Architect, Backend, Frontend, Database, QA.

## 5. Timesheets

### Vision
Capture actual effort per resource per task per day, feed it back into earned value and forecasts, and gate weekly approval through a manager review queue. Timesheet entries become the bridge between planning (Streams 1 to 4) and cost tracking (Stream 6). The friction of timesheet entry is the determining factor in whether actuals data is trustworthy, so the design priority here is speed of entry over feature surface area: a weekly grid keyed by resource and task, with auto-fill from scheduled assignments, must let a typical user complete a week in well under two minutes. Approval workflows preserve the manager's veto and create the audit trail that finance will demand. Critically, timesheet hours feed the actual-cost-of-work-performed (ACWP) calculation in Stream 6 directly, so any latency or inaccuracy here propagates into every cost variance number reported upward, including the executive dashboards in Stream 8 and the scheduled PDF reports in Stream 7.

### Phases
- P1 (4 person-weeks): `Timesheet` and `TimesheetEntry` models; weekly grid UI keyed by resource and task; draft and submit states; basic validation against assigned tasks.
- P2 (5 person-weeks): Approval workflow with delegation; auto-fill from scheduled assignments; mobile-friendly entry view; export to CSV.
- P3 (4 person-weeks): Pre-population from calendar integrations (Google, Outlook); anomaly detection (zero-hour weeks, suspicious round numbers); integration hooks for payroll export.

### Critical files
`prisma/schema.prisma`, `src/app/(app)/timesheets/page.tsx` (new), `src/components/timesheets/WeekGrid.tsx` (new), `src/lib/timesheets/validation.ts` (new), `src/app/api/timesheets/route.ts` (new).

### API endpoints
`GET /api/timesheets?weekOf=YYYY-MM-DD`, `POST /api/timesheets`, `PATCH /api/timesheets/[id]`, `POST /api/timesheets/[id]/submit`, `POST /api/timesheets/[id]/approve`, `POST /api/timesheets/[id]/reject`.

### DB schema changes
`Timesheet { id, resourceId, weekStart, status (draft|submitted|approved|rejected), submittedAt, approvedBy, approvedAt }`, `TimesheetEntry { id, timesheetId, taskId, date, hours, note }`. A unique constraint on `(timesheetId, taskId, date)` prevents duplicate rows.

### Acceptance criteria
- A user can fill a 40-hour week across multiple tasks in under two minutes on a 1366px laptop.
- Submitting a timesheet locks edits and notifies the approver.
- Approved hours immediately appear in earned value calculations for affected tasks.
- Rejected timesheets return to draft with the reviewer note attached.
- Auto-fill never overwrites user-entered hours.

### Owners
Backend (lead), Frontend, Product Manager, Security, QA.

## 6. Cost Tracking

### Vision
Roll planned, actual, committed, and forecast costs from tasks up through phases, projects, branches, and business centers. Combine resource cost rates from Stream 4 with timesheet actuals from Stream 5 and external commitments (purchase orders, fixed-price contracts) to produce earned-value metrics: BCWS, BCWP, ACWP, CPI, SPI, EAC. Earned value is the discipline that turns "we are 60 percent done with 70 percent of the budget spent" from an anecdote into a defensible projection; the engine behind it must be auditable, deterministic, and testable against hand-calculated fixtures. Multi-currency support lands in P3 because telecom rollouts often span branches that bill in different currencies (regional centers, cross-border partners), and a single project budget that silently mixes currencies is a finance defect waiting to happen. Commitments matter even before invoices land because a signed PO consumes budget the moment it ships, regardless of when the cash moves; ignoring committed cost is the most common reason projects discover overruns too late to recover.

### Phases
- P1 (3 person-weeks): `CostItem` model with categories; manual cost entry per task and phase; rollups in `src/lib/scheduler/rollup.ts` extended to sum costs.
- P2 (5 person-weeks): Earned value engine; CPI/SPI badges per task and phase; budget vs actual chart per project.
- P3 (5 person-weeks): Commitments and POs; forecast EAC using the trailing CPI; multi-currency support keyed off branch.

### Critical files
`prisma/schema.prisma`, `src/lib/scheduler/rollup.ts`, `src/lib/cost/earned-value.ts` (new), `src/components/planning/CostPanel.tsx` (new), `src/app/api/projects/[id]/cost/route.ts` (new).

### API endpoints
`GET /api/projects/[id]/cost`, `POST /api/tasks/[id]/cost-items`, `PATCH /api/cost-items/[id]`, `GET /api/projects/[id]/earned-value`, `GET /api/business-centers/[id]/cost-rollup`.

### DB schema changes
`CostItem { id, scope (task|phase|project), scopeId, kind (labor|material|subcontract|other), plannedAmount, actualAmount, committedAmount, currency, recordedAt }`. Earned-value snapshots reuse `ScheduleSnapshot` from Stream 2 by adding a `costPayload` Json column.

### Acceptance criteria
- Sum of `CostItem.plannedAmount` per project equals the project planned budget shown in the header.
- Earned value endpoint returns BCWS, BCWP, ACWP, CPI, SPI for a fixture matching a hand-calculated reference within 0.01.
- Currency conversion uses a single source-of-truth rate per branch and is auditable.
- Adding a new cost item triggers rollups within 100ms for a 1k-task project.
- Removing a cost item never produces a negative rollup.

### Owners
Backend (lead), Reporting, Database, Architect, QA.

## 7. Reporting

### Vision
A reporting layer that ships executive-ready PDFs and ad-hoc CSVs without bespoke engineering for each report. Templates cover schedule status, resource utilization, cost variance, baseline diff, and portfolio rollups. Reports respect the same RBAC rules as the underlying data and are reproducible because they bind to a `ScheduleSnapshot` rather than the live state. Reproducibility is the non-negotiable feature: a steering committee that cannot reproduce last month's pack will not trust the platform, and a regulator that asks "what did the schedule look like on this date" must be answered exactly. The registry pattern keeps the surface manageable as templates grow; the constrained query builder in P3 lets power users self-serve without reopening the door to ad-hoc engineering tickets. The locale-aware formatting requirement is hard: Vietnamese and Spanish currency, date, and number formats differ from US-English defaults, and the active-branch locale must override the browser locale because the audience for a regional report rarely matches the device of the operator producing it.

### Phases
- P1 (3 person-weeks): Report registry with five seed templates; CSV export endpoint; basic PDF rendering via the platform's print stylesheet on the existing planning views.
- P2 (5 person-weeks): Server-side PDF rendering with consistent headers, footers, page numbers, and locale formatting; scheduled email delivery; report parameters (date range, branch, project).
- P3 (4 person-weeks): User-defined report templates with a constrained query builder; saved views; subscription management.

### Critical files
`src/lib/reporting/registry.ts` (new), `src/lib/reporting/render.ts` (new), `src/app/(app)/reports/page.tsx` (new), `src/app/api/reports/[slug]/route.ts` (new), `src/components/reports/ReportRunner.tsx` (new).

### API endpoints
`GET /api/reports`, `POST /api/reports/[slug]/run`, `GET /api/reports/[slug]/runs/[runId]`, `POST /api/reports/[slug]/subscriptions`, `DELETE /api/reports/subscriptions/[id]`.

### DB schema changes
`ReportRun { id, slug, params Json, status, startedAt, finishedAt, outputUrl, requestedBy, snapshotId }`, `ReportSubscription { id, slug, params Json, cron, channel (email|webhook), target, ownerId }`.

### Acceptance criteria
- All five seed templates render to PDF in under five seconds for a 1k-task project.
- A report bound to a schedule snapshot produces byte-identical PDF on re-run with the same params.
- Subscriptions deliver on cron without missing or duplicating runs across a daily test window.
- RBAC denies cross-store data leakage in any report parameter combination.
- CSV exports are UTF-8, BOM-prefixed, and open cleanly in Excel for the vi locale.

### Owners
Reporting (lead), Backend, Frontend, Security, DevOps.

## 8. Portfolio Management

### Vision
Lift the lens from a single `StoreProject` to the full portfolio across all `BusinessCenter` and `Branch` entities. Provide rollup dashboards, scenario planning ("what if we delay branch X by two weeks"), portfolio-level resource demand curves, and prioritization tools that score projects on strategic value, cost, and risk. Each branch already has one store seeded at city coordinates, so the geographic pivot for the portfolio map view is available from day one without any data backfill. The scenario fork model is intentionally payload-driven and never mutates production rows, because portfolio-level "what if" analysis must be safe to run repeatedly without coordinating with project teams. Stage-gate workflow in P3 closes the loop on intake: new project ideas enter at a defined stage, accumulate scoring evidence, and either advance or terminate at gates with explicit owners. This eliminates the most common failure mode of portfolio tools, which is that they only manage active work and have no opinion on what should become active next.

### Phases
- P1 (4 person-weeks): Portfolio dashboard with project status tiles; aggregate KPIs (on-track count, slipping count, total budget, total spent); filters by business center and region.
- P2 (5 person-weeks): Scenario forks (clone a portfolio state, tweak, compare); portfolio-level demand curves drawing on Stream 4; weighted scoring model.
- P3 (5 person-weeks): Stage-gate workflow for project intake; investment-vs-value bubble chart; portfolio health export.

### Critical files
`src/app/(app)/portfolio/page.tsx` (new), `src/lib/portfolio/rollup.ts` (new), `src/components/portfolio/StatusTiles.tsx` (new), `src/components/portfolio/ScenarioCompare.tsx` (new), `prisma/schema.prisma`.

### API endpoints
`GET /api/portfolio/overview`, `GET /api/portfolio/demand`, `POST /api/portfolio/scenarios`, `GET /api/portfolio/scenarios/[id]`, `POST /api/portfolio/scenarios/[id]/compare`.

### DB schema changes
`PortfolioScenario { id, name, basedOnAt, ownerId, payload Json, createdAt }`, `ProjectScore { id, projectId, dimension (value|cost|risk|strategic), score, recordedAt }`. Scenarios are payload-driven to avoid mutating live project data.

### Acceptance criteria
- Portfolio overview loads in under one second for 200 active projects.
- Scenario clone never modifies any source-of-truth row, verified by checksum.
- Demand curves match the sum of per-project demand within rounding tolerance.
- Scoring updates reflect in the bubble chart on the next render frame.
- Stage-gate transitions write an audit entry and notify the next-stage owner.

### Owners
Product Manager (lead), Architect, Backend, Reporting, Frontend.

## 9. AI Assistant

### Vision
A conversational and inline assistant that reads project context (schedule, baselines, resources, costs, reports) and offers explanations, drafts updates, recommends mitigations, and generates plans from short prompts. It must operate within store-scoped RBAC, refuse to act outside the user's grants, and always surface the structured action it would take so a human can review and confirm. The deliberate ordering of P1 read-only Q&A before P2 suggest-and-apply is a trust-building sequence: users must learn that the assistant accurately understands their data before they let it propose changes, and they must learn that proposed changes are always reviewable before they accept inline application. The deterministic context-pack matters because nondeterministic context retrieval undermines reproducibility and makes audit impossible; the assistant must be able to point to the exact endpoints and rows that informed any answer. Plan generation in P3 is the highest-value capability and the highest-risk: a generated plan that violates calendar or dependency rules erodes trust permanently, so generated graphs are routed through the same `schedule()` validator as human-authored ones.

### Phases
- P1 (4 person-weeks): Read-only Q&A over the active project: "what is on the critical path next week," "which resources are over-allocated," answered using deterministic context-pack assembled from existing endpoints.
- P2 (6 person-weeks): Suggest-and-apply actions: propose dependency changes, assignment swaps, or rebaseline; show diff; one-click apply with audit trail.
- P3 (6 person-weeks): Plan generation from `PhaseTemplate` plus prompt; inline assistant in the Gantt for selection-based actions; proactive anomaly notifications.

### Critical files
`src/lib/ai/context-pack.ts` (new), `src/lib/ai/tools.ts` (new), `src/components/ai/AssistantPanel.tsx` (new), `src/app/api/ai/chat/route.ts` (new), `src/app/api/ai/apply/route.ts` (new).

### API endpoints
`POST /api/ai/chat`, `POST /api/ai/suggest`, `POST /api/ai/apply`, `GET /api/ai/sessions/[id]`, `GET /api/ai/audit?projectId=...`.

### DB schema changes
`AiSession { id, userId, projectId, startedAt, endedAt }`, `AiMessage { id, sessionId, role (user|assistant|tool), content, toolName, toolInput Json, toolOutput Json, createdAt }`, `AiAction { id, sessionId, kind, payload Json, status (proposed|applied|rejected), appliedBy, appliedAt }`.

### Acceptance criteria
- Every AI-applied change is reversible from the audit log.
- The assistant never returns data outside the caller's RBAC scope, verified by store-scoped fixtures.
- Plan generation produces a valid CPM-schedulable graph for ten template inputs.
- Median chat response time is under three seconds for typical project sizes.
- Suggest-and-apply diffs are accepted by users at least 60 percent of the time in dogfood metrics.

### Owners
Architect (lead), Backend, Security, Frontend, Product Manager.

## Cross-cutting concerns

These concerns apply to every stream and gate every phase exit. Each stream's QA and Architect owners must explicitly sign off on each item for the phase to ship.

- Migration. Every schema change ships with a forward Prisma migration plus a backfill script and, where data shape changes, a parallel-write window so that rollback to the previous deploy keeps working. Backups under `backups/` must be exercised against each migration in CI on a copy of `dev.db` shape data before merge. SQLite remains the development database, but every migration must be reviewed for compatibility with a future Postgres production target; specifically, no SQLite-only types or functions (no `JULIANDAY`, no untyped JSON columns without a Prisma `Json` annotation) and no implicit case-insensitive comparisons. The migration review checklist lives next to `prisma/schema.prisma` and is enforced in PR review.
- Performance. The platform's hard target is sub-100ms server response on a 1k-task project for any read endpoint and a sub-100ms recompute for any write that re-runs the scheduler. The `src/lib/scheduler/__tests__/` suite must include a benchmark fixture at 1k and 5k tasks, and CI fails on regression beyond ten percent. Frontend rendering of the Gantt at 1k tasks must hit a steady-state 60 fps on a mid-range laptop; this is enforced by a Lighthouse CI check on a representative fixture and by an explicit virtualization invariant in `src/components/planning/Gantt.tsx`. AI endpoints have their own latency budget (median three seconds, p95 eight seconds) measured separately because they include external model calls.
- RBAC per store. The data model is multi-tenant by `StoreProject`, which roots in a `Branch` and a `BusinessCenter`. Every new endpoint must call a single `assertCanAccessProject(userId, projectId)` helper before any read or write, and every test must cover a cross-store negative case. The same helper is invoked from the AI tool layer in Stream 9 so that no model-driven path can bypass the check. Audit logging captures the actor, the project, the action, and the before/after payload for every write; logs are append-only and queryable from the security console without granting raw database access.
- Accessibility. WCAG 2.1 AA across all new UI: keyboard navigation for the Gantt, ARIA roles on tabular views, sufficient contrast in critical-path and over-allocation indicators (do not rely on color alone), focus management in the AI panel and task drawer, and screen-reader-announced live regions for asynchronous updates such as schedule recompute completion. Every new UI component must include an axe-core test in its unit test file and pass before merge.
- Internationalization. All user-facing strings must route through the i18n layer with vi and es locale bundles. Date, number, and currency formatting must respect the locale of the active branch, not the browser, because cross-branch managers operate in a different locale than the data they manage. Strings inside reports rendered in Stream 7 follow the same rule, including page footers and chart axis labels. New strings without a locale key fail the build via a lint rule, which prevents English from leaking into shipped UI as the codebase grows.

## Multi-agent execution model

The eleven-role model below maps each role to the streams it primarily owns. An "X" means the role is the lead or a primary contributor; absence does not mean zero involvement, only that ownership rests elsewhere. Use this matrix to staff sprints, route review requests, and align on RACI at phase kickoff.

| Role | 1 Deps | 2 CP | 3 Base | 4 Res | 5 TS | 6 Cost | 7 Rep | 8 Port | 9 AI |
|---|---|---|---|---|---|---|---|---|---|
| Product Manager |  |  | X |  | X |  |  | X | X |
| Architect | X | X |  | X |  | X |  | X | X |
| Database | X |  |  | X |  | X |  |  |  |
| Backend | X | X | X | X | X | X | X | X | X |
| Frontend |  | X | X | X | X |  | X | X | X |
| Gantt Engine | X | X | X |  |  |  |  |  |  |
| Resource Planning |  |  |  | X |  |  |  |  |  |
| Reporting |  |  |  |  |  | X | X | X |  |
| Security |  |  |  |  | X |  | X |  | X |
| QA | X | X | X | X | X | X |  |  |  |
| DevOps |  |  |  |  |  |  | X |  |  |

## Sequencing & milestones

The six-month horizon below assumes parallel teams across streams but enforces hard dependencies between phases of different streams. Each cell shows the phase delivered in that month. Dependencies are noted in the rightmost column; "after Stream X Pn" means that phase cannot enter P1 work until the prerequisite phase exits.

| Stream | M1 | M2 | M3 | M4 | M5 | M6 | Hard dependencies |
|---|---|---|---|---|---|---|---|
| 1 Advanced Dependencies | P1 | P1/P2 | P2 | P2/P3 | P3 |  | none (foundation) |
| 2 Critical Path |  | P1 | P1/P2 | P2 | P2/P3 | P3 | after Stream 1 P1 |
| 3 Baselines |  |  | P1 | P1/P2 | P2 | P2/P3 | after Stream 2 P1 |
| 4 Resource Capacity | P1 | P1/P2 | P2 | P2/P3 | P3 |  | none (parallel foundation) |
| 5 Timesheets |  |  | P1 | P1/P2 | P2 | P2/P3 | after Stream 4 P1 |
| 6 Cost Tracking |  |  |  | P1 | P1/P2 | P2/P3 | after Stream 4 P1 and Stream 5 P1 |
| 7 Reporting |  |  | P1 | P1/P2 | P2 | P2/P3 | after Stream 2 P1 (snapshot binding) |
| 8 Portfolio Management |  |  |  | P1 | P1/P2 | P2/P3 | after Stream 3 P1 and Stream 6 P1 |
| 9 AI Assistant |  |  | P1 | P1/P2 | P2 | P2/P3 | after Stream 1 P1, Stream 2 P1, Stream 4 P1 |

Milestone gates: end of M2 ships advanced dependencies and resource capacity foundations; end of M3 unblocks downstream streams via critical path and baselines P1; end of M4 adds cost tracking P1 and portfolio P1; end of M6 closes the program with P3 polish across the dependent streams. The cross-cutting performance and RBAC gates apply at every monthly checkpoint and override schedule pressure: a stream that fails the 100ms benchmark on a 1k-task fixture or fails a cross-store RBAC negative test does not exit its phase until the gate passes.

Risk and contingency. Two streams carry the highest schedule risk: Stream 4 (Resource Capacity) because the leveling pass in P3 introduces nondeterminism into the scheduler, and Stream 9 (AI Assistant) because P3 plan generation depends on external model behavior that may shift mid-program. Mitigation for Stream 4 is to ship the leveling pass behind a feature flag with an explicit "off" default and a parallel-execution comparison harness in CI that confirms unchanged behavior when the flag is off. Mitigation for Stream 9 is to keep the read-only Q&A path independently shippable so that a P3 plan-generation slip does not block the user value already delivered in P1 and P2. Cross-stream dependency slips are tracked in the same `ScheduleSnapshot` mechanism the platform itself uses, with the program team operating Aurora on Aurora as a continuous dogfood signal.

Exit criteria for the six-month horizon. By the end of M6 the platform must demonstrate: a 5000-task fixture rolling up across phases, projects, branches, and business centers within the 100ms read budget; a fully reproducible monthly executive PDF generated from a snapshot taken thirty days prior; an AI-assisted rebaseline action applied and reverted through the audit log; and a portfolio scenario that delays a single branch by two weeks and shows the cascading impact on cost, resource demand, and critical path across the affected business center. These are not feature-list checks; they are end-to-end demonstrations that the nine streams compose into a coherent enterprise platform rather than a collection of independent capabilities.
