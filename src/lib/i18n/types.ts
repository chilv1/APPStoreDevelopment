// i18n types — Spanish (Peru) is primary, Vietnamese is UI translation only
export type Locale = "es" | "vi";

export const SUPPORTED_LOCALES: Locale[] = ["es", "vi"];
export const DEFAULT_LOCALE: Locale = "es";

// Locale display info for switcher
export const LOCALE_INFO: Record<Locale, { flag: string; name: string; short: string; intlCode: string }> = {
  es: { flag: "🇵🇪", name: "Español (Perú)", short: "ES", intlCode: "es-PE" },
  vi: { flag: "🇻🇳", name: "Tiếng Việt",      short: "VI", intlCode: "vi-VN" },
};

// Dict structure — every locale must implement this same shape
export type Dict = {
  // Sidebar / Navigation
  sidebar: {
    overview:        string;
    stores:          string;
    portfolioGantt:  string;
    branches:        string;
    map:             string;
    reports:         string;
    users:           string;
    phaseTemplates:  string;
    logout:          string;
    mainMenu:        string;
    admin:           string;
  };
  common: {
    save:    string;
    cancel:  string;
    delete:  string;
    edit:    string;
    create:  string;
    confirm: string;
    loading: string;
    loadingData: string;       // "Đang tải dữ liệu..."
    search:  string;
    filter:  string;
    sortBy:  string;
    all:     string;
    yes:     string;
    no:      string;
    close:   string;
    back:    string;
    next:    string;
    today:   string;
    add:     string;
    remove:  string;
    update:  string;
    note:    string;
    notes:   string;
    description: string;
    name:    string;
    code:    string;
    seeAll:  string;
    noData:  string;           // "Chưa có dữ liệu"
    notAssigned: string;       // "Chưa gán"
    results: string;           // "kết quả"
    notFound: string;          // "Không tìm thấy"
  };
  status: {
    planning:   string;
    inProgress: string;
    completed:  string;
    onHold:     string;
    cancelled:  string;
    notStarted: string;
    blocked:    string;
    todo:       string;
    done:       string;
    open:       string;
    resolved:   string;
    closed:     string;
  };
  priority: {
    low:      string;
    medium:   string;
    high:     string;
    critical: string;
  };
  role: {
    admin:        string;
    areaManager:  string;
    pm:           string;
    surveyStaff:  string;
  };

  // Login page
  login: {
    appTitle:      string;
    tagline:       string;
    title:         string;
    email:         string;
    password:      string;
    submit:        string;
    submitting:    string;
    error:         string;       // "Email hoặc mật khẩu không đúng"
    demoTitle:     string;       // "Tài khoản demo (mật khẩu: 123456)"
  };

  // Dashboard
  dashboard: {
    title:         string;       // "Tổng Quan Hệ Thống"
    subtitle:      string;       // "Theo dõi tiến độ mở cửa hàng viễn thông toàn quốc"
    overdueAlertTitle:    string; // "Cảnh báo trễ tiến độ"
    overdueStores:        string; // "{n} cửa hàng trễ deadline khai trương"
    overdueTasks:         string; // "{n} task quá hạn"
    statTotal:            string; // "Tổng cửa hàng"
    statInProgress:       string; // "Đang thực hiện"
    statCompleted:        string; // "Đã khai trương"
    statOnHold:           string; // "Tạm dừng"
    statAvgProgress:      string; // "Tiến độ TB"
    storeListTitle:       string; // "🏪 Danh sách cửa hàng"
    activityFeedTitle:    string; // "🕐 Hoạt động gần đây"
    statusBreakdownTitle: string; // "Phân bố trạng thái"
    branchProgressTitle:  string; // "🏢 Tiến độ theo chi nhánh"
    noActivity:           string; // "Chưa có hoạt động"
    tableStore:           string;
    tableBranch:          string;
    tableStatus:          string;
    tableProgress:        string;
    tableTargetOpen:      string;
    branchAvg:            string; // "{n} cửa hàng · TB {p}%"
  };

  // Stores list
  storesList: {
    title:        string;       // "🏪 Cửa Hàng"
    subtitle:     string;       // "Quản lý {n} dự án mở cửa hàng"
    createButton: string;       // "+ Tạo cửa hàng mới"
    searchPlaceholder: string;  // "🔍 Tìm kiếm tên, mã cửa hàng..."
    filterAllBranch: string;    // "Tất cả chi nhánh"
    filterAllStatus: string;    // "Tất cả trạng thái"
    progressLabel:   string;    // "Tiến độ: {done}/11 giai đoạn"
    activePhase:     string;    // "▶ Đang: GĐ {n} — {name}"
    issuesCount:     string;    // "⚠️ {n} vướng mắc"
    targetOpen:      string;    // "🎯 KH khai trương: {date}"
    notAssignedPM:   string;    // "Chưa gán PM"
    emptyResult:     string;    // "Không tìm thấy cửa hàng nào"
    phaseAbbrev:     string;    // "GĐ" → "F." (Spanish abbreviation)
  };
};
