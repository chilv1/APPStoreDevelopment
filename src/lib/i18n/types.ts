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

  // Branches & Business Centers page
  branchesPage: {
    title: string; subtitle: string; createBranch: string;
    statBranches: string; statBCs: string; statStores: string;
    emptyTitle: string; emptyHint: string;
    branchHeaderInfo: string; // "{n} BC · {stores} tiendas"
    addBC: string;
    emptyBC: string; emptyBCHint: string;
    bcStoresCount: string; // "🏬 {n} tiendas"
    branchModalCreate: string; branchModalEdit: string;
    branchName: string; branchNamePh: string;
    branchCode: string; branchCodePh: string;
    branchDescription: string; branchDescriptionPh: string;
    bcModalCreate: string; bcModalEdit: string;
    bcName: string; bcNamePh: string;
    bcCode: string; bcCodePh: string;
    bcAddress: string; bcAddressPh: string;
    bcDescription: string; bcDescriptionPh: string;
    branchSelect: string;
    saveBranchBtn: string; saveBCBtn: string;
    confirmDeleteBranch: string; confirmDeleteBC: string;
  };

  // Map page
  mapPage: {
    title: string; subtitle: string;
    loadingMap: string; loadingData: string;
    statTotal: string; statWithCoords: string; statNoCoords: string; statBranches: string;
    emptyStores: string;
    noCoordsTitle: string; noCoordsHint: string;
    filterLabel: string;
    filterAllStatus: string; filterAllBranch: string;
    showing: string; // "{n} / {total} ..."
    alertWithinRange: string; // "{m}m"
    viewDetail: string;
    legendNearbyAlert: string;
    thresholdLabel: string;
    alertNoneTitle: string; alertSomeTitle: string; // "{n} pares"
    alertNoneDesc: string;
    alertDistance: string; // "{m}m"
    missingCoordsTitle: string; // "{n} ..."
    updateAction: string;
  };

  // Reports page
  reportsPage: {
    title: string; subtitle: string;
    print: string;
    statTotalProjects: string; statCompletedPhases: string;
    statAvgProgress: string; statOpened: string;
    regionHeader: string; regionSummary: string;
    tableProjectCode: string; tableStoreName: string; tablePM: string;
    tableStatus: string; tableProgress: string; tableActivePhase: string;
    tableTargetOpen: string;
    notAssignedBranch: string;
    activePhaseFmt: string; // "Fase {n}: {name}"
    emptyProjects: string;
  };

  // Portfolio Gantt page
  portfolio: {
    title: string; subtitle: string;
    statTotal: string; statInProgress: string; statPlanning: string;
    statCompleted: string; statOnHold: string;
    filterLabel: string;
    filterAllStatus: string; filterAllBranch: string;
    sortLabel: string;
    sortDeadline: string; sortProgress: string; sortName: string; sortStatus: string;
    showing: string;
    legendDone: string; legendInProgress: string; legendOverdue: string;
    legendNotStarted: string; legendOpening: string;
    emptyFilter: string;
    storePMNone: string;
    phaseCount: string; // "{done}/11 GĐ"
    openingTooltip: string;
    todayPill: string;
  };

  // Users page
  usersPage: {
    title: string; subtitle: string;
    addUser: string;
    tableName: string; tableEmail: string; tableRole: string;
    tableBranch: string; tableActions: string;
    actionEdit: string; actionDelete: string;
    branchSystem: string;
    branchNone: string;
    branchNoneOption: string;
    createTitle: string; editTitle: string;
    fieldName: string; fieldNamePh: string;
    fieldEmail: string; fieldEmailPh: string;
    fieldRole: string; fieldBranch: string;
    fieldPwdNew: string; fieldPwdNewPh: string;
    fieldPwdDefault: string; fieldPwdDefaultPh: string;
    createBtn: string; editBtn: string;
    creating: string; editing: string;
    errorCreate: string; errorEdit: string;
    deleteConfirmTitle: string; deleteConfirmDesc: string;
    deleteBtn: string; deletingBtn: string;
    adminOnly: string;
  };

  // Phase Templates admin page
  phaseTemplatesPage: {
    title: string; subtitle: string;
    statTotalDays: string; statTotalDaysHint: string;
    statPhases: string; statTotalTasks: string;
    tableNo: string; tablePhaseName: string; tableDuration: string;
    tableDescription: string; tableTasks: string;
    tasksLabel: string;
    taskHeaderTitle: string;
    addTask: string;
    phaseDescPh: string;
    savedAt: string; dirty: string;
    savingBtn: string; saveBtn: string;
    adminOnly: string;
  };
};
