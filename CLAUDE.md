# Telecom Store Manager — CLAUDE.md

> Tài liệu này dành cho AI agents (Claude, Gemini, Cursor...) làm việc trên dự án này.
> Đọc kỹ trước khi viết bất kỳ code nào.

---

## 🏗️ Kiến Trúc Dự Án

### Stack kỹ thuật
| Layer | Công nghệ | Phiên bản | Ghi chú |
|-------|-----------|-----------|---------|
| Framework | Next.js | 16.x | App Router, KHÔNG dùng Pages Router |
| Language | TypeScript | 5.x | Strict mode |
| Styling | Tailwind CSS | 4.x | + CSS variables trong `globals.css` |
| Database | SQLite | — | File `dev.db` ở project root |
| ORM | Prisma | **7.x** | ⚠️ Breaking changes so với Prisma 5/6 |
| Auth | NextAuth.js | **v5 beta** | ⚠️ API khác hoàn toàn v4 |
| Runtime | Node.js | 20.x | Tối thiểu |

### ⚠️ Các điểm BREAKING CHANGES quan trọng

#### Prisma 7
- **Datasource URL KHÔNG đặt trong `schema.prisma`** — đặt trong `prisma.config.ts`
- Dùng **Driver Adapter** thay vì connection trực tiếp: `PrismaBetterSqlite3`
- Import: `import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"`
- Khởi tạo: `new PrismaBetterSqlite3({ url: "file:./dev.db" })` — truyền `{url}` object, **không phải** Database instance
- `PrismaClient` nhận `{ adapter }` option

#### NextAuth v5
- Export từ `@/lib/auth.ts`: `{ handlers, auth, signIn, signOut }`
- Middleware phải dùng **Edge-safe config riêng** (`auth.config.ts`) vì middleware chạy Edge Runtime, không hỗ trợ Node.js `fs`
- `auth()` trong Server Components/API Routes dùng full config (có Prisma)
- Session callback lưu thêm `role` và `region` vào JWT token

#### Next.js 16 (App Router)
- Middleware dùng tên file `proxy.ts` (deprecated `middleware.ts`) — hiện tại vẫn dùng `middleware.ts` nhưng có warning
- `params` trong route handlers là **Promise**: `const { id } = await params`
- `serverExternalPackages` trong `next.config.ts` cần list Prisma packages

---

## 📁 Cấu Trúc Thư Mục

```
telecom-store-manager/
├── dev.db                          # SQLite database (KHÔNG commit)
├── prisma/
│   ├── schema.prisma               # Schema models (datasource KHÔNG có url)
│   ├── seed.js                     # Seed script (Node.js thuần, không TypeScript)
│   ├── migrations/                 # Auto-generated migrations
│   └── dev.db                      # ← KHÔNG dùng cái này, dùng root dev.db
├── prisma.config.ts                # Prisma 7 config: datasource url ở đây
├── src/
│   ├── middleware.ts               # Edge-safe auth middleware
│   ├── lib/
│   │   ├── auth.config.ts          # Edge-safe NextAuth config (KHÔNG import Prisma)
│   │   ├── auth.ts                 # Full NextAuth config (có Prisma, chỉ dùng server-side)
│   │   ├── db.ts                   # Prisma client singleton với BetterSqlite3 adapter
│   │   └── utils.ts                # Helpers: cn(), formatDate(), constants
│   ├── app/
│   │   ├── globals.css             # Design system: CSS variables, custom classes
│   │   ├── layout.tsx              # Root layout
│   │   ├── page.tsx                # Root redirect → /dashboard
│   │   ├── providers.tsx           # SessionProvider wrapper
│   │   ├── login/page.tsx          # Login page (client component)
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx          # Dashboard layout: auth guard + Sidebar
│   │   │   ├── dashboard/page.tsx  # Dashboard tổng quan
│   │   │   ├── stores/
│   │   │   │   ├── page.tsx        # Danh sách cửa hàng
│   │   │   │   └── [id]/page.tsx   # Chi tiết cửa hàng (11 phases, Gantt, Issues)
│   │   │   ├── reports/page.tsx    # Báo cáo tiến độ
│   │   │   └── users/page.tsx      # Quản lý user (Admin only)
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts
│   │       ├── dashboard/route.ts  # GET: aggregated stats
│   │       ├── stores/
│   │       │   ├── route.ts        # GET list, POST create
│   │       │   └── [id]/
│   │       │       ├── route.ts    # GET detail, PATCH update
│   │       │       └── issues/route.ts  # POST create issue
│   │       ├── tasks/[taskId]/route.ts  # PATCH update task
│   │       └── users/route.ts      # GET list, POST create
│   └── components/
│       ├── layout/Sidebar.tsx       # Navigation sidebar
│       └── stores/
│           ├── CreateStoreModal.tsx
│           ├── TaskModal.tsx
│           └── IssueModal.tsx
```

