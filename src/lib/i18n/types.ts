// i18n types — Spanish (Peru) is primary, Vietnamese is UI translation only
export type Locale = "es" | "vi";

export const SUPPORTED_LOCALES: Locale[] = ["es", "vi"];
export const DEFAULT_LOCALE: Locale = "es";

export const LOCALE_INFO: Record<Locale, { flag: string; name: string; short: string; intlCode: string }> = {
  es: { flag: "🇵🇪", name: "Español (Perú)", short: "ES", intlCode: "es-PE" },
  vi: { flag: "🇻🇳", name: "Tiếng Việt",      short: "VI", intlCode: "vi-VN" },
};

export type Dict = {
  sidebar: {
    overview: string; stores: string; portfolioGantt: string; branches: string;
    map: string; reports: string; users: string; phaseTemplates: string;
    logout: string; mainMenu: string; admin: string;
  };
  common: {
    save: string; cancel: string; delete: string; edit: string; create: string;
    confirm: string; loading: string; loadingData: string; search: string;
    filter: string; sortBy: string; all: string; yes: string; no: string;
    close: string; back: string; next: string; today: string; add: string;
    remove: string; update: string; note: string; notes: string;
    description: string; name: string; code: string; seeAll: string;
    noData: string; notAssigned: string; results: string; notFound: string;
    system: string; errorUpdate: string; errorSave: string;
    dragStartHint: string; dragEndHint: string;
  };
  status: {
    planning: string; inProgress: string; completed: string; onHold: string;
    cancelled: string; notStarted: string; blocked: string; todo: string;
    done: string; open: string; resolved: string; closed: string;
  };
  priority: { low: string; medium: string; high: string; critical: string };
  role: { admin: string; areaManager: string; pm: string; surveyStaff: string };

  login: {
    appTitle: string; tagline: string; title: string; email: string;
    password: string; submit: string; submitting: string; error: string;
    demoTitle: string;
  };

  dashboard: {
    title: string; subtitle: string; overdueAlertTitle: string;
    overdueStores: string; overdueTasks: string; statTotal: string;
    statInProgress: string; statCompleted: string; statOnHold: string;
    statAvgProgress: string; storeListTitle: string; activityFeedTitle: string;
    statusBreakdownTitle: string; branchProgressTitle: string; noActivity: string;
    tableStore: string; tableBranch: string; tableStatus: string;
    tableProgress: string; tableTargetOpen: string; branchAvg: string;
  };

  storesList: {
    title: string; subtitle: string; createButton: string;
    searchPlaceholder: string; filterAllBranch: string; filterAllStatus: string;
    progressLabel: string; activePhase: string; issuesCount: string;
    targetOpen: string; notAssignedPM: string; emptyResult: string;
    phaseAbbrev: string;
  };

  // Store detail page
  storeDetail: {
    tabPhases: string; tabGantt: string; tabIssues: string; tabActivity: string;
    completedPhases: string; // "Completadas {done}/{total} fases"
    edit: string; delete: string;
    branch: string; pm: string; budget: string;
    targetOpenLabel: string; coordinates: string;
    // Phase list (left rail)
    taskCount: string; // "tareas" / "tasks"
    phaseTitleHeader: string; // "Fase {n}: {name}"
    // Tasks tab
    filterAllTasks: string; filterTodo: string; filterTaskInProgress: string;
    filterDone: string;
    // Issues tab
    issuesTitle: string; registerIssue: string;
    filterAllIssues: string; filterOpenIssues: string; filterInProgressIssues: string;
    filterResolvedIssues: string; filterClosedIssues: string;
    reportedBy: string;
    resolutionLabel: string; // "✓ Solución:"
    actionResolve: string; actionUpdate: string; actionClose: string;
    noIssues: string; noIssuesFiltered: string;
    // Issue progress steps
    stepNotStarted: string; stepInProgress: string; stepResolved: string;
    stepClosed: string;
    // Activity
    activityTitle: string; noActivityData: string;
  };

  // Gantt chart
  gantt: {
    title: string; printExport: string;
    zoomWeek: string; zoomMonth: string; zoomQuarter: string; zoomAll: string;
    navPrev: string; navToday: string; navNext: string; showing: string;
    legendDone: string; legendOnTrack: string; legendAtRisk: string;
    legendOverdue: string; legendNotStarted: string; legendBlocked: string;
    legendMilestone: string;
    stageSearch: string; stageBuild: string; stagePrepare: string; stageLaunch: string;
    phaseCount: string;
    todayPill: string;
    openingIn: string; openingToday: string; openingOverdue: string;
    milestoneContract: string; milestoneOpening: string;
    tooltipDone: string; tooltipDelayed: string; tooltipEarly: string;
    tooltipDaysLeft: string; tooltipDueToday: string; tooltipOverdue: string;
    tooltipPlanned: string; tooltipActual: string; tooltipUntilToday: string;
    tooltipTasks: string; tooltipTasksDone: string; tooltipProgress: string;
    tooltipNotes: string; tooltipHint: string;
    pastBar: string; futureBar: string;
    fallbackWarn: string;
    // Status pills
    statusDone: string; statusOnTrack: string; statusAtRisk: string;
    statusOverdue: string; statusNotStarted: string; statusBlocked: string;
  };

  ganttModals: {
    // PhaseEditModal
    phaseStatus: string;
    plannedStart: string; plannedEnd: string;
    actualStart: string; actualEnd: string;
    cascadeLabel: string; cascadeDesc: string;
    cascadeForward: string; cascadeBackward: string;
    saveChanges: string; saving: string;
    // Pending cascade prompt
    pendingCascadeTitle: string;
    pendingCascadeAsk: string;
    dismiss: string; applyCascade: string; cascadedOk: string;
    // SaveBaselineModal
    saveBaselineTitle: string; saveBaselineDesc: string;
    baselineName: string; baselineNamePh: string;
    duplicateName: string; saveBaselineBtn: string; baselineSavedToast: string;
    baselineErrorToast: string;
    // Baseline toolbar
    baselineLabel: string; noCompare: string; saveBaselineNew: string;
    manageBaselines: string; comparing: string;
    baselineLimitFull: string;
    // ManageBaselines
    manageBaselinesTitle: string; baselinesSaved: string; snapshotsCount: string;
    deleteBaselineConfirm: string;
    // Tooltip
    baselineTooltip: string;
  };

  phaseNotes: {
    title: string; loading: string; emptyState: string; placeholder: string;
    add: string; edit: string; delete: string; saveEdit: string; cancelEdit: string;
    charLimit: string; deleteConfirm: string;
  };

  modal: {
    // CreateStore + EditStore
    createTitle: string; editTitle: string;
    storeName: string; storeNamePh: string;
    projectCode: string; projectCodePh: string;
    branch: string; selectBranch: string;
    bc: string; selectBC: string;
    address: string; addressPh: string;
    projectStartDate: string; projectStartHint: string;
    targetOpenAuto: string; targetOpenHintComputed: string;
    targetOpenHintLoading: string;
    budget: string; budgetPh: string;
    latitude: string; latPh: string;
    longitude: string; lngPh: string;
    notesField: string; notesPh: string;
    createBtn: string; creating: string;
    saveBtn: string; saving: string;
    openMaps: string;
    // Edit-specific
    editPM: string; editStatus: string;
    actualOpenDate: string;
    // Delete store
    deleteTitle: string; deleteWarning: string; deleteAbout: string;
    deleteListPhases: string; deleteListIssues: string; deleteListNotes: string;
    deleteListActivities: string; deleteListBaselines: string;
    typeToConfirm: string; deleteForever: string; deleting: string;
    // IssueModal
    issueRegisterTitle: string; issueTitleField: string; issueTitlePh: string;
    issueType: string; issueTypeIssue: string; issueTypeRisk: string; issueTypeBlocker: string;
    issueSeverity: string; issueDescField: string; issueDescPh: string;
    issueSubmitBtn: string; issueSubmitting: string;
    // ResolveIssueModal
    resolveTitle: string; resolveStatusLabel: string;
    resolveNotesLabel: string; resolveNotesPhResolved: string;
    resolveNotesPhInProgress: string; resolveSaveBtn: string;
    // EditIssueModal
    editIssueTitle: string; editIssueLevelLabel: string;
    confirmDelete: string;
    // TaskModal
    taskTitle: string; taskTitlePh: string;
    taskStatus: string; taskPriority: string; taskAssignee: string;
    taskDueDate: string; taskNotes: string; taskNotesPh: string;
  };
};
