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
  };
  status: {
    // StoreProject status
    planning:   string;
    inProgress: string;
    completed:  string;
    onHold:     string;
    cancelled:  string;
    // Phase status
    notStarted: string;
    blocked:    string;
    // Task status
    todo:       string;
    done:       string;
    // Issue status
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
};
