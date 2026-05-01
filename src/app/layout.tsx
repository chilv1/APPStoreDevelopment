import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Telecom Store Manager — Quản Lý Mở Cửa Hàng Viễn Thông",
  description: "Hệ thống quản lý tiến độ mở cửa hàng viễn thông: theo dõi 11 giai đoạn, đa người dùng, real-time",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
