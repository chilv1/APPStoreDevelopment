# Telecom Store Manager

> Hệ thống quản lý tiến độ mở cửa hàng viễn thông — đa người dùng, phân quyền, real-time.

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![Prisma](https://img.shields.io/badge/Prisma-7-blue)
![NextAuth](https://img.shields.io/badge/NextAuth-v5-green)
![SQLite](https://img.shields.io/badge/SQLite-local-orange)

---

## 📋 Tính năng

- 🏪 **Đa dự án**: Quản lý nhiều cửa hàng cùng lúc, lọc theo vùng/trạng thái
- 👥 **4 vai trò phân quyền**: Admin, Quản lý vùng, PM dự án, NV Khảo sát
- 📋 **11 giai đoạn chuẩn**: Từ tìm kiếm mặt bằng đến khai trương chính thức
- ✅ **Task tracking**: Cập nhật tiến độ từng task, assign người phụ trách
- 📅 **Gantt Chart**: Biểu đồ timeline trực quan 11 giai đoạn
- ⚠️ **Issues & Risks**: Ghi nhận vướng mắc, theo dõi giải pháp
- 📊 **Dashboard**: Tổng quan tiến độ, cảnh báo trễ hạn, activity feed
- 📈 **Báo cáo**: Tiến độ theo vùng, in PDF
- 🔄 **Auto-refresh**: Cập nhật dữ liệu tự động mỗi 30 giây

---

## 🚀 Cài đặt nhanh (máy mới)

### Yêu cầu
- Node.js >= 20
- npm >= 10

### Các bước

```bash
# 1. Clone / copy dự án vào máy mới

# 2. Cài dependencies
npm install

# 3. Tạo file .env (copy từ .env.example hoặc tạo mới)
cp .env.example .env
# Hoặc tạo file .env với nội dung:
# DATABASE_URL="file:./dev.db"
# NEXTAUTH_SECRET="your-secret-key-change-this"
# NEXTAUTH_URL="http://localhost:3000"

# 4. Khởi tạo database
npx prisma migrate dev

# 5. Seed dữ liệu demo
node prisma/seed.js

# 6. Chạy app
npm run dev
```

Mở trình duyệt tại: **http://localhost:3000**

---

## 🔑 Tài khoản demo

| Vai trò | Email | Mật khẩu |
|---------|-------|----------|
| Admin | `admin@telecom.vn` | `123456` |
| Quản lý vùng | `manager@telecom.vn` | `123456` |
| PM dự án | `pm@telecom.vn` | `123456` |
| NV Khảo sát | `survey@telecom.vn` | `123456` |

---

## 📁 Cấu trúc dự án

```
telecom-store-manager/
├── CLAUDE.md               # Hướng dẫn cho AI agents
├── README.md               # File này
├── docs/
│   └── PROCESS.md          # Quy trình 11 giai đoạn chi tiết
├── .env.example            # Template biến môi trường
├── prisma/
│   ├── schema.prisma       # Database schema
│   └── seed.js             # Demo data seed script
├── prisma.config.ts        # Prisma 7 config (datasource url)
├── src/
│   ├── lib/
│   │   ├── auth.ts         # NextAuth full config
│   │   ├── auth.config.ts  # NextAuth edge-safe config (middleware)
│   │   ├── db.ts           # Prisma client singleton
│   │   └── utils.ts        # Utilities, constants, labels
│   ├── app/
│   │   ├── (dashboard)/    # Protected routes
│   │   └── api/            # API routes
│   └── components/
│       ├── layout/         # Sidebar, Navbar
│       └── stores/         # Store-specific modals
└── dev.db                  # SQLite database (local only)
```

---

## ⚙️ Lệnh thường dùng

```bash
npm run dev              # Dev server
npm run build            # Production build
npx prisma migrate dev   # Áp dụng schema changes
npx prisma generate      # Regenerate Prisma client
node prisma/seed.js      # Reset & seed demo data
npx prisma studio        # GUI quản lý database
```

---

## 🏗️ Tech Stack

| Thành phần | Công nghệ |
|------------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 + Custom CSS |
| Database | SQLite (file local) |
| ORM | Prisma 7 + better-sqlite3 adapter |
| Auth | NextAuth.js v5 (credentials + JWT) |
| Icons | Lucide React |
| Charts | Chart.js (ready to integrate) |

---

## 📖 Tài liệu thêm

- [Quy trình 11 giai đoạn mở cửa hàng](./docs/PROCESS.md)
- [Hướng dẫn cho AI agents](./CLAUDE.md)
- [Prisma 7 docs](https://pris.ly/d/prisma7)
- [NextAuth v5 docs](https://authjs.dev)

---

## 🌏 Deploy lên production

Khi deploy, cần:
1. Đổi `NEXTAUTH_SECRET` thành key mạnh
2. Đổi `NEXTAUTH_URL` thành domain thực
3. Đổi DB từ SQLite sang PostgreSQL (chỉ cần đổi `prisma.config.ts` và cài adapter tương ứng)
4. Chạy `npm run build` để kiểm tra lỗi TypeScript trước khi deploy