---

## 🗄️ Database Schema

### Models

```
User: id, name, email, password(bcrypt), role, region, avatar
  role: ADMIN | AREA_MANAGER | PM | SURVEY_STAFF

StoreProject: id, name, code(unique), address, region, targetOpenDate,
              actualOpenDate, status, progress(0-100), budget, notes, pmId
  status: PLANNING | IN_PROGRESS | COMPLETED | ON_HOLD | CANCELLED

Phase: id, phaseNumber(1-11), name, description, status, plannedStart,
       plannedEnd, actualStart, actualEnd, order, storeId
  status: NOT_STARTED | IN_PROGRESS | COMPLETED | BLOCKED

Task: id, title, description, status, priority, dueDate, completedAt,
      notes, phaseId, assigneeId
  status: TODO | IN_PROGRESS | DONE | BLOCKED
  priority: LOW | MEDIUM | HIGH | CRITICAL

Issue: id, title, description, type, severity, status, resolution,
       storeId, reporterId
  type: ISSUE | RISK | BLOCKER
  status: OPEN | RESOLVED | CLOSED

Activity: id, action, entity, entityId, details, userId, storeId
  (append-only audit log)
```

---

## 🔐 Phân Quyền (Role-Based Access)

| Quyền | ADMIN | AREA_MANAGER | PM | SURVEY_STAFF |
|-------|-------|-------------|-----|--------------|
| Xem tất cả stores | ✅ | ✅ (vùng) | ✅ (assigned) | ✅ (assigned) |
| Tạo store mới | ✅ | ✅ | ❌ | ❌ |
| Cập nhật task | ✅ | ✅ | ✅ | ✅ (GĐ 1-2) |
| Xem báo cáo | ✅ | ✅ | ✅ | ❌ |
| Quản lý user | ✅ | ❌ | ❌ | ❌ |

---

## 🔑 Tài Khoản Demo (mật khẩu: `123456`)

```
admin@telecom.vn      → ADMIN       (toàn quốc)
manager@telecom.vn    → AREA_MANAGER (Hồ Chí Minh)
pm@telecom.vn         → PM          (Hồ Chí Minh)
pm2@telecom.vn        → PM          (Hà Nội)
survey@telecom.vn     → SURVEY_STAFF (Hồ Chí Minh)
```

---

## 🎨 Design System

Tất cả styles dùng CSS variables và custom classes định nghĩa trong `globals.css`:

```css
/* Sử dụng */
className="glass"           /* Card background với backdrop blur */
className="glass-hover"     /* Hover effect */
className="gradient-btn"    /* Blue-purple gradient button */
className="gradient-text"   /* Blue-purple gradient text */
className="badge"           /* Status/role badge */
className="input"           /* Input/select field */
className="data-table"      /* Table styling */
className="progress-bar"    /* Progress bar container */
className="progress-bar-fill" /* Progress bar fill */
className="spinner"         /* Loading spinner */
className="modal-overlay"   /* Modal backdrop */
className="modal-content"   /* Modal box */
className="phase-step"      /* Phase list item */
className="stat-card"       /* Stats card */
className="nav-item"        /* Sidebar nav link */
className="activity-item"   /* Activity log row */
```

