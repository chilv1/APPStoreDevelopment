import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import dictEs from "@/lib/i18n/dict-es";
import dictVi from "@/lib/i18n/dict-vi";
import type { Locale } from "@/lib/i18n/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Locale-aware formatters. App uses PEN (Soles) currency exclusively.
// Pass intlCode like "es-PE" or "vi-VN" — defaults to es-PE.

export function formatDate(date: Date | string | null | undefined, intlCode: string = "es-PE"): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString(intlCode, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// PEN (Soles): Peru convention "S/ 1.234.567" — period thousand separator.
// Uses Intl.NumberFormat with 'es-PE' for proper grouping regardless of UI locale.
export function formatCurrency(amount: number | null | undefined, _intlCode?: string): string {
  if (amount == null) return "—";
  const formatted = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 0 }).format(amount);
  return `S/ ${formatted}`;
}

// Short form: "S/ 1,2M" or "S/ 850K"
export function formatCurrencyShort(amount: number | null | undefined): string {
  if (amount == null) return "—";
  if (Math.abs(amount) >= 1_000_000_000) return `S/ ${(amount / 1_000_000_000).toFixed(1).replace(".", ",")}B`;
  if (Math.abs(amount) >= 1_000_000)     return `S/ ${(amount / 1_000_000).toFixed(1).replace(".", ",")}M`;
  if (Math.abs(amount) >= 1_000)         return `S/ ${(amount / 1_000).toFixed(0)}K`;
  return `S/ ${amount}`;
}

// ===========================
// Locale-aware label helpers
// ===========================
// Use these in components where possible: they read from i18n dicts.
// Legacy ROLE_LABELS / STATUS_LABELS / PRIORITY_LABELS constants below remain
// as Vietnamese fallback for files not yet refactored.

const _dict = { es: dictEs, vi: dictVi } as const;

export function getRoleLabel(role: string, locale: Locale = "es"): string {
  const d = _dict[locale]?.role;
  switch (role) {
    case "ADMIN":        return d?.admin       ?? role;
    case "AREA_MANAGER": return d?.areaManager ?? role;
    case "PM":           return d?.pm          ?? role;
    case "SURVEY_STAFF": return d?.surveyStaff ?? role;
    default:             return role;
  }
}

export function getStatusLabel(status: string, locale: Locale = "es"): string {
  const d = _dict[locale]?.status;
  switch (status) {
    case "PLANNING":    return d?.planning    ?? status;
    case "IN_PROGRESS": return d?.inProgress  ?? status;
    case "COMPLETED":   return d?.completed   ?? status;
    case "DONE":        return d?.done        ?? status;
    case "ON_HOLD":     return d?.onHold      ?? status;
    case "CANCELLED":   return d?.cancelled   ?? status;
    case "NOT_STARTED": return d?.notStarted  ?? status;
    case "BLOCKED":     return d?.blocked     ?? status;
    case "TODO":        return d?.todo        ?? status;
    case "OPEN":        return d?.open        ?? status;
    case "RESOLVED":    return d?.resolved    ?? status;
    case "CLOSED":      return d?.closed      ?? status;
    default:            return status;
  }
}

export function getPriorityLabel(priority: string, locale: Locale = "es"): string {
  const d = _dict[locale]?.priority;
  switch (priority) {
    case "LOW":      return d?.low      ?? priority;
    case "MEDIUM":   return d?.medium   ?? priority;
    case "HIGH":     return d?.high     ?? priority;
    case "CRITICAL": return d?.critical ?? priority;
    default:         return priority;
  }
}

// Legacy constants — Vietnamese fallback for files not yet i18n'd.
export const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  AREA_MANAGER: "Quản lý chi nhánh",
  PM: "PM dự án",
  SURVEY_STAFF: "NV Khảo sát",
};

export const ROLE_COLORS: Record<string, string> = {
  ADMIN: "bg-red-500/20 text-red-300 border-red-500/30",
  AREA_MANAGER: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  PM: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  SURVEY_STAFF: "bg-green-500/20 text-green-300 border-green-500/30",
};

export const STATUS_LABELS: Record<string, string> = {
  PLANNING: "Lên kế hoạch",
  IN_PROGRESS: "Đang thực hiện",
  COMPLETED: "Hoàn thành",
  ON_HOLD: "Tạm dừng",
  CANCELLED: "Đã hủy",
  NOT_STARTED: "Chưa bắt đầu",
  BLOCKED: "Vướng mắc",
  TODO: "Chưa làm",
  DONE: "Hoàn thành",
};

export const STATUS_COLORS: Record<string, string> = {
  PLANNING: "bg-gray-500/20 text-gray-300 border-gray-500/30",
  IN_PROGRESS: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  COMPLETED: "bg-green-500/20 text-green-300 border-green-500/30",
  DONE: "bg-green-500/20 text-green-300 border-green-500/30",
  ON_HOLD: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  CANCELLED: "bg-red-500/20 text-red-300 border-red-500/30",
  NOT_STARTED: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  BLOCKED: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  TODO: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  OPEN: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  RESOLVED: "bg-green-500/20 text-green-300 border-green-500/30",
  CLOSED: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

export const PRIORITY_LABELS: Record<string, string> = {
  LOW: "Thấp",
  MEDIUM: "Trung bình",
  HIGH: "Cao",
  CRITICAL: "Khẩn cấp",
};

export const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-gray-500/20 text-gray-400",
  MEDIUM: "bg-blue-500/20 text-blue-300",
  HIGH: "bg-orange-500/20 text-orange-300",
  CRITICAL: "bg-red-500/20 text-red-300",
};

export const PHASE_ICONS: Record<number, string> = {
  1: "🔍",
  2: "📋",
  3: "🤝",
  4: "📝",
  5: "🏗️",
  6: "🔨",
  7: "💻",
  8: "👥",
  9: "📚",
  10: "🎯",
  11: "🎉",
};
