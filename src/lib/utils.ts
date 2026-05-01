import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatCurrency(amount: number | null | undefined): string {
  if (!amount) return "—";
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)} tỷ`;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(0)} triệu`;
  return amount.toLocaleString("vi-VN") + " đ";
}

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