**Màu sắc chính** (CSS variables):
- `--accent-blue`: #3b82f6
- `--accent-purple`: #8b5cf6
- `--bg-primary`: #080c14 (nền tối)
- `--text-primary`: #f0f4ff
- `--text-secondary`: #8b9ab5

**Không dùng Tailwind utilities trực tiếp** — dùng CSS variables và custom classes để đồng nhất.

---

## 📡 API Routes

| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| GET | `/api/dashboard` | ✅ | Stats tổng quan, filtered by role |
| GET | `/api/stores` | ✅ | List stores, filtered by role |
| POST | `/api/stores` | ADMIN/AM | Tạo store mới (auto-create 11 phases) |
| GET | `/api/stores/[id]` | ✅ | Chi tiết store + phases + tasks + issues |
| PATCH | `/api/stores/[id]` | ✅ | Cập nhật store |
| POST | `/api/stores/[id]/issues` | ✅ | Tạo issue/risk |
| PATCH | `/api/tasks/[taskId]` | ✅ | Cập nhật task, auto-recalculate progress |
| GET | `/api/users` | ✅ | List users |
| POST | `/api/users` | ADMIN | Tạo user mới |

**Lưu ý quan trọng trong API routes:**
- Luôn `await params` trước khi destructure: `const { id } = await params`
- Dùng `auth()` từ `@/lib/auth` để lấy session
- Mọi route cần check `if (!session) return 401`

---

## ⚙️ Lệnh Thường Dùng

```bash
# Development
npm run dev               # Start dev server (http://localhost:3000)

# Database
npx prisma migrate dev    # Apply schema changes (tạo migration mới)
npx prisma generate       # Regenerate Prisma client sau khi đổi schema
node prisma/seed.js       # Seed demo data (xóa và tạo lại)
npx prisma studio         # GUI xem/edit database

# Build
npm run build             # Production build (check TypeScript errors)
npm run lint              # ESLint check
```

---

## 🔄 Real-time Strategy

Hiện tại dùng **polling** (không phải WebSocket):
- Dashboard: `setInterval(fetchDashboard, 30000)` — 30 giây
- Store detail: `setInterval(fetchStore, 30000)` — 30 giây

Khi task được update → API tự động recalculate `progress` của StoreProject và ghi Activity log.

---

## 🚨 Các Lỗi Phổ Biến & Cách Xử Lý

### 1. "Edge runtime does not support Node.js 'fs' module"
- **Nguyên nhân**: Middleware import Prisma (dùng better-sqlite3 — Node.js module)
- **Fix**: Middleware chỉ import từ `auth.config.ts`, KHÔNG import `auth.ts`

### 2. "The datasource property `url` is no longer supported in schema files"
- **Nguyên nhân**: Prisma 7 không cho phép `url` trong `schema.prisma`
- **Fix**: Đặt url trong `prisma.config.ts` → `datasource: { url: process.env.DATABASE_URL }`

### 3. "BetterSqlite3Adapter is not a constructor"
- **Nguyên nhân**: Export name đã đổi trong `@prisma/adapter-better-sqlite3`
- **Fix**: Dùng `PrismaBetterSqlite3` (không phải `BetterSqlite3Adapter`)
- **Fix**: Adapter nhận `{ url: "file:./dev.db" }` object, KHÔNG phải Database instance

### 4. "Cannot read properties of undefined (reading 'replace')"
- **Nguyên nhân**: Truyền Database instance vào PrismaBetterSqlite3 thay vì `{url}`
- **Fix**: `new PrismaBetterSqlite3({ url: "file:./dev.db" })`

### 5. Seed chạy nhưng bảng không tồn tại
- **Nguyên nhân**: Seed dùng DB file khác với migration
- **Fix**: Kiểm tra `DATABASE_URL` trong `.env` và path trong `seed.js` phải trỏ cùng file

### 6. Params không destructure được trong API route
- **Nguyên nhân**: Next.js 16 App Router `params` là Promise
- **Fix**: `const { id } = await params` (có `await`)
